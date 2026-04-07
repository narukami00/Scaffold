import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Lock, Calendar, ExternalLink } from "lucide-react";

const PRIORITY_COLORS = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
};

const STATUS_CONFIG = {
    backlog:     { label: "Backlog",     color: "text-muted",         ring: "border-border" },
    in_progress: { label: "In Progress", color: "text-[#40c8ff]",     ring: "border-[#40c8ff]/30" },
    in_review:   { label: "In Review",   color: "text-[#ffa040]",     ring: "border-[#ffa040]/30" },
    done:        { label: "Done",        color: "text-[#4fffb0]",     ring: "border-emerald-500/20" },
};

export default memo(function TaskNode({ data }) {
    const { task, onTaskClick } = data;

    const isBlocked = task.dependencies?.some((d) => d.status !== "done");
    const isDone = task.status === "done";
    const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.backlog;

    return (
        <div
            className={`
                group relative w-[260px] rounded-3xl border p-4 shadow-xl
                transition-all duration-200 select-none cursor-pointer
                ${isDone
                    ? "border-emerald-500/20 bg-emerald-500/[0.05] shadow-[0_12px_30px_rgba(16,185,129,0.08)]"
                    : "border-border bg-surface hover:border-accent/50 hover:shadow-[0_0_24px_rgba(124,106,255,0.12)]"
                }
                ${isBlocked ? "opacity-40 grayscale hover:grayscale-0 hover:opacity-100" : ""}
            `}
        >
            {/* Incoming dependency handle — top centre */}
            <Handle
                type="target"
                position={Position.Top}
                style={{
                    background: "#7c6aff",
                    border: "2px solid #0a0a0b",
                    width: 12,
                    height: 12,
                    top: -6,
                }}
            />

            {/* ── Card body ── */}
            <div className="space-y-3">

                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                    <h4 className={`
                        line-clamp-2 flex-1 text-sm font-bold leading-snug transition-colors
                        ${isDone ? "text-white/70" : "text-white group-hover:text-accent"}
                    `}>
                        {task.title}
                    </h4>

                    <div className="flex shrink-0 items-center gap-1.5">
                        {isBlocked && (
                            <Lock size={12} className="text-red-400/80" />
                        )}
                        {isDone ? (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                                Done
                            </span>
                        ) : (
                            <div className={`h-6 w-1.5 rounded-full ${PRIORITY_COLORS[task.priority] ?? "bg-blue-500"}`} />
                        )}
                    </div>
                </div>

                {/* Meta row */}
                <div className={`flex items-center justify-between border-t pt-2.5 ${isDone ? "border-emerald-400/10" : "border-border/40"}`}>
                    <div className="flex items-center gap-2">
                        {/* Assignee avatar */}
                        <div className={`
                            flex h-6 w-6 items-center justify-center rounded-full border-2
                            text-[9px] font-black uppercase shadow-sm
                            ${isDone
                                ? "border-emerald-900 bg-emerald-300 text-emerald-950"
                                : "border-surface bg-accent text-black"
                            }
                        `}>
                            {task.assignee?.name?.substring(0, 2) ?? "??"}
                        </div>

                        {/* Due date */}
                        {task.due_date && (
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted">
                                <Calendar size={10} className={isDone ? "text-emerald-300" : "text-accent"} />
                                {new Date(task.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </div>
                        )}
                    </div>

                    {/* Status badge */}
                    <span className={`text-[9px] font-black uppercase tracking-[0.18em] ${statusCfg.color}`}>
                        {statusCfg.label}
                    </span>
                </div>

                {/* Open button — appears on hover */}
                <button
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task.id); }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/0 bg-transparent py-1
                               text-[10px] font-black uppercase tracking-widest text-muted/0
                               transition-all group-hover:border-border/60 group-hover:bg-surface2/60 group-hover:text-muted
                               hover:!text-accent hover:!border-accent/40"
                >
                    <ExternalLink size={10} />
                    Open
                </button>
            </div>

            {/* Outgoing dependency handle — bottom centre */}
            <Handle
                type="source"
                position={Position.Bottom}
                style={{
                    background: "#7c6aff",
                    border: "2px solid #0a0a0b",
                    width: 12,
                    height: 12,
                    bottom: -6,
                }}
            />
        </div>
    );
});
