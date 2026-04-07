import { useEffect, useMemo, useState } from "react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head } from "@inertiajs/react";
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
    const [view, setView] = useState("columns");
    const [density, setDensity] = useState("informed");
    const [tasks, setTasks] = useState(sortTasks(project.tasks || []));
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

    useEffect(() => {
        setTasks(sortTasks(project.tasks || []));
    }, [project.tasks]);

    const selectedTask = useMemo(
        () => tasks.find((task) => task.id === selectedTaskId) || null,
        [selectedTaskId, tasks],
    );

    const handleTaskClick = (taskId) => {
        setSelectedTaskId(taskId);
        setIsSlideOverOpen(true);
    };

    const handleTaskMove = (taskId, status, position) => {
        setTasks((currentTasks) =>
            moveTask(currentTasks, taskId, status, position),
        );
    };

    const handleTaskUpdated = (taskId, changes) => {
        setTasks((currentTasks) =>
            sortTasks(
                currentTasks.map((task) =>
                    task.id === taskId
                        ? {
                              ...task,
                              ...changes,
                          }
                        : task,
                ),
            ),
        );
    };

    const handleTaskDeleted = (taskId) => {
        setTasks((currentTasks) =>
            sortTasks(currentTasks.filter((task) => task.id !== taskId)),
        );
        setIsSlideOverOpen(false);
        setSelectedTaskId(null);
    };

    const closeSlideOver = () => {
        setIsSlideOverOpen(false);
        setSelectedTaskId(null);
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <Head title={`${project.name} - Board`} />

            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-display font-black text-white uppercase tracking-tighter">
                        {project.name}
                    </h1>
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
                        Project ID:{" "}
                        <span className="text-accent">{project.slug}</span>
                    </p>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface2/50 p-1.5">
                    <div className="flex items-center rounded-xl border border-border/50 bg-surface p-1 shadow-inner">
                        <button
                            onClick={() => setView("columns")}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${view === "columns" ? "scale-105 bg-accent text-black shadow-lg" : "text-muted hover:text-white"}`}
                        >
                            <LayoutGrid size={14} strokeWidth={3} />
                            Columns
                        </button>
                        <button
                            onClick={() => setView("flow")}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${view === "flow" ? "scale-105 bg-accent text-black shadow-lg" : "text-muted hover:text-white"}`}
                        >
                            <Share2 size={14} strokeWidth={3} />
                            Flow
                        </button>
                    </div>

                    <div className="mx-2 h-6 w-px bg-border" />

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

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[40px] border-2 border-border/50 bg-surface2/20 shadow-2xl">
                {view === "columns" ? (
                    <ColumnView
                        workspace={workspace}
                        project={project}
                        tasks={tasks}
                        onTaskClick={handleTaskClick}
                        onTaskMove={handleTaskMove}
                        density={density}
                    />
                ) : (
                    <FlowView
                        workspace={workspace}
                        project={project}
                        tasks={tasks}
                        onTaskClick={handleTaskClick}
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
