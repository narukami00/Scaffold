import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, Lock, Calendar, Trash2, GitBranch } from "lucide-react";
import axios from "axios";
import { flushSync } from "react-dom";
import { isTaskBlocked } from "@/utils/taskDependencies";
import { Link } from "@inertiajs/react";

// ── Palette tokens ────────────────────────────────────────────────────────────
const C = {
    bg:      "#ede0c8",
    card:    "#f3e4c9",
    navy:    "#0a2947",
    brown:   "#8b5e3c",
    sage:    "#d3d4c0",
    border:  "rgba(139,94,60,0.18)",
    muted:   "rgba(10,41,71,0.68)",
    faint:   "rgba(10,41,71,0.25)",
};

const STATUS_CFG = {
    backlog:     { color: "text-[#1a5f8a]", bg: "rgba(26,95,138,0.1)",  border: "rgba(26,95,138,0.2)" },
    in_progress: { color: "text-[#b45309]", bg: "rgba(180,83,9,0.1)",   border: "rgba(180,83,9,0.2)" },
    in_review:   { color: "text-[#7c5c1e]", bg: "rgba(124,92,30,0.1)",  border: "rgba(124,92,30,0.2)" },
    done:        { color: "text-[#2d6a4f]", bg: "rgba(45,106,79,0.1)",  border: "rgba(45,106,79,0.2)" },
};

