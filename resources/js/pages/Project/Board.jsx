import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, usePage } from "@inertiajs/react";
import { LayoutGrid, Share2, Sliders } from "lucide-react";
import ColumnView from "@/components/kanban/ColumnView";
import axios from "axios";
import TaskModal from "@/components/kanban/TaskModal";
import FlowView from "@/components/flow/FlowView";
import ProjectHeader from "@/components/project/ProjectHeader";
import {
    pruneDependencyReferences,
    removeTaskAndPruneDependencies,
} from "@/utils/taskDependencies";

const sortTasks = (items) =>
    [...items].sort((a, b) => {
        if (a.status === b.status) {
            return a.position - b.position;
        }

        return a.id - b.id;
    });

const moveTask = (items, taskId, nextStatus, nextIndex) => {
    const movingId = Number(taskId);
    const currentTasks = items.map((task) => ({ ...task }));
    const movingTask = currentTasks.find((task) => task.id === movingId);

    if (!movingTask) {
        return currentTasks;
    }

    const sourceStatus = movingTask.status;
    const sourceTasks = currentTasks
        .filter((task) => task.status === sourceStatus && task.id !== movingId)
        .sort((a, b) => a.position - b.position);
    const destinationTasks = (
        sourceStatus === nextStatus
            ? sourceTasks
            : currentTasks.filter(
                  (task) => task.status === nextStatus && task.id !== movingId,
              )
    ).sort((a, b) => a.position - b.position);

    destinationTasks.splice(nextIndex, 0, {
        ...movingTask,
        status: nextStatus,
    });

    const replacements = new Map();

    sourceTasks.forEach((task, index) => {
        replacements.set(task.id, {
            ...task,
            position: index,
        });
    });
    destinationTasks.forEach((task, index) => {
        replacements.set(task.id, {
            ...task,
            position: index,
        });
    });

    return sortTasks(
        currentTasks.map((task) => replacements.get(task.id) ?? task),
    );
};

