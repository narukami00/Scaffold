import { useEffect, useRef, useState } from "react";
import {
    Calendar,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    Image as ImageIcon,
    Lock,
    Maximize2,
    PanelRightClose,
    Paperclip,
    Plus,
    Send,
    Smile,
    User,
    UserPlus,
    X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import axios from "axios";
import { format } from "date-fns";

const statuses = [
    { value: "backlog", label: "Backlog" },
    { value: "in_progress", label: "In Progress" },
    { value: "in_review", label: "In Review" },
    { value: "done", label: "Done" },
];

const priorities = [
    { value: "low", label: "Low", color: "text-blue-400" },
    { value: "medium", label: "Medium", color: "text-green-400" },
    { value: "high", label: "High", color: "text-amber-400" },
    { value: "urgent", label: "Urgent", color: "text-red-400" },
];

export default function TaskModal({
    workspace,
    project,
    task,
    tasks,
    members,
    isOpen,
    onClose,
    onTaskUpdated,
    onTaskDeleted,
    auth,
}) {
    // ── State & Refs ──────────────────────────────────────────────────────────
    const [data, setDataState] = useState(null);
    const [presence, setPresence] = useState([]);
    const [editorId, setEditorId] = useState(null);
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
    const [requestingAccess, setRequestingAccess] = useState(false);
    const [controlRequests, setControlRequests] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [newChecklistItem, setNewChecklistItem] = useState("");
    const [ghostChecklistItem, setGhostChecklistItem] = useState(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(null); // string URL | null
    const [isLabelPickerOpen, setIsLabelPickerOpen] = useState(false);
    const [showDoneItems, setShowDoneItems] = useState(false);
    const [dependencySearch, setDependencySearch] = useState("");
    const [isDependencyListOpen, setIsDependencyListOpen] = useState(false);

    const channelRef = useRef(null);
    const autoSaveTimerRef = useRef(null);
    const ghostTimerRef = useRef(null);
    const labelPickerRef = useRef(null);

    // ── Data Sync ─────────────────────────────────────────────────────────────
    // Only re-initialize when the *task ID* or open-state changes.
    // Using `task` (object ref) would cause a full reset on every real-time
    // broadcast, wiping any in-progress edits.
    useEffect(() => {
        if (task && isOpen) {
            setDataState({
                title: task.title,
                description: task.description || "",
                status: task.status || "backlog",
                priority: task.priority || "medium",
                due_date: task.due_date || "",
                assignee_id: task.assignee_id || "",
                checklist: task.checklist || [],
                labels: task.labels || [], // full objects for display
                dependencies: task.dependencies?.map((d) => d.id) || [],
                attachments: task.attachments || [],
                comments: task.comments || [],
            });
            // Reset transient UI state for fresh open
            setControlRequests([]);
            setRequestingAccess(false);
            setIsLabelPickerOpen(false);
            setNewChecklistItem("");
            setNewComment("");
        }
    }, [task?.id, isOpen]);

    // ── Presence Channel & Baton Relay ────────────────────────────────────────
    useEffect(() => {
        if (!isOpen || !task) return;

        const channel = window.Echo.join(`task.${task.id}`);
        channelRef.current = channel;

        channel
            .here((users) => {
                setPresence(users);
                const sorted = [...users].sort(
                    (a, b) => a.joined_at - b.joined_at,
                );
                setEditorId(sorted[0]?.id ?? null);
            })
            .joining((user) => {
                setPresence((prev) => [...prev, user]);
            })
            .leaving((user) => {
                setPresence((prev) => {
                    const filtered = prev.filter((u) => u.id !== user.id);
                    // FIFO auto-transfer: if the editor left, next in queue becomes editor
                    setEditorId((curr) => {
                        if (curr === user.id && filtered.length > 0) {
                            const next = [...filtered].sort(
                                (a, b) => a.joined_at - b.joined_at,
                            )[0];
                            return next.id;
                        }
                        if (curr === user.id) return null;
                        return curr;
                    });
                    return filtered;
                });
            })
            .listen(".ControlTransferred", (e) => {
                setEditorId(e.newEditorId);
            })
            // Live checklist ghost-typing from the editor
            .listenForWhisper("typing-checklist", (e) => {
                setGhostChecklistItem(
                    e.text ? { user: e.user, text: e.text } : null,
                );
                if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
                if (e.text) {
                    ghostTimerRef.current = setTimeout(
                        () => setGhostChecklistItem(null),
                        3000,
                    );
                }
            })
            // Viewer whispers a control request to the editor
            .listenForWhisper("request-control", (e) => {
                setControlRequests((prev) =>
                    prev.find((r) => r.id === e.id)
                        ? prev
                        : [...prev, { id: e.id, name: e.user }],
                );
            })
            // Real-time comments posted by others (CommentPosted now also broadcasts on task channel)
            .listen(".CommentPosted", (e) => {
                if (e.comment.task_id === task.id) {
                    setDataState((prev) => {
                        if (!prev) return prev;
                        // Deduplicate: replace any optimistic entry or just append
                        const exists = prev.comments.some(
                            (c) => c.id === e.comment.id,
                        );
                        if (exists) return prev;
                        return {
                            ...prev,
                            comments: [...prev.comments, e.comment],
                        };
                    });
                }
            });

        return () => {
            window.Echo.leave(`task.${task.id}`);
            if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
        };
    }, [isOpen, task?.id]);

    // Close label picker when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (
                labelPickerRef.current &&
                !labelPickerRef.current.contains(e.target)
            ) {
                setIsLabelPickerOpen(false);
            }
        };
        if (isLabelPickerOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isLabelPickerOpen]);

    const isEditor = editorId === auth.user.id;

    // ── AutoSave (1 s debounce, editor only) ──────────────────────────────────
    const autoSave = (newData) => {
        if (!isEditor) return;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            // Labels are stored as full objects locally; server expects IDs
            const payload = {
                ...newData,
                ...(Array.isArray(newData.labels) && {
                    labels: newData.labels.map((l) =>
                        typeof l === "object" ? l.id : l,
                    ),
                }),
            };
            axios
                .patch(
                    `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${task.id}`,
                    payload,
                )
                .then(({ data: res }) => onTaskUpdated(task.id, res.task));
        }, 1000);
    };

    const handleFieldChange = (field, value) => {
        const newData = { ...data, [field]: value };
        setDataState(newData);
        autoSave(newData);
    };

    // ── Labels ────────────────────────────────────────────────────────────────
    const handleLabelToggle = (labelId) => {
        if (!isEditor) return;
        const currentLabels = data.labels || [];
        const isActive = currentLabels.some((l) => l.id === labelId);
        const newLabelObjects = isActive
            ? currentLabels.filter((l) => l.id !== labelId)
            : [
                  ...currentLabels,
                  (workspace.labels || []).find((l) => l.id === labelId),
              ].filter(Boolean);

        setDataState((prev) => ({ ...prev, labels: newLabelObjects }));
        autoSave({ ...data, labels: newLabelObjects });
        setIsLabelPickerOpen(false);
    };

    // ── Comments ──────────────────────────────────────────────────────────────
    const handleCommentSubmit = () => {
        const body = newComment.trim();
        if (!body) return;

        // Optimistic add — shown immediately to the poster
        const optimisticId = `temp-${Date.now()}`;
        const optimistic = {
            id: optimisticId,
            body,
            created_at: new Date().toISOString(),
            user: auth.user,
            user_id: auth.user.id,
            task_id: task.id,
        };
        setDataState((prev) => ({
            ...prev,
            comments: [...(prev.comments || []), optimistic],
        }));
        setNewComment("");

        axios
            .post(`/workspaces/${workspace.slug}/tasks/${task.id}/comments`, {
                body,
            })
            .then(({ data: res }) => {
                // Swap the optimistic entry for the real persisted comment
                setDataState((prev) => ({
                    ...prev,
                    comments: prev.comments.map((c) =>
                        c.id === optimisticId ? res.comment : c,
                    ),
                }));
            })
            .catch(() => {
                // Revert on failure
                setDataState((prev) => ({
                    ...prev,
                    comments: prev.comments.filter(
                        (c) => c.id !== optimisticId,
                    ),
                }));
                setNewComment(body); // Restore input so user can retry
            });
    };

    // ── Baton Control ─────────────────────────────────────────────────────────
    const requestControl = () => {
        if (requestingAccess || !channelRef.current) return;
        channelRef.current.whisper("request-control", {
            user: auth.user.name,
            id: auth.user.id,
        });
        setRequestingAccess(true);
        setTimeout(() => setRequestingAccess(false), 8000);
    };

    const transferControl = (userId) => {
        if (!isEditor) return;
        axios
            .post(
                `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${task.id}/transfer-control`,
                { newEditorId: userId },
            )
            .then(() => setEditorId(userId));
    };

    // ── Dependencies ──────────────────────────────────────────────────────────
    const activeDeps = (tasks || []).filter((t) =>
        data?.dependencies?.includes(t.id),
    );

    const filteredTasks = (tasks || []).filter(
        (t) =>
            t.id !== task?.id &&
            !data?.dependencies?.includes(t.id) &&
            (t.title.toLowerCase().includes(dependencySearch.toLowerCase()) ||
                t.id.toString().includes(dependencySearch) ||
                t.assignee?.name
                    ?.toLowerCase()
                    .includes(dependencySearch.toLowerCase())),
    );

    const toggleDependency = (depId) => {
        if (!isEditor) return;
        const newDeps = data.dependencies?.includes(depId)
            ? data.dependencies.filter((id) => id !== depId)
            : [...(data.dependencies || []), depId];
        handleFieldChange("dependencies", newDeps);
    };

    // ── Attachments ───────────────────────────────────────────────────────────
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        axios
            .post(
                `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${task.id}/attachments`,
                formData,
            )
            .then(({ data: res }) => {
                setDataState((prev) => ({
                    ...prev,
                    attachments: [...(prev.attachments || []), res.attachment],
                }));
            });
        e.target.value = ""; // Reset so the same file can be re-selected
    };

    // ─────────────────────────────────────────────────────────────────────────
    if (!isOpen || !data) return null;

    // Derived checklist segments
    const pendingItems = data.checklist.filter((i) => !i.done);
    const doneItems = data.checklist.filter((i) => i.done);
    const checkedCount = doneItems.length;
    const totalCount = data.checklist.length;
    const progressPct = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal shell */}
            <div className="relative flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-border bg-[#0a0a0b] shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 fade-in duration-300">
                {/* ── HEADER ────────────────────────────────────────────────── */}
                <header className="flex h-20 shrink-0 items-center justify-between border-b border-border/50 px-8">
                    <div className="flex items-center gap-6">
                        {/* Identity tag */}
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">
                                DevSpace Nucleus
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                Ref #{task.id}
                            </span>
                        </div>

                        <div className="h-8 w-px bg-border/50" />

                        {/* Presence avatars */}
                        <div className="flex -space-x-2">
                            {presence.map((user) => (
                                <div
                                    key={user.id}
                                    className={`group relative h-10 w-10 overflow-hidden rounded-full border-2 border-[#0a0a0b] bg-surface ring-2 transition-transform hover:z-10 hover:scale-110 ${
                                        editorId === user.id
                                            ? "ring-accent"
                                            : "ring-border/20"
                                    }`}
                                    title={`${user.name} — ${editorId === user.id ? "Editor" : "Viewer"}`}
                                >
                                    <div
                                        className="flex h-full w-full items-center justify-center text-xs font-black uppercase"
                                        style={{ color: user.color }}
                                    >
                                        {user.name.charAt(0)}
                                    </div>
                                    {/* Give Control overlay on hover (editor only, over other users) */}
                                    {isEditor && user.id !== auth.user.id && (
                                        <button
                                            onClick={() =>
                                                transferControl(user.id)
                                            }
                                            className="absolute inset-0 flex items-center justify-center bg-accent/90 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                            title={`Pass control to ${user.name}`}
                                        >
                                            <UserPlus size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Editor pill */}
                        {editorId && (
                            <span
                                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                                    isEditor
                                        ? "border-accent/30 bg-accent/10 text-accent"
                                        : "border-border/50 bg-surface text-muted"
                                }`}
                            >
                                {isEditor ? "You are editing" : "Read-only"}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Request Control (viewers only) */}
                        {!isEditor && (
                            <Button
                                variant="outline"
                                disabled={requestingAccess}
                                onClick={requestControl}
                                className={`border-accent/20 bg-accent/10 text-accent transition-all hover:bg-accent hover:text-white ${
                                    requestingAccess
                                        ? "cursor-not-allowed opacity-60"
                                        : ""
                                }`}
                            >
                                <Lock size={14} className="mr-2" />
                                {requestingAccess
                                    ? "Request Sent…"
                                    : "Request Control"}
                            </Button>
                        )}

                        {/* Expand side panel (shown only when panel is hidden) */}
                        {!isSidePanelOpen && (
                            <button
                                onClick={() => setIsSidePanelOpen(true)}
                                className="rounded-2xl border border-border bg-surface p-3 text-muted transition-all hover:scale-110 hover:text-white active:scale-95"
                                title="Show Project Stream"
                            >
                                <PanelRightClose size={18} />
                            </button>
                        )}

                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="rounded-2xl border border-border bg-surface p-3 text-muted transition-all hover:scale-110 hover:text-white active:scale-95"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </header>

                {/* ── BODY ──────────────────────────────────────────────────── */}
                <div className="flex flex-1 overflow-hidden">
                    {/* ── MAIN ── The Work ────────────────────────────────── */}
                    <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                        <div className="mx-auto max-w-3xl space-y-12">
                            {/* ▸ Title, Labels & Metadata */}
                            <section className="space-y-6">
                                {/* Label dots + picker */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {(data.labels || []).map((label) => (
                                        <button
                                            key={label.id}
                                            onClick={() =>
                                                isEditor &&
                                                handleLabelToggle(label.id)
                                            }
                                            className={`h-4 w-4 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-[#0a0a0b] transition-all ${
                                                isEditor
                                                    ? "cursor-pointer hover:ring-white/30"
                                                    : "cursor-default"
                                            }`}
                                            style={{
                                                backgroundColor: label.color,
                                            }}
                                            title={`${label.name}${isEditor ? " — click to remove" : ""}`}
                                        />
                                    ))}

                                    {isEditor && (
                                        <div
                                            className="relative"
                                            ref={labelPickerRef}
                                        >
                                            <button
                                                onClick={() =>
                                                    setIsLabelPickerOpen(
                                                        (o) => !o,
                                                    )
                                                }
                                                className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border text-muted transition-all hover:border-accent hover:text-accent"
                                                title="Add a label"
                                            >
                                                <Plus size={12} />
                                            </button>

                                            {isLabelPickerOpen && (
                                                <div className="absolute left-0 top-8 z-20 min-w-[200px] rounded-2xl border border-border bg-surface p-2 shadow-2xl animate-in slide-in-from-top-2 duration-200">
                                                    {(workspace.labels || [])
                                                        .length === 0 ? (
                                                        <p className="px-3 py-3 text-[10px] text-muted">
                                                            No labels defined in
                                                            this workspace.
                                                        </p>
                                                    ) : (
                                                        (
                                                            workspace.labels ||
                                                            []
                                                        ).map((label) => {
                                                            const active = (
                                                                data.labels ||
                                                                []
                                                            ).some(
                                                                (l) =>
                                                                    l.id ===
                                                                    label.id,
                                                            );
                                                            return (
                                                                <button
                                                                    key={
                                                                        label.id
                                                                    }
                                                                    onClick={() =>
                                                                        handleLabelToggle(
                                                                            label.id,
                                                                        )
                                                                    }
                                                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-colors hover:bg-white/5 ${active ? "text-white" : "text-muted"}`}
                                                                >
                                                                    <span
                                                                        className="h-3 w-3 flex-shrink-0 rounded-full"
                                                                        style={{
                                                                            backgroundColor:
                                                                                label.color,
                                                                        }}
                                                                    />
                                                                    {label.name}
                                                                    {active && (
                                                                        <span className="ml-auto text-[10px] text-accent">
                                                                            ✓
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <input
                                    className={`w-full border-none bg-transparent p-0 text-5xl font-black tracking-tight text-white outline-none placeholder:text-muted/20 ${!isEditor ? "pointer-events-none opacity-80" : ""}`}
                                    value={data.title}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            "title",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="The Grand Task Name…"
                                    readOnly={!isEditor}
                                />

                                {/* Status, Priority, Due Date, Assignee */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <select
                                        className={`rounded-2xl border border-border bg-surface px-4 py-2 text-xs font-black uppercase tracking-widest text-white outline-none transition-colors focus:border-accent ${!isEditor ? "pointer-events-none opacity-60" : ""}`}
                                        value={data.status}
                                        onChange={(e) =>
                                            handleFieldChange(
                                                "status",
                                                e.target.value,
                                            )
                                        }
                                        disabled={!isEditor}
                                    >
                                        {statuses.map((s) => (
                                            <option
                                                key={s.value}
                                                value={s.value}
                                            >
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        className={`rounded-2xl border border-border bg-surface px-4 py-2 text-xs font-black uppercase tracking-widest text-white outline-none transition-colors focus:border-accent ${!isEditor ? "pointer-events-none opacity-60" : ""}`}
                                        value={data.priority}
                                        onChange={(e) =>
                                            handleFieldChange(
                                                "priority",
                                                e.target.value,
                                            )
                                        }
                                        disabled={!isEditor}
                                    >
                                        {priorities.map((p) => (
                                            <option
                                                key={p.value}
                                                value={p.value}
                                            >
                                                {p.label}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Due date */}
                                    <div
                                        className={`flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 ${!isEditor ? "opacity-60" : ""}`}
                                    >
                                        <Calendar
                                            size={13}
                                            className="text-muted"
                                        />
                                        <input
                                            type="date"
                                            className={`bg-transparent text-xs font-bold text-white outline-none ${!isEditor ? "pointer-events-none" : ""}`}
                                            value={data.due_date || ""}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    "due_date",
                                                    e.target.value,
                                                )
                                            }
                                            disabled={!isEditor}
                                        />
                                    </div>

                                    {/* Assignee */}
                                    <div
                                        className={`flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 ${!isEditor ? "opacity-60" : ""}`}
                                    >
                                        <User
                                            size={13}
                                            className="text-muted"
                                        />
                                        <select
                                            className={`bg-transparent text-xs font-bold text-white outline-none ${!isEditor ? "pointer-events-none" : ""}`}
                                            value={data.assignee_id || ""}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    "assignee_id",
                                                    e.target.value || null,
                                                )
                                            }
                                            disabled={!isEditor}
                                        >
                                            <option value="">Unassigned</option>
                                            {(members || []).map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* ▸ Description */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                    <ChevronRight
                                        size={14}
                                        className="text-accent"
                                    />
                                    Description
                                </div>
                                <textarea
                                    className={`min-h-[200px] w-full resize-none rounded-3xl border border-border bg-surface/50 p-6 text-base leading-relaxed text-white outline-none transition-all focus:border-accent focus:bg-surface ${!isEditor ? "pointer-events-none opacity-80" : ""}`}
                                    value={data.description}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            "description",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Describe the mission details here…"
                                    readOnly={!isEditor}
                                />
                            </section>

                            {/* ▸ Checklist */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                        <CheckCircle2
                                            size={14}
                                            className="text-accent"
                                        />
                                        Checklist
                                    </div>
                                    {totalCount > 0 && (
                                        <span className="text-[10px] font-black text-muted">
                                            {checkedCount}/{totalCount} Complete
                                        </span>
                                    )}
                                </div>

                                {/* Progress bar */}
                                {totalCount > 0 && (
                                    <div className="h-1 w-full overflow-hidden rounded-full bg-border/50">
                                        <div
                                            className="h-full rounded-full bg-accent transition-all duration-500"
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {/* Pending items */}
                                    {pendingItems.map((item) => {
                                        const idx =
                                            data.checklist.indexOf(item);
                                        return (
                                            <div
                                                key={idx}
                                                className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-surface/30 p-4 transition-all hover:border-accent/30 hover:bg-surface"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={false}
                                                    disabled={!isEditor}
                                                    onChange={() => {
                                                        const newList =
                                                            data.checklist.map(
                                                                (it, i) =>
                                                                    i === idx
                                                                        ? {
                                                                              ...it,
                                                                              done: true,
                                                                          }
                                                                        : it,
                                                            );
                                                        handleFieldChange(
                                                            "checklist",
                                                            newList,
                                                        );
                                                    }}
                                                    className="h-5 w-5 flex-shrink-0 rounded border-border bg-transparent text-accent ring-offset-0 focus:ring-0"
                                                />
                                                <span className="flex-1 text-sm font-bold text-white">
                                                    {item.text}
                                                </span>
                                                {isEditor && (
                                                    <button
                                                        onClick={() => {
                                                            const newList =
                                                                data.checklist.filter(
                                                                    (_, i) =>
                                                                        i !==
                                                                        idx,
                                                                );
                                                            handleFieldChange(
                                                                "checklist",
                                                                newList,
                                                            );
                                                        }}
                                                        className="text-muted opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* New item input (editor only, with live whisper) */}
                                    {isEditor && (
                                        <div className="relative">
                                            <input
                                                className="w-full rounded-2xl border border-dashed border-border/50 bg-transparent px-12 py-4 text-sm font-bold text-white outline-none transition-all focus:border-accent focus:bg-surface"
                                                placeholder="Enter a new checkpoint…"
                                                value={newChecklistItem}
                                                onChange={(e) => {
                                                    setNewChecklistItem(
                                                        e.target.value,
                                                    );
                                                    channelRef.current?.whisper(
                                                        "typing-checklist",
                                                        {
                                                            user: auth.user
                                                                .name,
                                                            text: e.target
                                                                .value,
                                                        },
                                                    );
                                                }}
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === "Enter" &&
                                                        newChecklistItem.trim()
                                                    ) {
                                                        const newList = [
                                                            ...data.checklist,
                                                            {
                                                                text: newChecklistItem.trim(),
                                                                done: false,
                                                            },
                                                        ];
                                                        handleFieldChange(
                                                            "checklist",
                                                            newList,
                                                        );
                                                        setNewChecklistItem("");
                                                        channelRef.current?.whisper(
                                                            "typing-checklist",
                                                            {
                                                                user: auth.user
                                                                    .name,
                                                                text: "",
                                                            },
                                                        );
                                                    }
                                                }}
                                            />
                                            <Plus
                                                size={18}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                                            />
                                        </div>
                                    )}

                                    {/* Ghost item — live typing indicator for viewers */}
                                    {ghostChecklistItem?.text && (
                                        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-accent/30 bg-accent/5 p-4 animate-pulse">
                                            <div className="h-5 w-5 flex-shrink-0 rounded border border-accent/30 bg-transparent" />
                                            <span className="text-sm font-bold text-accent/70">
                                                {ghostChecklistItem.user} is
                                                typing:{" "}
                                                {ghostChecklistItem.text}
                                            </span>
                                        </div>
                                    )}

                                    {/* Completed items — collapsible */}
                                    {doneItems.length > 0 && (
                                        <div className="space-y-2">
                                            <button
                                                onClick={() =>
                                                    setShowDoneItems((o) => !o)
                                                }
                                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted transition-colors hover:text-white"
                                            >
                                                <ChevronDown
                                                    size={12}
                                                    className={`transition-transform ${showDoneItems ? "" : "-rotate-90"}`}
                                                />
                                                {doneItems.length} completed
                                                item
                                                {doneItems.length > 1
                                                    ? "s"
                                                    : ""}
                                            </button>

                                            {showDoneItems &&
                                                doneItems.map((item) => {
                                                    const idx =
                                                        data.checklist.indexOf(
                                                            item,
                                                        );
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="group flex items-center gap-4 rounded-2xl border border-border/30 bg-surface/10 p-4 transition-all hover:border-border/50"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={true}
                                                                disabled={
                                                                    !isEditor
                                                                }
                                                                onChange={() => {
                                                                    const newList =
                                                                        data.checklist.map(
                                                                            (
                                                                                it,
                                                                                i,
                                                                            ) =>
                                                                                i ===
                                                                                idx
                                                                                    ? {
                                                                                          ...it,
                                                                                          done: false,
                                                                                      }
                                                                                    : it,
                                                                        );
                                                                    handleFieldChange(
                                                                        "checklist",
                                                                        newList,
                                                                    );
                                                                }}
                                                                className="h-5 w-5 flex-shrink-0 rounded border-border bg-transparent text-accent ring-offset-0 focus:ring-0"
                                                            />
                                                            <span className="flex-1 text-sm font-bold text-muted line-through">
                                                                {item.text}
                                                            </span>
                                                            {isEditor && (
                                                                <button
                                                                    onClick={() => {
                                                                        const newList =
                                                                            data.checklist.filter(
                                                                                (
                                                                                    _,
                                                                                    i,
                                                                                ) =>
                                                                                    i !==
                                                                                    idx,
                                                                            );
                                                                        handleFieldChange(
                                                                            "checklist",
                                                                            newList,
                                                                        );
                                                                    }}
                                                                    className="text-muted opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                                                                >
                                                                    <X
                                                                        size={
                                                                            14
                                                                        }
                                                                    />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ▸ Blockers (Dependencies) — own section, outside checklist */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                        <Lock
                                            size={14}
                                            className="text-accent"
                                        />
                                        Blockers
                                    </div>
                                    {isEditor && (
                                        <button
                                            onClick={() =>
                                                setIsDependencyListOpen(
                                                    (o) => !o,
                                                )
                                            }
                                            className="text-[10px] font-black uppercase text-accent hover:underline"
                                        >
                                            {isDependencyListOpen
                                                ? "Close Picker"
                                                : "+ Add Blocker"}
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {activeDeps.length === 0 &&
                                        !isDependencyListOpen && (
                                            <p className="text-[11px] text-muted/40">
                                                No blockers assigned.
                                            </p>
                                        )}
                                    {activeDeps.map((dep) => (
                                        <div
                                            key={dep.id}
                                            className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-400"
                                        >
                                            <span className="opacity-60">
                                                #{dep.id}
                                            </span>
                                            <span className="max-w-[150px] truncate">
                                                {dep.title}
                                            </span>
                                            {isEditor && (
                                                <button
                                                    onClick={() =>
                                                        toggleDependency(dep.id)
                                                    }
                                                    className="ml-1 transition-colors hover:text-white"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {isDependencyListOpen && isEditor && (
                                    <div className="space-y-4 rounded-3xl border border-border bg-surface p-6 animate-in slide-in-from-top-4 duration-300">
                                        <div className="relative">
                                            <input
                                                className="w-full rounded-2xl border border-border bg-[#0a0a0b] px-10 py-3 text-sm font-bold text-white outline-none focus:border-accent"
                                                placeholder="Search by title, ID, or assignee…"
                                                value={dependencySearch}
                                                onChange={(e) =>
                                                    setDependencySearch(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <Maximize2
                                                size={16}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                                            />
                                        </div>
                                        <div className="max-h-60 space-y-1 overflow-y-auto custom-scrollbar">
                                            {filteredTasks.length === 0 ? (
                                                <p className="px-3 py-4 text-center text-xs text-muted">
                                                    No matching tasks found.
                                                </p>
                                            ) : (
                                                filteredTasks.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() =>
                                                            toggleDependency(
                                                                t.id,
                                                            )
                                                        }
                                                        className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-white/5"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-white">
                                                                #{t.id}{" "}
                                                                {t.title}
                                                            </span>
                                                            <span className="text-[10px] uppercase tracking-wider text-muted">
                                                                {t.assignee
                                                                    ?.name ||
                                                                    "Unassigned"}{" "}
                                                                · {t.status}
                                                            </span>
                                                        </div>
                                                        <Plus
                                                            size={16}
                                                            className="flex-shrink-0 text-muted"
                                                        />
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    </main>

                    {/* ── ASIDE ── Project Stream ──────────────────────────── */}
                    {isSidePanelOpen && (
                        <aside className="flex w-96 shrink-0 flex-col border-l border-border">
                            {/* Panel header */}
                            <div className="flex h-14 items-center justify-between border-b border-border/50 px-6">
                                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                                    Project Stream
                                </span>
                                <button
                                    onClick={() => setIsSidePanelOpen(false)}
                                    className="rounded-lg p-1.5 text-muted transition-colors hover:text-white"
                                    title="Collapse panel"
                                >
                                    <PanelRightClose size={16} />
                                </button>
                            </div>

                            {/* Feed */}
                            <div className="flex-1 space-y-6 overflow-y-auto p-6 custom-scrollbar">
                                {/* Attachments */}
                                {(data.attachments || []).length > 0 && (
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                                            Project Assets
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {data.attachments.map((file) => (
                                                <button
                                                    key={file.id}
                                                    onClick={() =>
                                                        setIsLightboxOpen(
                                                            file.url ||
                                                                `/storage/${file.file_path}`,
                                                        )
                                                    }
                                                    className="group flex items-center gap-2 rounded-xl border border-border/50 bg-surface/30 px-3 py-2 text-[10px] font-bold text-muted transition-all hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
                                                >
                                                    <ImageIcon size={14} />
                                                    <span className="max-w-[120px] truncate">
                                                        {file.file_name}
                                                    </span>
                                                    <Maximize2
                                                        size={10}
                                                        className="opacity-0 transition-opacity group-hover:opacity-100"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Comments */}
                                {data.comments.length === 0 && (
                                    <p className="py-8 text-center text-xs text-muted/40">
                                        No messages yet.
                                        <br />
                                        Be the first to broadcast.
                                    </p>
                                )}
                                {data.comments.map((comment) => (
                                    <div
                                        key={comment.id}
                                        className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/20 bg-surface text-[10px] font-black text-accent">
                                                {comment.user?.name?.charAt(
                                                    0,
                                                ) ?? "?"}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-white">
                                                {comment.user?.name ??
                                                    "Unknown"}
                                            </span>
                                            <span className="text-[9px] text-muted">
                                                {format(
                                                    new Date(
                                                        comment.created_at,
                                                    ),
                                                    "HH:mm",
                                                )}
                                            </span>
                                            {/* Optimistic indicator */}
                                            {String(comment.id).startsWith(
                                                "temp-",
                                            ) && (
                                                <span className="ml-auto text-[9px] text-muted/50 italic">
                                                    Sending…
                                                </span>
                                            )}
                                        </div>
                                        <div className="rounded-2xl border border-border/50 bg-surface/30 px-4 py-3 text-xs leading-relaxed text-white/70 shadow-sm">
                                            {comment.body}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Comment input */}
                            <div className="p-6 pt-0">
                                <div className="relative rounded-3xl border border-border bg-surface p-4 transition-all focus-within:border-accent">
                                    <textarea
                                        className="w-full resize-none bg-transparent pb-10 text-xs text-white outline-none placeholder:text-muted/50"
                                        placeholder="Broadcast a message…"
                                        rows={2}
                                        value={newComment}
                                        onChange={(e) =>
                                            setNewComment(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" &&
                                                !e.shiftKey
                                            ) {
                                                e.preventDefault();
                                                handleCommentSubmit();
                                            }
                                        }}
                                    />
                                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                        <label className="cursor-pointer text-muted transition-colors hover:text-accent">
                                            <Paperclip size={16} />
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                            />
                                        </label>
                                        <button className="text-muted transition-colors hover:text-accent">
                                            <Smile size={16} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleCommentSubmit}
                                        disabled={!newComment.trim()}
                                        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/20 transition-all hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>

            {/* ── Control Request Toast (visible to editor only) ─────────── */}
            {isEditor && controlRequests.length > 0 && (
                <div className="absolute bottom-8 right-8 z-[150] flex flex-col gap-2">
                    {controlRequests.map((req) => (
                        <div
                            key={req.id}
                            className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-[#0d0d0f] px-4 py-3 shadow-2xl shadow-black/60 animate-in slide-in-from-right-4 duration-300"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-xs font-black text-accent">
                                {req.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-white">
                                    {req.name}
                                </span>
                                <span className="text-[10px] text-muted">
                                    Requesting control
                                </span>
                            </div>
                            <div className="ml-2 flex gap-2">
                                <button
                                    onClick={() => {
                                        transferControl(req.id);
                                        setControlRequests((prev) =>
                                            prev.filter((r) => r.id !== req.id),
                                        );
                                    }}
                                    className="rounded-xl bg-accent px-3 py-1.5 text-[10px] font-black text-white transition-all hover:scale-105 active:scale-95"
                                >
                                    Give
                                </button>
                                <button
                                    onClick={() =>
                                        setControlRequests((prev) =>
                                            prev.filter((r) => r.id !== req.id),
                                        )
                                    }
                                    className="rounded-xl border border-border px-3 py-1.5 text-[10px] font-black text-muted transition-all hover:text-white"
                                >
                                    Deny
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Lightbox ──────────────────────────────────────────────────── */}
            {isLightboxOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 animate-in fade-in duration-200"
                    onClick={() => setIsLightboxOpen(null)}
                >
                    <button
                        className="absolute right-6 top-6 z-10 rounded-2xl border border-white/10 bg-white/5 p-3 text-white transition-all hover:bg-white/10 hover:scale-110"
                        onClick={() => setIsLightboxOpen(null)}
                    >
                        <X size={20} />
                    </button>
                    <img
                        src={isLightboxOpen}
                        alt="Attachment preview"
                        className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