export default function ColumnView({
    workspace,
    project,
    tasks,
    onTaskClick,
    onTaskMove,
    onTaskUpdated,
    onTaskDelete,
    density,
    locks = {},
    presenceMembers = [],
    recentTaskIds = [],
    deletingTaskIds = [],
    currentUserId = null,
}) {
    const lockOwnerId = (taskId) =>
        locks[taskId] ?? locks[String(taskId)] ?? locks[Number(taskId)];

    const isLockedByOther = (taskId) => {
        const ownerId = lockOwnerId(taskId);
        return (
            ownerId &&
            currentUserId &&
            Number(ownerId) !== Number(currentUserId)
        );
    };

    const columns = [
        { id: "backlog", title: "Backlog" },
        { id: "in_progress", title: "In Progress" },
        { id: "in_review", title: "In Review" },
        { id: "done", title: "Done" },
    ];

    const taskUrl = (taskId) =>
        new URL(
            `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${taskId}`,
            window.location.origin,
        ).toString();

    const lockUrl = (taskId) =>
        new URL(
            `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${taskId}/lock`,
            window.location.origin,
        ).toString();

    const unlockUrl = (taskId) =>
        new URL(
            `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${taskId}/unlock`,
            window.location.origin,
        ).toString();

    const getOccupant = (taskId) => {
        const userId = lockOwnerId(taskId);
        if (!userId) return null;
        return (
            presenceMembers.find((m) => m.id === userId) ||
            workspace.members?.find((m) => m.id === userId) ||
            (workspace.owner?.id === userId ? workspace.owner : null) || {
                id: userId,
                name: "Someone",
            }
        );
    };

    const getOccupantColor = (taskId) => {
        const userId = lockOwnerId(taskId);
        if (!userId) return null;
        if (workspace.owner?.id === userId) {
            return "#f59e0b";
        }
        const member = workspace.members?.find((m) => m.id === userId);
        return member?.pivot?.color || "#3b82f6";
    };

    const tasksByStatus = columns.reduce((acc, col) => {
        acc[col.id] = (tasks || [])
            .filter((task) => task.status === col.id)
            .sort((a, b) => a.position - b.position);
        return acc;
    }, {});

    const onDragStart = (start) => {
        const { draggableId } = start;
        const taskId = Number(draggableId);
        if (isLockedByOther(taskId)) return;
        axios.post(lockUrl(draggableId)).catch((error) => {
            if (error.response?.status === 409 && error.response?.data?.userId) {
                console.warn("Task is locked by another member.");
            } else {
                console.error("Failed to broadcast task lock", error);
            }
        });
    };

    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;
        const task = tasks.find((t) => t.id.toString() === draggableId);

        if (!destination) {
            axios.post(unlockUrl(draggableId)).catch(() => {});
            return;
        }

        if (destination.droppableId === "task-trash") {
            if (!isLockedByOther(Number(draggableId)) && onTaskDelete) {
                flushSync(() => {
                    onTaskDelete(Number(draggableId), {
                        instant: true,
                        snapshot: task,
                    });
                });
            }
            axios.post(unlockUrl(draggableId)).catch(() => {});
            return;
        }

        if (isLockedByOther(Number(draggableId))) {
            axios.post(unlockUrl(draggableId)).catch(() => {});
            return;
        }

        if (!task) {
            axios.post(unlockUrl(draggableId)).catch(() => {});
            return;
        }

        if (destination.droppableId === "done" && isTaskBlocked(task, tasks)) {
            alert(`Cannot move "${task.title}" to Done because it has unresolved dependencies.`);
            axios.post(unlockUrl(draggableId)).catch(() => {});
            return;
        }

        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            axios.post(unlockUrl(draggableId)).catch(() => {});
            return;
        }

        onTaskMove(draggableId, destination.droppableId, destination.index);

        try {
            await axios.patch(taskUrl(draggableId), {
                status: destination.droppableId,
                position: destination.index,
            });
            axios.post(unlockUrl(draggableId)).catch(() => {});
        } catch (error) {
            console.error("Failed to update task position", error);
            onTaskMove(draggableId, source.droppableId, source.index);
            axios.post(unlockUrl(draggableId)).catch(() => {});
        }
    };

    const createTask = (status) => {
        axios
            .post(
                `/workspaces/${workspace.slug}/projects/${project.slug}/tasks`,
                {
                    title: "New Task",
                    status,
                },
                {
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                },
            )
            .then(({ data }) => {
                if (data?.task) {
                    onTaskUpdated(data.task.id, data.task);
                }
            })
            .catch((error) => {
                console.error("Failed to create task", error);
            });
    };

    return (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="relative h-full">
                <div className="flex h-full gap-4 overflow-x-auto p-3 pb-16 select-none sm:gap-6 sm:p-6 sm:pb-20">
                    {columns.map((column) => (
                        <div
                            key={column.id}
                            className="flex w-[280px] shrink-0 flex-col sm:w-80"
                        >
                            {/* Column Header */}
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: C.navy }}>
                                        {column.title}
                                    </h3>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black"
                                        style={{ background: "rgba(139,94,60,0.12)", color: C.brown }}>
                                        {tasksByStatus[column.id].length}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="transition-colors"
                                    style={{ color: C.muted }}
                                    onMouseEnter={e => e.currentTarget.style.color = C.navy}
                                    onMouseLeave={e => e.currentTarget.style.color = C.muted}
                                >
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>

                            {/* Droppable Area */}
                            <Droppable droppableId={column.id}>
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="flex-1 space-y-4 min-h-[250px] p-3 rounded-2xl border border-dashed transition-all"
                                        style={{ background: "rgba(139,94,60,0.03)", borderColor: C.border }}
                                    >
                                        {tasksByStatus[column.id].map(
                                            (task, index) => {
                                                const occupant = getOccupant(task.id);
                                                const taskLocked = isLockedByOther(task.id);
                                                const occupantColor = getOccupantColor(task.id);
                                                const isRecent = recentTaskIds.includes(task.id);
                                                const isDeleting = deletingTaskIds.includes(task.id);
                                                const isDone = task.status === "done";
                                                const sCfg = STATUS_CFG[task.status] || { color: C.muted };

                                                return (
                                                    <Draggable
                                                        key={task.id.toString()}
                                                        draggableId={task.id.toString()}
                                                        index={index}
                                                        isDragDisabled={taskLocked}
                                                    >
                                                        {(provided) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => onTaskClick(task.id)}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    borderColor: taskLocked ? occupantColor : isDone ? "rgba(45,106,79,0.2)" : C.border,
                                                                    boxShadow: taskLocked
                                                                        ? `0 0 15px ${occupantColor}33`
                                                                        : "0 2px 10px rgba(139,94,60,0.06)",
                                                                    background: isDone ? "rgba(45,106,79,0.02)" : C.card,
                                                                }}
                                                                className={`group relative cursor-pointer rounded-2xl border p-4 transition-all hover:scale-[1.01] ${
                                                                    isTaskBlocked(task, tasks) ? "opacity-60" : ""
                                                                } ${taskLocked ? "opacity-90" : ""} ${isRecent ? "task-pop-in" : ""} ${
                                                                    isDeleting ? "task-pop-out pointer-events-none" : ""
                                                                }`}
                                                                title={taskLocked ? `${occupant?.name || "Someone"} is editing…` : ""}
                                                            >
                                                                {/* Presence Badge */}
                                                                {taskLocked && (
                                                                    <div
                                                                        className="absolute -top-2 -left-1 z-10 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white shadow-lg animate-in zoom-in duration-300"
                                                                        style={{ backgroundColor: occupantColor }}
                                                                    >
                                                                        <Lock size={8} strokeWidth={3} />
                                                                        {occupant?.name}
                                                                    </div>
                                                                )}
                                                                <div className="space-y-4">
                                                                    {/* Labels */}
                                                                    {(task.labels || []).length > 0 && (
                                                                        <div className="flex flex-wrap gap-1.5 mb-1">
                                                                            {task.labels.map((l) => (
                                                                                <span
                                                                                    key={l.id}
                                                                                    className="h-2.5 w-2.5 rounded-full border border-black/5 flex-shrink-0"
                                                                                    style={{ backgroundColor: l.color }}
                                                                                    title={l.name}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <h4
                                                                            className="line-clamp-2 text-xs font-bold leading-tight transition-colors"
                                                                            style={{
                                                                                color: isDone ? "rgba(10,41,71,0.5)" : C.navy,
                                                                                textDecoration: isDone ? "line-through" : "none"
                                                                            }}
                                                                        >
                                                                            {task.title}
                                                                        </h4>
                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                            {isTaskBlocked(task, tasks) && (
                                                                                <Lock size={12} className="text-red-700/80" />
                                                                            )}
                                                                            {isDone ? (
                                                                                <span className="rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em]"
                                                                                    style={{ background: "rgba(45,106,79,0.08)", borderColor: "rgba(45,106,79,0.25)", color: "#2d6a4f" }}>
                                                                                    Done
                                                                                </span>
                                                                            ) : (
                                                                                <div
                                                                                    className={`h-5 w-1 rounded-full ${
                                                                                        task.priority === "urgent"
                                                                                            ? "bg-red-700"
                                                                                            : task.priority === "high"
                                                                                              ? "bg-amber-600"
                                                                                              : task.priority === "medium"
                                                                                                ? "bg-yellow-600"
                                                                                                : "bg-blue-600"
                                                                                    }`}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {density === "informed" && (
                                                                        <div className="flex items-center justify-between border-t pt-3"
                                                                            style={{ borderColor: "rgba(139,94,60,0.12)" }}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                {task.assignee ? (
                                                                                    <Link
                                                                                        href={`/workspaces/${workspace.slug}/members/${task.assignee.id}`}
                                                                                        className="hover:scale-105 active:scale-95 transition-all shrink-0"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        {task.assignee.avatar_path ? (
                                                                                            <img src={task.assignee.avatar_path} alt={task.assignee.name} className="h-5 w-5 rounded-full object-cover border border-black/5" />
                                                                                        ) : (
                                                                                            <div
                                                                                                className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-black uppercase shadow-sm border"
                                                                                                style={{
                                                                                                    borderColor: "rgba(139,94,60,0.2)",
                                                                                                    background: isDone ? "rgba(45,106,79,0.1)" : C.brown,
                                                                                                    color: isDone ? "#2d6a4f" : "#f3e4c9"
                                                                                                }}
                                                                                            >
                                                                                                {task.assignee.name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "??"}
                                                                                            </div>
                                                                                        )}
                                                                                    </Link>
                                                                                ) : (
                                                                                    <div
                                                                                        className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-black uppercase shadow-sm border"
                                                                                        style={{
                                                                                            borderColor: "rgba(139,94,60,0.2)",
                                                                                            background: "rgba(139,94,60,0.05)",
                                                                                            color: C.muted
                                                                                        }}
                                                                                    >
                                                                                        --
                                                                                    </div>
                                                                                )}
                                                                                {task.due_date && (
                                                                                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest"
                                                                                        style={{ color: C.muted }}
                                                                                    >
                                                                                        <Calendar size={10} style={{ color: isDone ? "#2d6a4f" : C.brown }} />
                                                                                        {new Date(task.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                                                                                    </div>
                                                                                )}
                                                                                {task.github_issue && (
                                                                                    <div
                                                                                        className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-lg border ${
                                                                                            task.github_issue.issue_number
                                                                                                ? "text-slate-600 bg-white/60 border-slate-200"
                                                                                                : "text-amber-800 bg-amber-50 border-amber-200 animate-pulse"
                                                                                        }`}
                                                                                        title={
                                                                                            task.github_issue.issue_number
                                                                                                ? `Linked to GitHub Issue #${task.github_issue.issue_number}`
                                                                                                : "GitHub issue queued for creation"
                                                                                        }
                                                                                    >
                                                                                        <GitBranch size={10} className="text-slate-800" />
                                                                                        {task.github_issue.issue_number
                                                                                            ? `#${task.github_issue.issue_number}`
                                                                                            : "Syncing…"}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-[9px] font-black uppercase tracking-[0.2em]"
                                                                                style={{ color: C.faint }}
                                                                            >
                                                                                #{task.id}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            },
                                        )}
                                        {provided.placeholder}

                                        {/* Inline Add Task Button */}
                                        <button
                                            type="button"
                                            className="w-full py-3.5 border border-dashed rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                            style={{
                                                borderColor: "rgba(139,94,60,0.25)",
                                                background: "rgba(139,94,60,0.02)",
                                                color: C.brown
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.borderColor = C.brown;
                                                e.currentTarget.style.background = "rgba(139,94,60,0.06)";
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.borderColor = "rgba(139,94,60,0.25)";
                                                e.currentTarget.style.background = "rgba(139,94,60,0.02)";
                                            }}
                                            onClick={() => createTask(column.id)}
                                        >
                                            <Plus size={14} />
                                            Add Task
                                        </button>
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>

                <Droppable droppableId="task-trash">
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`pointer-events-auto absolute bottom-6 right-6 z-20 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-5 py-4 shadow-2xl backdrop-blur-sm transition-all duration-200 ${
                                snapshot.isDraggingOver
                                    ? "scale-110 border-red-700 bg-red-500/20 text-red-700"
                                    : "border-red-600/30 bg-[#f3e4c9]/90 text-red-700/80"
                            }`}
                        >
                            <Trash2
                                size={22}
                                className={snapshot.isDraggingOver ? "animate-pulse" : ""}
                            />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                                {snapshot.isDraggingOver ? "Release" : "Delete"}
                            </span>
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
        </DragDropContext>
    );
}
