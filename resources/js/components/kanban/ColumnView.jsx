import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, Lock } from "lucide-react";
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

        onTaskMove(draggableId, destination.droppableId, destination.index);

        router.patch(
            `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${draggableId}`,
            {
                status: destination.droppableId,
                position: destination.index,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
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
                            <button type="button" className="text-muted hover:text-white">
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
                                            >
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => onTaskClick(task.id)}
                                                        className={`group bg-surface border border-border p-4 rounded-3xl shadow-lg hover:border-accent/50 transition-all cursor-pointer ${task.blocked_by_id ? "opacity-40 grayscale hover:grayscale-0 hover:opacity-100" : ""}`}
                                                    >
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-start gap-4">
                                                                <h4 className="text-sm font-bold text-white group-hover:text-accent transition-colors leading-tight">
                                                                    {task.title}
                                                                </h4>
                                                                {task.blocked_by_id && (
                                                                    <Lock
                                                                        size={
                                                                            12
                                                                        }
                                                                        className="text-red-400 shrink-0 mt-1"
                                                                    />
                                                                )}
                                                            </div>

                                                            {density ===
                                                                "informed" && (
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex -space-x-2">
                                                                        <div className="w-6 h-6 rounded-full bg-accent border-2 border-surface flex items-center justify-center text-[10px] font-black text-black uppercase">
                                                                            {task.assignee?.name?.substring(
                                                                                0,
                                                                                2,
                                                                            ) ||
                                                                                "UN"}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-[10px] text-muted font-black uppercase tracking-widest">
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
