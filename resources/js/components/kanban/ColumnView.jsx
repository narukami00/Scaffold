import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, Lock, Calendar } from "lucide-react";
import axios from "axios";

export default function ColumnView({
    workspace,
    project,
    tasks,
    onTaskClick,
    onTaskMove,
    onTaskUpdated,
    density,
    locks = {},
    presenceMembers = [],
    recentTaskIds = [],
    deletingTaskIds = [],
}) {
    const columns = [
        { id: "backlog", title: "Backlog" },
        { id: "in_progress", title: "In Progress" },
        { id: "in_review", title: "In Review" },
        { id: "done", title: "Done" },
    ];

    const getCsrfToken = () =>
        document.cookie
            .split("; ")
            .find((row) => row.startsWith("XSRF-TOKEN="))
            ?.split("=")[1];

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

    // Helper to get the occupant of a task
    const getOccupant = (taskId) => {
        const userId = locks[taskId];
        if (!userId) return null;
        return presenceMembers.find((m) => m.id === userId);
    };

    // Helper to get occupant color
    const getOccupantColor = (taskId) => {
        const userId = locks[taskId];
        if (!userId) return null;
        // Find member from props.workspace.members to get their persistent color
        const member = workspace.members?.find((m) => m.id === userId);
        return member?.pivot?.color || "#3b82f6";
    };

    // Group tasks by their status
    const tasksByStatus = columns.reduce((acc, col) => {
        acc[col.id] = (tasks || [])
            .filter((task) => task.status === col.id)
            .sort((a, b) => a.position - b.position);
        return acc;
    }, {});

    const onDragStart = (start) => {
        const { draggableId } = start;

        if (locks[draggableId]) return;

        axios.post(lockUrl(draggableId)).catch((error) => {
            console.error("Failed to broadcast task lock", error);
        });
    };

    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;
        if (!destination) {
            axios.post(unlockUrl(draggableId)).catch(() => {});
            return;
        }

        // Prevent moving locked tasks
        if (locks[draggableId]) {
            axios.post(unlockUrl(draggableId)).catch(() => {});
            return;
        }

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            axios.post(unlockUrl(draggableId)).catch(() => {});
            return;
        }

        const task = tasks.find((t) => t.id.toString() === draggableId);

        // --- THE "DONE" LOGIC ---
        // 1. You cannot drag OUT of "Done"
        if (source.droppableId === "done") {
            axios.post(unlockUrl(draggableId)).catch(() => {});
            return;
        }

        // 2. You cannot move TO "Done" if dependencies are not finished
        if (destination.droppableId === "done") {
            const unfinishedDeps = task.dependencies?.filter(
                (dep) => dep.status !== "done",
            );
            if (unfinishedDeps?.length > 0) {
                alert(
                    `Cannot move to Done! Waiting for: ${unfinishedDeps.map((d) => d.title).join(", ")}`,
                );
                axios.post(unlockUrl(draggableId)).catch(() => {});
                return;
            }
        }

        onTaskMove(draggableId, destination.droppableId, destination.index);

        const csrfToken = getCsrfToken();

        try {
            const response = await fetch(taskUrl(draggableId), {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    ...(csrfToken
                        ? { "X-XSRF-TOKEN": decodeURIComponent(csrfToken) }
                        : {}),
                },
                body: JSON.stringify({
                    status: destination.droppableId,
                    position: destination.index,
                }),
            });

            if (!response.ok) {
                throw new Error(
                    `Task move failed with status ${response.status}`,
                );
            }
        } catch (error) {
            console.error("Failed to persist task move", error);
            onTaskMove(draggableId, source.droppableId, source.index);
        } finally {
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
            <div className="flex h-full gap-4 overflow-x-auto p-3 select-none sm:gap-6 sm:p-6">
                {columns.map((column) => (
                    <div
                        key={column.id}
                        className="flex w-[280px] shrink-0 flex-col sm:w-80"
                    >
                        {/* Column Header */}
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                                    {column.title}
                                </h3>
                                <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-black">
                                    {tasksByStatus[column.id].length}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="text-muted hover:text-white"
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
                                    className="flex-1 space-y-4 min-h-[150px]"
                                >
                                    {tasksByStatus[column.id].map(
                                        (task, index) => {
                                            const occupant = getOccupant(
                                                task.id,
                                            );
                                            const isLocked = !!occupant;
                                            const occupantColor =
                                                getOccupantColor(task.id);
                                            const isRecent = recentTaskIds.includes(
                                                task.id,
                                            );
                                            const isDeleting =
                                                deletingTaskIds.includes(
                                                    task.id,
                                                );

                                            return (
                                                <Draggable
                                                    key={task.id.toString()}
                                                    draggableId={task.id.toString()}
                                                    index={index}
                                                    isDragDisabled={
                                                        task.status ===
                                                            "done" || isLocked
                                                    }
                                                >
                                                    {(provided) => (
                                                        <div
                                                            ref={
                                                                provided.innerRef
                                                            }
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() =>
                                                                onTaskClick(
                                                                    task.id,
                                                                )
                                                            }
                                                            style={{
                                                                ...provided
                                                                    .draggableProps
                                                                    .style,
                                                                borderColor:
                                                                    isLocked
                                                                        ? occupantColor
                                                                        : undefined,
                                                                boxShadow:
                                                                    isLocked
                                                                        ? `0 0 15px ${occupantColor}33`
                                                                        : undefined,
                                                            }}
                                                            className={`group relative cursor-pointer rounded-3xl border p-4 shadow-lg transition-all ${
                                                                task.status ===
                                                                "done"
                                                                    ? "border-emerald-500/20 bg-emerald-500/[0.05] shadow-[0_12px_30px_rgba(16,185,129,0.08)]"
                                                                    : "border-border bg-surface hover:border-accent/50"
                                                            } ${
                                                                task.dependencies?.some(
                                                                    (d) =>
                                                                        d.status !==
                                                                        "done",
                                                                )
                                                                    ? "opacity-60"
                                                                    : ""
                                                            } ${
                                                                isLocked
                                                                    ? "opacity-90"
                                                                    : ""
                                                            } ${
                                                                isRecent
                                                                    ? "task-pop-in"
                                                                    : ""
                                                            } ${
                                                                isDeleting
                                                                    ? "task-pop-out pointer-events-none"
                                                                    : ""
                                                            }`}
                                                            title={
                                                                isLocked
                                                                    ? `${occupant?.name} is editing...`
                                                                    : ""
                                                            }
                                                        >
                                                            {/* Presence Badge */}
                                                            {isLocked && (
                                                                <div
                                                                    className="absolute -top-2 -left-1 z-10 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white shadow-lg animate-in zoom-in duration-300"
                                                                    style={{
                                                                        backgroundColor:
                                                                            occupantColor,
                                                                    }}
                                                                >
                                                                    <Lock
                                                                        size={8}
                                                                        strokeWidth={
                                                                            3
                                                                        }
                                                                    />
                                                                    {
                                                                        occupant?.name
                                                                    }
                                                                </div>
                                                            )}
                                                            <div className="space-y-4">
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <h4
                                                                        className={`line-clamp-2 text-sm font-bold leading-tight transition-colors ${
                                                                            task.status ===
                                                                            "done"
                                                                                ? "text-white/75"
                                                                                : "text-white group-hover:text-accent"
                                                                        }`}
                                                                    >
                                                                        {
                                                                            task.title
                                                                        }
                                                                    </h4>
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        {task.dependencies?.some(
                                                                            (
                                                                                d,
                                                                            ) =>
                                                                                d.status !==
                                                                                "done",
                                                                        ) && (
                                                                            <Lock
                                                                                size={
                                                                                    12
                                                                                }
                                                                                className="text-red-400/80"
                                                                            />
                                                                        )}
                                                                        {task.status ===
                                                                        "done" ? (
                                                                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                                                                                Done
                                                                            </span>
                                                                        ) : (
                                                                            <div
                                                                                className={`h-6 w-1.5 rounded-full ${
                                                                                    task.priority ===
                                                                                    "urgent"
                                                                                        ? "bg-red-500"
                                                                                        : task.priority ===
                                                                                            "high"
                                                                                          ? "bg-orange-500"
                                                                                          : task.priority ===
                                                                                              "medium"
                                                                                            ? "bg-yellow-500"
                                                                                            : "bg-blue-500"
                                                                                }`}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {density ===
                                                                    "informed" && (
                                                                    <div
                                                                        className={`flex items-center justify-between border-t pt-3 ${
                                                                            task.status ===
                                                                            "done"
                                                                                ? "border-emerald-400/10"
                                                                                : "border-border/30"
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div
                                                                                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-black uppercase shadow-sm ${
                                                                                    task.status ===
                                                                                    "done"
                                                                                        ? "border-emerald-900 bg-emerald-300 text-emerald-950"
                                                                                        : "border-surface bg-accent text-black"
                                                                                }`}
                                                                            >
                                                                                {task.assignee?.name?.substring(
                                                                                    0,
                                                                                    2,
                                                                                ) ||
                                                                                    "??"}
                                                                            </div>
                                                                            {task.due_date && (
                                                                                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted">
                                                                                    <Calendar
                                                                                        size={
                                                                                            10
                                                                                        }
                                                                                        className={
                                                                                            task.status ===
                                                                                            "done"
                                                                                                ? "text-emerald-300"
                                                                                                : "text-accent"
                                                                                        }
                                                                                    />
                                                                                    {new Date(
                                                                                        task.due_date,
                                                                                    ).toLocaleDateString(
                                                                                        [],
                                                                                        {
                                                                                            month: "short",
                                                                                            day: "numeric",
                                                                                        },
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div
                                                                            className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                                                                task.status ===
                                                                                "done"
                                                                                    ? "text-emerald-200/60"
                                                                                    : "text-muted"
                                                                            }`}
                                                                        >
                                                                            #
                                                                            {
                                                                                task.id
                                                                            }
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
                                        className="w-full py-4 border-2 border-dashed border-border/30 rounded-3xl text-xs text-muted font-black uppercase tracking-widest hover:border-accent/30 hover:text-accent transition-all flex items-center justify-center gap-2"
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
        </DragDropContext>
    );
}
