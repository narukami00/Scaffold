import { useEffect, useState } from "react";
import { X, Calendar, User, MessageSquare, Lock, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import axios from "axios";
import { wouldCreateCycle } from "@/utils/cycleDetection";

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
    onTaskDeleted,
}) {
    const [data, setDataState] = useState({
        title: task?.title || "",
        description: task?.description || "",
        status: task?.status || "backlog",
        priority: task?.priority || "medium",
        due_date: task?.due_date || "",
        dependencies: task?.dependencies?.map((d) => d.id) || [],
        assignee_id: task?.assignee_id || "",
    });
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    const setData = (key, value) => {
        setDataState((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const setError = (key, value) => {
        setErrors((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const clearErrors = () => setErrors({});

    useEffect(() => {
        if (!task) {
            return;
        }

        setDataState({
            title: task.title,
            description: task.description || "",
            status: task.status || "backlog",
            priority: task.priority || "medium",
            due_date: task.due_date || "",
            dependencies: task.dependencies?.map((d) => d.id) || [],
            assignee_id: task.assignee_id || "",
        });
        clearErrors();
    }, [task]);

    if (!isOpen || !task) return null;

    const dependencyOptions = tasks.filter(
        (candidate) => candidate.id !== task.id,
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        clearErrors();

        // Front-end cycle guard — catches the most common mistakes immediately
        const cyclicDepId = data.dependencies.find((depId) =>
            wouldCreateCycle(tasks, task.id, depId),
        );
        if (cyclicDepId !== null && cyclicDepId !== undefined) {
            const badTask = tasks.find((t) => t.id === cyclicDepId);
            setError(
                "dependencies",
                `Circular dependency: "${badTask?.title ?? `#${cyclicDepId}`}" already depends on this task. Linking them would create a deadlock.`,
            );
            return;
        }

        const payload = {
            ...data,
            assignee_id: data.assignee_id ? Number(data.assignee_id) : null,
        };

        setProcessing(true);

        axios
            .patch(
                `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${task.id}`,
                payload,
                {
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                },
            )
            .then(({ data: response }) => {
                if (response?.task) {
                    onTaskUpdated(task.id, {
                        ...response.task,
                    });
                } else {
                    onTaskUpdated(task.id, {
                        ...payload,
                        assignee:
                            members.find(
                                (member) => member.id === payload.assignee_id,
                            ) || null,
                        dependencies: tasks.filter((t) =>
                            payload.dependencies.includes(t.id),
                        ),
                    });
                }
                onClose();
            })
            .catch((error) => {
                const responseErrors = error.response?.data?.errors;

                if (responseErrors) {
                    setErrors(
                        Object.fromEntries(
                            Object.entries(responseErrors).map(
                                ([key, value]) => [key, value?.[0] ?? value],
                            ),
                        ),
                    );
                    return;
                }

                console.error("Failed to update task", error);
            })
            .finally(() => {
                setProcessing(false);
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
                                Update the brief, assignment, timing, and
                                blockers without leaving the board.
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
                                    Give the task a clear name and define where
                                    it sits in the workflow.
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
                                    onChange={(e) =>
                                        setData("title", e.target.value)
                                    }
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
                                        onChange={(e) =>
                                            setData("status", e.target.value)
                                        }
                                        className={fieldClassName}
                                    >
                                        {statuses.map((status) => (
                                            <option
                                                key={status.value}
                                                value={status.value}
                                            >
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
                                            <option
                                                key={priority.value}
                                                value={priority.value}
                                            >
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
                                onChange={(e) =>
                                    setData("assignee_id", e.target.value)
                                }
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
                                Workspace members will appear here as your team
                                grows.
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
                                onChange={(e) =>
                                    setData("due_date", e.target.value)
                                }
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
                                    data.dependencies.length > 0
                                        ? "text-red-400"
                                        : "text-accent"
                                }
                            />
                            Dependencies
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2 rounded-2xl border border-border/50 bg-surface/30 p-4 custom-scrollbar">
                            {dependencyOptions.length > 0 ? (
                                dependencyOptions.map((candidate) => (
                                    <label
                                        key={candidate.id}
                                        className="group flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={data.dependencies.includes(
                                                candidate.id,
                                            )}
                                            onChange={() => {
                                                const newDeps =
                                                    data.dependencies.includes(
                                                        candidate.id,
                                                    )
                                                        ? data.dependencies.filter(
                                                              (id) =>
                                                                  id !==
                                                                  candidate.id,
                                                          )
                                                        : [
                                                              ...data.dependencies,
                                                              candidate.id,
                                                          ];
                                                setData(
                                                    "dependencies",
                                                    newDeps,
                                                );
                                            }}
                                            className="rounded border-border bg-surface text-accent focus:ring-accent"
                                        />
                                        <span className="flex-1 text-xs font-bold text-muted transition-colors group-hover:text-white">
                                            #{candidate.id} {candidate.title}
                                        </span>
                                        <span
                                            className={`rounded px-2 py-0.5 text-[8px] font-black uppercase ${candidate.status === "done" ? "bg-green-500/20 text-green-400" : "bg-accent/10 text-accent/60"}`}
                                        >
                                            {candidate.status}
                                        </span>
                                    </label>
                                ))
                            ) : (
                                <p className="text-[10px] italic text-muted">
                                    No other tasks to link.
                                </p>
                            )}
                        </div>
                        {errors.dependencies && (
                            <p className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400">
                                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                                {errors.dependencies}
                            </p>
                        )}
                        <p className="mt-3 text-xs text-muted">
                            Select all tasks that must be completed before this
                            one can reach the "Done" phase.
                        </p>
                    </section>

                    <section className="rounded-[24px] border border-border bg-surface/40 p-5">
                        <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                            <MessageSquare size={14} className="text-accent" />
                            Description
                        </div>
                        <textarea
                            value={data.description}
                            onChange={(e) =>
                                setData("description", e.target.value)
                            }
                            className="h-32 w-full rounded-2xl border border-border bg-surface p-4 text-sm text-white transition-colors placeholder:text-muted/30 focus:border-accent"
                            placeholder="Add implementation notes, acceptance criteria, or context..."
                        />
                    </section>

                    <section className="rounded-[24px] border border-border bg-surface/40 p-5">
                        <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                            <MessageSquare size={14} className="text-accent" />
                            Conversation
                        </div>

                        {/* Comment Feed */}
                        <div className="mb-4 max-h-64 overflow-y-auto space-y-4 rounded-2xl border border-border/50 bg-surface/30 p-4 custom-scrollbar">
                            {task.comments?.length > 0 ? (
                                task.comments.map((comment) => (
                                    <div
                                        key={comment.id}
                                        className="flex flex-col gap-1"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase text-accent">
                                                {comment.user?.name}
                                            </span>
                                            <span className="text-[9px] text-muted">
                                                {new Date(
                                                    comment.created_at,
                                                ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                        <div className="rounded-2xl border border-border/30 bg-surface/50 px-4 py-2 text-sm text-white">
                                            {comment.body}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-4 text-[10px] italic text-muted">
                                    No messages yet. Start the conversation!
                                </p>
                            )}
                        </div>

                        {/* Post Comment Form */}
                        <div className="relative">
                            <textarea
                                id="comment-body"
                                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 pb-12 text-sm text-white outline-none transition-colors focus:border-accent"
                                placeholder="Write a message..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        const body = e.target.value;
                                        if (!body.trim()) return;

                                        axios
                                            .post(
                                                `/tasks/${task.id}/comments`,
                                                { body },
                                            )
                                            .then(() => {
                                                e.target.value = "";
                                                // Note: Real-time update is handled by Board.jsx listener
                                            });
                                    }
                                }}
                            />
                            <p className="absolute bottom-3 right-4 text-[9px] font-black uppercase tracking-widest text-muted">
                                Press Enter to send
                            </p>
                        </div>
                    </section>

                    <div className="flex items-center gap-3 border-t border-border pt-4">
                        <Button loading={processing} className="flex-1">
                            Update Task
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                axios
                                    .delete(
                                        `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${task.id}`,
                                        {
                                            headers: {
                                                Accept: "application/json",
                                                "X-Requested-With":
                                                    "XMLHttpRequest",
                                            },
                                        },
                                    )
                                    .then(() => {
                                        onTaskDeleted(task.id);
                                    })
                                    .catch((error) => {
                                        console.error(
                                            "Failed to delete task",
                                            error,
                                        );
                                    });
                            }}
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
