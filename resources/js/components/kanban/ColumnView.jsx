import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, Lock, Calendar } from "lucide-react";
import { router } from "@inertiajs/react";

export default function ColumnView({
    workspace,
    project,
    tasks,
    onTaskClick,
    onTaskMove,
    density,
}) {
    const columns = [
        { id: "backlog", title: "Backlog" },
        { id: "in_progress", title: "In Progress" },
        { id: "in_review", title: "In Review" },
        { id: "done", title: "Done" },
    ];

    // Group tasks by their status
    const tasksByStatus = columns.reduce((acc, col) => {
        acc[col.id] = (tasks || [])
            .filter((task) => task.status === col.id)
            .sort((a, b) => a.position - b.position);
        return acc;
    }, {});

    const onDragEnd = (result) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        )
            return;

        const task = tasks.find((t) => t.id.toString() === draggableId);

        // --- THE "DONE" LOGIC ---
        // 1. You cannot drag OUT of "Done"
        if (source.droppableId === "done") return;

        // 2. You cannot move TO "Done" if dependencies are not finished
        if (destination.droppableId === "done") {
            const unfinishedDeps = task.dependencies?.filter(
                (dep) => dep.status !== "done",
            );
            if (unfinishedDeps?.length > 0) {
                alert(
                    `Cannot move to Done! Waiting for: ${unfinishedDeps.map((d) => d.title).join(", ")}`,
                );
                return;
            }
        }

        onTaskMove(draggableId, destination.droppableId, destination.index);

        router.patch(
            `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${draggableId}`,
            {
                status: destination.droppableId,
                position: destination.index,
            },
            { preserveScroll: true, preserveState: true },
        );
    };

    const createTask = (status) => {
        router.post(
            `/workspaces/${workspace.slug}/projects/${project.slug}/tasks`,
            {
                title: "New Task",
                status,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full p-6 gap-6 overflow-x-auto select-none">
                {columns.map((column) => (
                    <div
                        key={column.id}
                        className="flex flex-col w-80 shrink-0"
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
                                        (task, index) => (
                                            <Draggable
                                                key={task.id.toString()}
                                                draggableId={task.id.toString()}
                                                index={index}
                                                isDragDisabled={
                                                    task.status === "done"
                                                }
                                            >
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() =>
                                                            onTaskClick(task.id)
                                                        }
                                                        className={`group cursor-pointer rounded-3xl border p-4 shadow-lg transition-all ${
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
                                                                ? "opacity-40 grayscale hover:grayscale-0 hover:opacity-100"
                                                                : ""
                                                        }`}
                                                    >
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
                                                                    {task.title}
                                                                </h4>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    {task.dependencies?.some(
                                                                        (d) =>
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

                                                            {density === "informed" && (
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
                                                                            {task.assignee?.name?.substring(0, 2) || "??"}
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
                                                                                {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
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
                                                                        #{task.id}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ),
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