export default function Board({ workspace, project, members = [] }) {
    const { auth } = usePage().props;
    const currentUserId = auth?.user?.id;
    const [view, setView] = useState("columns");
    const [density, setDensity] = useState("informed");
    const [tasks, setTasks] = useState(sortTasks(project.tasks || []));
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recentTaskIds, setRecentTaskIds] = useState([]);
    const [deletingTaskIds, setDeletingTaskIds] = useState([]);

    useEffect(() => {
        setTasks(sortTasks(project.tasks || []));
    }, [project.tasks]);

    const flashTask = useCallback((taskId) => {
        setRecentTaskIds((prev) =>
            prev.includes(taskId) ? prev : [...prev, taskId],
        );

        window.setTimeout(() => {
            setRecentTaskIds((prev) => prev.filter((id) => id !== taskId));
        }, 320);
    }, []);

    const selectedTask = useMemo(
        () => tasks.find((task) => task.id === selectedTaskId) || null,
        [selectedTaskId, tasks],
    );

    const handleTaskClick = useCallback((taskId) => {
        setSelectedTaskId(taskId);
        setIsModalOpen(true);
    }, []);

    const handleTaskMove = useCallback((taskId, status, position) => {
        flashTask(Number(taskId));
        setTasks((currentTasks) =>
            moveTask(currentTasks, taskId, status, position),
        );
    }, [flashTask]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedTaskId(null);
    }, []);

    const [locks, setLocks] = useState({}); // { taskId: userId }
    const [presenceMembers, setPresenceMembers] = useState([]);
    const lastActivityRef = useRef(Date.now());

    useEffect(() => {
        if (!isModalOpen) return;

        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastActivityRef.current > 5 * 60 * 1000) {
                // 5 minutes
                console.log("Inactivity timeout - Closing modal");
                closeModal();
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [isModalOpen, closeModal]);

    // Track activity
    useEffect(() => {
        const handleInteraction = () => {
            lastActivityRef.current = Date.now();
        };
        window.addEventListener("mousemove", handleInteraction);
        window.addEventListener("keydown", handleInteraction);
        return () => {
            window.removeEventListener("mousemove", handleInteraction);
            window.removeEventListener("keydown", handleInteraction);
        };
    }, []);

    // --- REAL-TIME LISTENERS ---
    useEffect(() => {
        const channel = window.Echo.join(`project.${project.id}`);

        channel
            .here((users) => {
                setPresenceMembers(users);
            })
            .joining((user) => {
                setPresenceMembers((prev) => [...prev, user]);
            })
            .leaving((user) => {
                setPresenceMembers((prev) =>
                    prev.filter((u) => u.id !== user.id),
                );
                // Automatically release any locks held by the user who left
                setLocks((prev) => {
                    const next = { ...prev };
                    Object.keys(next).forEach((taskId) => {
                        if (next[taskId] === user.id) {
                            delete next[taskId];
                        }
                    });
                    return next;
                });
            })
            .error((error) => {
                console.error("Presence channel error:", error);
            })
            .listen(".TaskUpdated", (e) => {
                handleTaskUpdated(e.task.id, e.task);
            })
            .listen(".TaskDeleted", (e) => {
                handleTaskDeleted(e.taskId);
            })
            .listen(".CommentPosted", (e) => {
                // We find the task and add the comment to its array (with deduplication)
                setTasks((currentTasks) =>
                    currentTasks.map((task) => {
                        if (Number(task.id) === Number(e.comment.task_id)) {
                            // Deduplicate: check if comment already exists in this task
                            const exists = (task.comments || []).some(
                                (c) => Number(c.id) === Number(e.comment.id),
                            );
                            if (exists) return task;

                            return {
                                ...task,
                                comments: [...(task.comments || []), e.comment],
                            };
                        }
                        return task;
                    }),
                );
            })
            .listen(".TaskLocked", (e) => {
                if (e.userId === currentUserId) {
                    return;
                }
                setLocks((prev) => ({ ...prev, [e.taskId]: e.userId }));
            })
            .listen(".TaskUnlocked", (e) => {
                setLocks((prev) => {
                    const next = { ...prev };
                    delete next[e.taskId];
                    return next;
                });
            });

        return () => {
            channel.stopListening(".TaskUpdated");
            channel.stopListening(".TaskDeleted");
            channel.stopListening(".CommentPosted");
            channel.stopListening(".TaskLocked");
            channel.stopListening(".TaskUnlocked");
            window.Echo.leave(`project.${project.id}`);
        };
    }, [project.id, currentUserId]);

    const handleTaskUpdated = useCallback((taskId, changes) => {
        flashTask(taskId);
        setTasks((currentTasks) => {
            const exists = currentTasks.find((t) => t.id === taskId);

            if (!exists) {
                // If the task doesn't exist, it's a new one from broadcast
                return sortTasks([...currentTasks, changes]);
            }

            return sortTasks(
                currentTasks.map((task) =>
                    task.id === taskId
                        ? {
                              ...task,
                              ...changes,
                          }
                        : task,
                ),
            );
        });
    }, [flashTask]);

    const handleTaskDeleted = useCallback(
        (taskId, { instant = false } = {}) => {
            const normalizedId = Number(taskId);

            const removeFromBoard = (currentTasks) =>
                sortTasks(
                    removeTaskAndPruneDependencies(
                        pruneDependencyReferences(
                            currentTasks,
                            normalizedId,
                        ),
                        normalizedId,
                    ),
                );

            if (instant) {
                setTasks(removeFromBoard);
                setDeletingTaskIds((prev) =>
                    prev.filter((id) => id !== normalizedId),
                );

                if (selectedTaskId === normalizedId) {
                    setIsModalOpen(false);
                    setSelectedTaskId(null);
                }
                return;
            }

            setTasks((currentTasks) =>
                sortTasks(
                    pruneDependencyReferences(currentTasks, normalizedId),
                ),
            );

            setDeletingTaskIds((prev) =>
                prev.includes(normalizedId) ? prev : [...prev, normalizedId],
            );

            window.setTimeout(() => {
                setTasks(removeFromBoard);
                setDeletingTaskIds((prev) =>
                    prev.filter((id) => id !== normalizedId),
                );

                if (selectedTaskId === normalizedId) {
                    setIsModalOpen(false);
                    setSelectedTaskId(null);
                }
            }, 180);
        },
        [selectedTaskId],
    );

    const deleteTask = useCallback(
        async (taskId, { instant = false } = {}) => {
            const normalizedId = Number(taskId);

            if (instant) {
                handleTaskDeleted(normalizedId, { instant: true });
            }

            try {
                await axios.delete(
                    `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${normalizedId}`,
                    {
                        headers: {
                            Accept: "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                        },
                    }
                );

                if (!instant) {
                    handleTaskDeleted(normalizedId);
                }
            } catch (error) {
                console.error("Failed to delete task", error);
            }
        },
        [handleTaskDeleted, project.slug, workspace.slug],
    );

    return (
        <div className="flex min-h-[70vh] h-full flex-col space-y-4 sm:min-h-[75vh] sm:space-y-6 lg:min-h-0">
            <Head title={`${project.name} - Board`} />

            <ProjectHeader workspace={workspace} project={project} activeTab="board" />

            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
                <div className="flex flex-wrap items-center gap-3 rounded-2xl p-1.5"
                    style={{ background: "rgba(139,94,60,0.08)", border: "1px solid rgba(139,94,60,0.18)" }}>
                    <div className="flex flex-1 items-center rounded-xl p-1 lg:flex-none"
                        style={{ background: "rgba(139,94,60,0.04)" }}>
                        <button
                            onClick={() => setView("columns")}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all"
                            style={{
                                background: view === "columns" ? "#8b5e3c" : "transparent",
                                color: view === "columns" ? "#f3e4c9" : "rgba(10,41,71,0.45)",
                                boxShadow: view === "columns" ? "0 2px 8px rgba(139,94,60,0.25)" : "none"
                            }}
                        >
                            <LayoutGrid size={14} strokeWidth={3} />
                            Columns
                        </button>
                        <button
                            onClick={() => setView("flow")}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all"
                            style={{
                                background: view === "flow" ? "#8b5e3c" : "transparent",
                                color: view === "flow" ? "#f3e4c9" : "rgba(10,41,71,0.45)",
                                boxShadow: view === "flow" ? "0 2px 8px rgba(139,94,60,0.25)" : "none"
                            }}
                        >
                            <Share2 size={14} strokeWidth={3} />
                            Flow
                        </button>
                    </div>

                    <div className="mx-1 hidden h-6 w-px sm:block" style={{ background: "rgba(139,94,60,0.18)" }} />

                    <button
                        onClick={() =>
                            setDensity(
                                density === "minimal" ? "informed" : "minimal",
                            )
                        }
                        className="rounded-xl border p-2 transition-all hover:scale-110"
                        style={{
                            borderColor: density === "informed" ? "#8b5e3c" : "rgba(139,94,60,0.25)",
                            background: density === "informed" ? "rgba(139,94,60,0.1)" : "transparent",
                            color: density === "informed" ? "#8b5e3c" : "rgba(10,41,71,0.45)"
                        }}
                        title="Toggle Card Density"
                    >
                        <Sliders size={18} />
                    </button>
                </div>
            </header>

            <div className="relative min-h-[60vh] flex-1 overflow-hidden rounded-[28px] border-2 shadow-inner sm:min-h-[65vh] sm:rounded-[40px] lg:min-h-0"
                style={{ background: "rgba(139,94,60,0.03)", borderColor: "rgba(139,94,60,0.15)" }}>
                {view === "columns" ? (
                    <ColumnView
                        workspace={workspace}
                        project={project}
                        tasks={tasks}
                        onTaskClick={handleTaskClick}
                        onTaskMove={handleTaskMove}
                        onTaskUpdated={handleTaskUpdated}
                        onTaskDelete={deleteTask}
                        density={density}
                        locks={locks}
                        presenceMembers={presenceMembers}
                        recentTaskIds={recentTaskIds}
                        deletingTaskIds={deletingTaskIds}
                    />
                ) : (
                    <FlowView
                        workspace={workspace}
                        project={project}
                        tasks={tasks}
                        onTaskClick={handleTaskClick}
                        onTaskUpdated={handleTaskUpdated}
                        onTaskDelete={deleteTask}
                        locks={locks}
                        presenceMembers={presenceMembers}
                        recentTaskIds={recentTaskIds}
                        deletingTaskIds={deletingTaskIds}
                        density={density}
                    />
                )}
            </div>

            <TaskModal
                workspace={workspace}
                project={project}
                task={selectedTask}
                tasks={tasks}
                members={members}
                isOpen={isModalOpen}
                onClose={closeModal}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
                onTaskDelete={deleteTask}
                auth={auth}
            />
        </div>
    );
}

Board.layout = (page) => <WorkspaceLayout children={page} />;
