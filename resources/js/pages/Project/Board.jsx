import { useEffect, useMemo, useState } from "react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, usePage } from "@inertiajs/react";
import { LayoutGrid, Share2, Sliders } from "lucide-react";
import ColumnView from "@/components/kanban/ColumnView";
import TaskSlideOver from "@/components/kanban/TaskSlideOver";
import FlowView from "@/components/flow/FlowView";

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
    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
    const [recentTaskIds, setRecentTaskIds] = useState([]);
    const [deletingTaskIds, setDeletingTaskIds] = useState([]);

    useEffect(() => {
        setTasks(sortTasks(project.tasks || []));
    }, [project.tasks]);

    const flashTask = (taskId) => {
        setRecentTaskIds((prev) =>
            prev.includes(taskId) ? prev : [...prev, taskId],
        );

        window.setTimeout(() => {
            setRecentTaskIds((prev) => prev.filter((id) => id !== taskId));
        }, 320);
    };

    const selectedTask = useMemo(
        () => tasks.find((task) => task.id === selectedTaskId) || null,
        [selectedTaskId, tasks],
    );

    const handleTaskClick = (taskId) => {
        if (locks[taskId] && locks[taskId] !== currentUserId) return;

        setSelectedTaskId(taskId);
        setIsSlideOverOpen(true);

        // Lock the task for us
        axios.post(
            `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${taskId}/lock`,
        );
    };

    const handleTaskMove = (taskId, status, position) => {
        flashTask(Number(taskId));
        setTasks((currentTasks) =>
            moveTask(currentTasks, taskId, status, position),
        );
    };

    const [locks, setLocks] = useState({}); // { taskId: userId }
    const [presenceMembers, setPresenceMembers] = useState([]);
    const [lastActivity, setLastActivity] = useState(Date.now());

    // --- HEARTBEAT / INACTIVITY CHECK ---
    useEffect(() => {
        if (!isSlideOverOpen) return;

        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastActivity > 5 * 60 * 1000) { // 5 minutes
                console.log("Inactivity timeout - Unlocking task");
                closeSlideOver();
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [isSlideOverOpen, lastActivity]);

    // Track activity
    useEffect(() => {
        const handleInteraction = () => setLastActivity(Date.now());
        window.addEventListener('mousemove', handleInteraction);
        window.addEventListener('keydown', handleInteraction);
        return () => {
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        };
    }, []);

    // --- REAL-TIME LISTENERS ---
    useEffect(() => {
        console.log("Joining presence channel", `project.${project.id}`);
        const channel = window.Echo.join(`project.${project.id}`);

        channel
            .here((users) => {
                console.log("Presence here:", users);
                setPresenceMembers(users);
            })
            .joining((user) => {
                console.log("Presence joining:", user);
                setPresenceMembers((prev) => [...prev, user]);
            })
            .leaving((user) => {
                console.log("Presence leaving:", user);
                setPresenceMembers((prev) => prev.filter((u) => u.id !== user.id));
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
                console.log("Real-time Update:", e.task);
                handleTaskUpdated(e.task.id, e.task);
            })
            .listen(".TaskDeleted", (e) => {
                console.log("Real-time Deletion:", e.taskId);
                handleTaskDeleted(e.taskId);
            })
            .listen(".CommentPosted", (e) => {
                console.log("Real-time Comment:", e.comment);
                // We find the task and add the comment to its array
                setTasks((currentTasks) =>
                    currentTasks.map((task) =>
                        task.id === e.comment.task_id
                            ? {
                                  ...task,
                                  comments: [
                                      ...(task.comments || []),
                                      e.comment,
                                  ],
                              }
                            : task,
                    ),
                );
            })
            .listen(".TaskLocked", (e) => {
                if (e.userId === currentUserId) {
                    return;
                }
                console.log("Task Locked:", e.taskId, "by", e.userId);
                setLocks((prev) => ({ ...prev, [e.taskId]: e.userId }));
            })
            .listen(".TaskUnlocked", (e) => {
                console.log("Task Unlocked:", e.taskId);
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

    const handleTaskUpdated = (taskId, changes) => {
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
    };

    const handleTaskDeleted = (taskId) => {
        setDeletingTaskIds((prev) =>
            prev.includes(taskId) ? prev : [...prev, taskId],
        );

        window.setTimeout(() => {
            setTasks((currentTasks) =>
                sortTasks(currentTasks.filter((task) => task.id !== taskId)),
            );
            setDeletingTaskIds((prev) => prev.filter((id) => id !== taskId));

            if (selectedTaskId === taskId) {
                setIsSlideOverOpen(false);
                setSelectedTaskId(null);
            }
        }, 180);
    };

    const closeSlideOver = () => {
        if (selectedTaskId) {
            axios.post(
                `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${selectedTaskId}/unlock`,
            );
        }
        setIsSlideOverOpen(false);
        setSelectedTaskId(null);
    };

    return (
        <div className="flex min-h-[70vh] h-full flex-col space-y-4 sm:min-h-[75vh] sm:space-y-6 lg:min-h-0">
            <Head title={`${project.name} - Board`} />

            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-display font-black uppercase tracking-tighter text-white sm:text-3xl">
                        {project.name}
                    </h1>
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
                        Project ID:{" "}
                        <span className="text-accent">{project.slug}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface2/50 p-1.5">
                    <div className="flex flex-1 items-center rounded-xl border border-border/50 bg-surface p-1 shadow-inner lg:flex-none">
                        <button
                            onClick={() => setView("columns")}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${view === "columns" ? "scale-105 bg-accent text-black shadow-lg" : "text-muted hover:text-white"}`}
                        >
                            <LayoutGrid size={14} strokeWidth={3} />
                            Columns
                        </button>
                        <button
                            onClick={() => setView("flow")}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${view === "flow" ? "scale-105 bg-accent text-black shadow-lg" : "text-muted hover:text-white"}`}
                        >
                            <Share2 size={14} strokeWidth={3} />
                            Flow
                        </button>
                    </div>

                    <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

                    <button
                        onClick={() =>
                            setDensity(
                                density === "minimal" ? "informed" : "minimal",
                            )
                        }
                        className={`rounded-xl border border-border p-2 transition-all hover:scale-110 ${density === "informed" ? "border-accent/50 bg-accent/5 text-accent" : "text-muted"}`}
                        title="Toggle Card Density"
                    >
                        <Sliders size={18} />
                    </button>
                </div>
            </header>

            <div className="relative min-h-[60vh] flex-1 overflow-hidden rounded-[28px] border-2 border-border/50 bg-surface2/20 shadow-2xl sm:min-h-[65vh] sm:rounded-[40px] lg:min-h-0">
                {view === "columns" ? (
                    <ColumnView
                        workspace={workspace}
                        project={project}
                        tasks={tasks}
                        onTaskClick={handleTaskClick}
                        onTaskMove={handleTaskMove}
                        onTaskUpdated={handleTaskUpdated}
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
                        locks={locks}
                        presenceMembers={presenceMembers}
                        recentTaskIds={recentTaskIds}
                        deletingTaskIds={deletingTaskIds}
                    />
                )}
            </div>

            <TaskSlideOver
                workspace={workspace}
                project={project}
                task={selectedTask}
                tasks={tasks}
                members={members}
                isOpen={isSlideOverOpen}
                onClose={closeSlideOver}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
            />
        </div>
    );
}

Board.layout = (page) => <WorkspaceLayout children={page} />;
