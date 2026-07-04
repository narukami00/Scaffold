import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Lock, Calendar, ExternalLink, Trash2 } from "lucide-react";
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

const PRIORITY_COLORS = {
    urgent: "bg-red-700",
    high: "bg-amber-600",
    medium: "bg-yellow-600",
    low: "bg-blue-600",
};

const STATUS_CONFIG = {
    backlog: {
        label: "Backlog",
        color: "text-[#1a5f8a]",
    },
    in_progress: {
        label: "In Progress",
        color: "text-[#b45309]",
    },
    in_review: {
        label: "In Review",
        color: "text-[#7c5c1e]",
    },
    done: {
        label: "Done",
        color: "text-[#2d6a4f]",
    },
};

export default memo(function TaskNode({ data }) {
    const {
        task,
        onTaskClick,
        isLocked,
        occupantName,
        occupantColor,
        isRecent,
        isDeleting,
        onTaskDelete,
        density,
        workspace,
    } = data;

    const isMinimal = density === "minimal";

    const isBlocked = data.isBlocked ?? false;
    const isDone = task.status === "done";
    const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.backlog;

    return (
        <div
            className={`
                group relative ${isMinimal ? "min-h-[105px]" : "min-h-[188px]"} w-[240px] rounded-3xl border p-4 shadow-md sm:w-[260px]
                cursor-pointer select-none transition-all duration-200
                ${isBlocked ? "opacity-60" : ""}
                ${isLocked ? "opacity-90" : ""}
                ${isRecent ? "task-pop-in" : ""}
                ${isDeleting ? "task-pop-out pointer-events-none" : ""}
            `}
            style={{
                borderColor: isLocked ? occupantColor : (isDone ? "rgba(45,106,79,0.25)" : C.border),
                background: isDone ? "rgba(45,106,79,0.03)" : C.card,
                boxShadow: isLocked 
                    ? `0 0 20px ${occupantColor}44` 
                    : (isDone ? "0 4px 12px rgba(45,106,79,0.05)" : "0 4px 12px rgba(139,94,60,0.06)"),
            }}
            onMouseEnter={e => {
                if (!isLocked) {
                    e.currentTarget.style.borderColor = isDone ? "rgba(45,106,79,0.45)" : "rgba(139,94,60,0.4)";
                    e.currentTarget.style.boxShadow = isDone ? "0 6px 16px rgba(45,106,79,0.08)" : "0 6px 16px rgba(139,94,60,0.12)";
                }
            }}
            onMouseLeave={e => {
                if (!isLocked) {
                    e.currentTarget.style.borderColor = isDone ? "rgba(45,106,79,0.25)" : C.border;
                    e.currentTarget.style.boxShadow = isDone ? "0 4px 12px rgba(45,106,79,0.05)" : "0 4px 12px rgba(139,94,60,0.06)";
                }
            }}
            title={isLocked ? `${occupantName} is editing...` : ""}
        >
            {/* Presence Badge (Locking User) */}
            {isLocked && (
                <div
                    className="absolute -top-3 -left-2 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-lg animate-in zoom-in duration-300"
                    style={{ backgroundColor: occupantColor }}
                >
                    <Lock size={10} strokeWidth={3} />
                    {occupantName}
                </div>
            )}

            {!isLocked && onTaskDelete && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onTaskDelete(task.id);
                    }}
                    className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border opacity-0 shadow-md transition-all hover:bg-[#c0392b] hover:text-white group-hover:opacity-100"
                    style={{ borderColor: "rgba(192,57,43,0.25)", background: C.card, color: "#c0392b" }}
                    title="Delete task"
                >
                    <Trash2 size={14} />
                </button>
            )}

            {/* Incoming dependency handle — top centre */}
            <Handle
                type="target"
                position={Position.Top}
                style={{
                    background: C.brown,
                    border: `2px solid ${C.card}`,
                    width: 12,
                    height: 12,
                    top: -6,
                }}
            />

            {/* ── Card body ── */}
            {isMinimal ? (
                <div className="space-y-3.5">
                    {/* Labels */}
                    {(task.labels || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-0.5">
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
                    {/* Minimalist layout */}
                    <div className="flex items-start justify-between gap-3">
                        <h4
                            className="line-clamp-2 flex-1 text-sm font-bold leading-snug transition-colors"
                            style={{
                                color: C.navy,
                                textDecoration: isDone ? "line-through" : "none",
                                opacity: isDone ? 0.6 : 1
                            }}
                        >
                            {task.title}
                        </h4>
                        {!isDone && (
                            <div
                                className={`h-4 w-1.5 shrink-0 rounded-full ${PRIORITY_COLORS[task.priority] ?? "bg-blue-600"}`}
                            />
                        )}
                    </div>
                    <div
                        className="flex items-center justify-between border-t pt-2"
                        style={{ borderColor: isDone ? "rgba(45,106,79,0.12)" : C.border }}
                    >
                        <span
                            className={`text-[9px] font-black uppercase tracking-[0.18em] ${statusCfg.color}`}
                        >
                            {statusCfg.label}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isLocked) {
                                    onTaskClick(task.id);
                                }
                            }}
                            disabled={isLocked}
                            className="flex items-center gap-1 rounded-xl border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest transition-all duration-150 text-slate-500 hover:text-[#8b5e3c]"
                            style={{
                                background: "rgba(139,94,60,0.05)",
                                borderColor: C.border
                            }}
                            onMouseEnter={e => {
                                if (!isLocked) {
                                    e.currentTarget.style.borderColor = C.brown;
                                    e.currentTarget.style.background = "rgba(139,94,60,0.1)";
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isLocked) {
                                    e.currentTarget.style.borderColor = C.border;
                                    e.currentTarget.style.background = "rgba(139,94,60,0.05)";
                                }
                            }}
                        >
                            <ExternalLink size={10} />
                            Open
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Labels */}
                    {(task.labels || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-0.5">
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
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3">
                        <h4
                            className="line-clamp-2 flex-1 text-sm font-bold leading-snug transition-colors"
                            style={{
                                color: C.navy,
                                textDecoration: isDone ? "line-through" : "none",
                                opacity: isDone ? 0.6 : 1
                            }}
                        >
                            {task.title}
                        </h4>

                        <div className="flex shrink-0 items-center gap-1.5">
                            {isBlocked && (
                                <Lock size={12} style={{ color: "#c0392b" }} />
                            )}
                            {isDone ? (
                                <span className="rounded border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em]"
                                    style={{ color: "#2d6a4f", background: "rgba(45,106,79,0.1)", borderColor: "rgba(45,106,79,0.2)" }}>
                                    Done
                                </span>
                            ) : (
                                <div
                                    className={`h-6 w-1.5 rounded-full ${PRIORITY_COLORS[task.priority] ?? "bg-blue-600"}`}
                                />
                            )}
                        </div>
                    </div>

                    {/* Meta row */}
                    <div
                        className="flex items-center justify-between border-t pt-2.5"
                        style={{ borderColor: isDone ? "rgba(45,106,79,0.12)" : C.border }}
                    >
                        <div className="flex items-center gap-2">
                            {/* Assignee avatar */}
                            {task.assignee ? (
                                <Link
                                    href={workspace ? `/workspaces/${workspace.slug}/members/${task.assignee.id}` : "#"}
                                    className="hover:scale-105 active:scale-95 transition-all shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {task.assignee.avatar_path ? (
                                        <img src={task.assignee.avatar_path} alt={task.assignee.name} className="h-6 w-6 rounded-full object-cover border border-black/5" />
                                    ) : (
                                        <div
                                            className="flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-black uppercase shadow-sm"
                                            style={{
                                                borderColor: isDone ? "rgba(45,106,79,0.2)" : C.border,
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
                                    className="flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-black uppercase shadow-sm"
                                    style={{
                                        borderColor: C.border,
                                        background: "rgba(139,94,60,0.05)",
                                        color: C.muted
                                    }}
                                >
                                    --
                                </div>
                            )}

                            {/* Due date */}
                            {task.due_date && (
                                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
                                    style={{ color: C.muted }}>
                                    <Calendar
                                        size={10}
                                        style={{ color: isDone ? "#2d6a4f" : C.brown }}
                                    />
                                    {new Date(task.due_date).toLocaleDateString(
                                        [],
                                        { month: "short", day: "numeric" },
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Status badge */}
                        <span
                            className={`text-[9px] font-black uppercase tracking-[0.18em] ${statusCfg.color}`}
                        >
                            {statusCfg.label}
                        </span>
                    </div>

                    {/* Open button — appears on hover (if not locked) */}
                    <div className="pt-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isLocked) {
                                    onTaskClick(task.id);
                                }
                            }}
                            disabled={isLocked}
                            className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-1 text-[10px] font-black uppercase tracking-widest transition-all duration-150 ${
                                isLocked
                                    ? "border-transparent bg-transparent text-transparent opacity-0"
                                    : "border-transparent text-slate-500 hover:text-[#8b5e3c]"
                            }`}
                            style={{
                                background: isLocked ? "transparent" : "rgba(139,94,60,0.05)",
                                border: isLocked ? "none" : `1px solid ${C.border}`
                            }}
                            onMouseEnter={e => {
                                if (!isLocked) {
                                    e.currentTarget.style.borderColor = C.brown;
                                    e.currentTarget.style.background = "rgba(139,94,60,0.1)";
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isLocked) {
                                    e.currentTarget.style.borderColor = C.border;
                                    e.currentTarget.style.background = "rgba(139,94,60,0.05)";
                                }
                            }}
                        >
                            <ExternalLink size={10} />
                            Open
                        </button>
                    </div>
                </div>
            )}

            {/* Outgoing dependency handle — bottom centre */}
            <Handle
                type="source"
                position={Position.Bottom}
                style={{
                    background: C.brown,
                    border: `2px solid ${C.card}`,
                    width: 12,
                    height: 12,
                    bottom: -6,
                }}
            />
        </div>
    );
});
