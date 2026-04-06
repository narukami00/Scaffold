import { useEffect } from "react";
import { X, Calendar, User, MessageSquare, Lock, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useForm } from "@inertiajs/react";

const statuses = [
    { value: "backlog", label: "Backlog" },
    { value: "in_progress", label: "In Progress" },
    { value: "in_review", label: "In Review" },
    { value: "done", label: "Done" },
];

const priorities = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
];

const fieldClassName =
    "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-white outline-none transition-colors focus:border-accent";

export default function TaskSlideOver({
    workspace,
    project,
    task,
    tasks,
    members,
    isOpen,
    onClose,
    onTaskUpdated,
}) {
    const { data, setData, patch, processing, errors } = useForm({
        title: task?.title || "",
        description: task?.description || "",
        status: task?.status || "backlog",
        priority: task?.priority || "medium",
        due_date: task?.due_date || "",
        blocked_by_id: task?.blocked_by_id || "",
        assignee_id: task?.assignee_id || "",
    });

    useEffect(() => {
        if (!task) {
            return;
        }

        setData({
            title: task.title,
            description: task.description || "",
            status: task.status || "backlog",
            priority: task.priority || "medium",
            due_date: task.due_date || "",
            blocked_by_id: task.blocked_by_id || "",
            assignee_id: task.assignee_id || "",
        });
    }, [task, setData]);

    if (!isOpen || !task) return null;

    const dependencyOptions = tasks.filter((candidate) => candidate.id !== task.id);

    const handleSubmit = (e) => {
        e.preventDefault();

        const payload = {
            ...data,
            assignee_id: data.assignee_id ? Number(data.assignee_id) : null,
            blocked_by_id: data.blocked_by_id ? Number(data.blocked_by_id) : null,
        };

        patch(`/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${task.id}`, {
            data: payload,
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                onTaskUpdated(task.id, {
                    ...payload,
                    assignee:
                        members.find((member) => member.id === payload.assignee_id) ||
                        null,
                    blocked_by:
                        tasks.find(
                            (candidate) => candidate.id === payload.blocked_by_id,
                        ) || null,
                });
                onClose();
            },
        });
    };

    return (
        <>
            <div
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <aside className="fixed inset-y-0 right-0 z-[70] w-full max-w-[560px] overflow-y-auto border-l border-border bg-[linear-gradient(180deg,rgba(24,24,28,0.98)_0%,rgba(10,10,11,0.98)_100%)] p-8 shadow-2xl animate-in slide-in-from-right duration-300">
                <div className="mb-8 flex items-start justify-between gap-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-accent">
                                Task Editor
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                #{task.id}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-display font-black uppercase tracking-tight text-white">
                                Refine Task Details
                            </h2>
                            <p className="mt-2 max-w-sm text-sm text-muted">
                                Update the brief, assignment, timing, and blockers without leaving the board.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border border-border bg-surface/70 p-3 text-muted transition-colors hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <section className="rounded-[28px] border border-border bg-surface/60 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                    Overview
                                </p>
                                <p className="mt-1 text-sm text-muted">
                                    Give the task a clear name and define where it sits in the workflow.
                                </p>
                            </div>
                            <span className="rounded-full border border-border px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                {data.status.replace("_", " ")}
                            </span>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                    Task Name
                                </label>
                                <input
                                    value={data.title}
                                    onChange={(e) => setData("title", e.target.value)}
                                    className="w-full border-none bg-transparent p-0 text-3xl font-black tracking-tight text-white outline-none placeholder:text-muted/30"
                                    placeholder="Task Title"
                                />
                                {errors.title && (
                                    <p className="text-xs italic text-red-400">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                        Status
                                    </label>
                                    <select
                                        value={data.status}
                                        onChange={(e) => setData("status", e.target.value)}
                                        className={fieldClassName}
                                    >
                                        {statuses.map((status) => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                        Priority
                                    </label>
                                    <select
                                        value={data.priority}
                                        onChange={(e) =>
                                            setData("priority", e.target.value)
                                        }
                                        className={fieldClassName}
                                    >
                                        {priorities.map((priority) => (
                                            <option key={priority.value} value={priority.value}>
                                                {priority.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-[24px] border border-border bg-surface/40 p-5">
                            <div className="mb-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                <User size={14} className="text-accent" />
                                Assignee
                            </div>
                            <select
                                value={data.assignee_id}
                                onChange={(e) => setData("assignee_id", e.target.value)}
                                className={fieldClassName}
                            >
                                <option value="">Unassigned</option>
                                {members.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-3 text-xs text-muted">
                                Workspace members will appear here as your team grows.
                            </p>
                        </div>

                        <div className="rounded-[24px] border border-border bg-surface/40 p-5">
                            <div className="mb-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                <Calendar size={14} className="text-accent" />
                                Due Date
                            </div>
                            <input
                                type="date"
                                value={data.due_date || ""}
                                onChange={(e) => setData("due_date", e.target.value)}
                                className={fieldClassName}
                            />
                            {errors.due_date && (
                                <p className="mt-3 text-xs italic text-red-400">
                                    {errors.due_date}
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="rounded-[24px] border border-border bg-surface/40 p-5">
                        <div className="mb-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                            <Lock
                                size={14}
                                className={
                                    data.blocked_by_id ? "text-red-400" : "text-accent"
                                }
                            />
                            Dependency
                        </div>
                        <select
                            value={data.blocked_by_id}
                            onChange={(e) => setData("blocked_by_id", e.target.value)}
                            className={fieldClassName}
                        >
                            <option value="">No dependency</option>
                            {dependencyOptions.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                    #{candidate.id} {candidate.title}
                                </option>
                            ))}
                        </select>
                        <p className="mt-3 text-xs text-muted">
                            Mark this task as blocked by an existing task when it cannot move forward independently.
                        </p>
                        {errors.blocked_by_id && (
                            <p className="mt-3 text-xs italic text-red-400">
                                {errors.blocked_by_id}
                            </p>
                        )}
                    </section>

                    <section className="rounded-[24px] border border-border bg-surface/40 p-5">
                        <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                            <MessageSquare size={14} className="text-accent" />
                            Description
                        </div>
                        <textarea
                            value={data.description}
                            onChange={(e) => setData("description", e.target.value)}
                            className="h-44 w-full rounded-2xl border border-border bg-surface p-4 text-sm text-white transition-colors placeholder:text-muted/30 focus:border-accent"
                            placeholder="Add implementation notes, acceptance criteria, or context for the team..."
                        />
                        {errors.description && (
                            <p className="mt-3 text-xs italic text-red-400">
                                {errors.description}
                            </p>
                        )}
                    </section>

                    <div className="flex items-center gap-3 border-t border-border pt-4">
                        <Button loading={processing} className="flex-1">
                            Update Task
                        </Button>
                        <Button
                            type="button"
                            className="border-red-500/20 bg-red-500/10 px-3 text-red-500 hover:bg-red-500 hover:text-white"
                        >
                            <Trash2 size={18} />
                        </Button>
                    </div>
                </form>
            </aside>
        </>
    );
}
