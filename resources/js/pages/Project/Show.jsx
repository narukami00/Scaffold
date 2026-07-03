import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, router, Link } from "@inertiajs/react";
import ProjectHeader from "@/components/project/ProjectHeader";
import { useState, useEffect } from "react";
import {
    Calendar,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Clock,
    CheckSquare,
    Users,
    Inbox,
    Eye,
    CheckCircle2
} from "lucide-react";

// ── Palette tokens ────────────────────────────────────────────────────────────
const C = {
    bg:      "#ede0c8",
    card:    "#f3e4c9",
    navy:    "#0a2947",
    brown:   "#8b5e3c",
    sage:    "#d3d4c0",
    border:  "rgba(139,94,60,0.18)",
    borderHover: "rgba(139,94,60,0.4)",
    muted:   "rgba(10,41,71,0.68)",
    faint:   "rgba(10,41,71,0.25)",
};

const PRIORITY_COLORS = {
    urgent: "text-red-700 bg-red-500/10 border-red-500/20",
    high: "text-amber-700 bg-amber-500/10 border-amber-500/20",
    medium: "text-yellow-700 bg-yellow-500/10 border-yellow-500/20",
    low: "text-blue-700 bg-blue-500/10 border-blue-500/20",
};

// Status semantic colors (warm tones, no neon)
const STATUS_CFG = {
    backlog:     { label: "Backlog",     color: "text-[#1a5f8a]", bg: "rgba(26,95,138,0.1)",  border: "rgba(26,95,138,0.2)",  icon: Inbox },
    in_progress: { label: "In Progress", color: "text-[#b45309]", bg: "rgba(180,83,9,0.1)",   border: "rgba(180,83,9,0.2)",   icon: Clock },
    in_review:   { label: "In Review",   color: "text-[#7c5c1e]", bg: "rgba(124,92,30,0.1)",  border: "rgba(124,92,30,0.2)",  icon: Eye },
    done:        { label: "Done",        color: "text-[#2d6a4f]", bg: "rgba(45,106,79,0.1)",  border: "rgba(45,106,79,0.2)",  icon: CheckCircle2 },
};

// ── Reusable card shell ───────────────────────────────────────────────────────
function Card({ children, className = "", style = {} }) {
    return (
        <div
            className={`rounded-2xl p-6 ${className}`}
            style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(139,94,60,0.07)", ...style }}
        >
            {children}
        </div>
    );
}

// ── Section label ─────────────────────────────────────────────────────────────
function Label({ children }) {
    return (
        <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-3"
            style={{ color: "rgba(139,94,60,0.65)" }}>
            {children}
        </p>
    );
}

// ── Horizontal priority pill bar ──────────────────────────────────────────────
function PriorityBars({ priority_counts }) {
    const bars = [
        { label: "Urgent", count: priority_counts.urgent, color: "#c0392b" },
        { label: "High",   count: priority_counts.high,   color: "#b45309" },
        { label: "Medium", count: priority_counts.medium, color: "#7c5c1e" },
        { label: "Low",    count: priority_counts.low,    color: "#1a5f8a" },
    ];
    const max = Math.max(...bars.map(b => b.count), 1);
    return (
        <div className="space-y-3">
            {bars.map(b => (
                <div key={b.label} className="flex items-center gap-3">
                    <span className="w-14 text-[10px] font-bold uppercase tracking-wider shrink-0"
                        style={{ color: b.color }}>{b.label}</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(139,94,60,0.1)" }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${(b.count / max) * 100}%`, background: b.color, opacity: 0.75 }}
                        />
                    </div>
                    <span className="w-6 text-right text-xs font-bold shrink-0" style={{ color: C.muted }}>{b.count}</span>
                </div>
            ))}
        </div>
    );
}

export default function Show({ workspace, project, stats }) {
    const [expandedMemberId, setExpandedMemberId] = useState(null);

    const toggleMemberExpand = (memberId) => {
        setExpandedMemberId((prev) => (prev === memberId ? null : memberId));
    };

    // Real-time synchronization
    useEffect(() => {
        const channel = window.Echo.join(`project.${project.id}`);

        channel
            .listen(".TaskUpdated", () => {
                router.reload({ preserveScroll: true });
            })
            .listen(".TaskDeleted", () => {
                router.reload({ preserveScroll: true });
            });

        return () => {
            channel.stopListening(".TaskUpdated");
            channel.stopListening(".TaskDeleted");
            window.Echo.leave(`project.${project.id}`);
        };
    }, [project.id]);

    // Progress Calculations
    const completionRate = stats.total_tasks > 0 
        ? Math.round((stats.status_counts.done / stats.total_tasks) * 100)
        : 0;

    // SVG Radial Circle Calculations
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (completionRate / 100) * circumference;

    const checklistPct = stats.checklist.total > 0
        ? Math.round((stats.checklist.completed / stats.checklist.total) * 100)
        : 0;

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <Head title={`${project.name} - Dashboard`} />

            {/* Standard Project Navigation Header */}
            <ProjectHeader workspace={workspace} project={project} activeTab="dashboard" />

            {/* MAIN DASHBOARD GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT STATISTICS COLUMN */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Overall Progress ring & checklist */}
                        <Card className="flex flex-col justify-between space-y-6">
                            <div className="flex justify-between items-center">
                                <Label>Project Completion</Label>
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.brown }}>
                                    {stats.total_tasks - stats.status_counts.done} remaining
                                </span>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r={radius}
                                            fill="none"
                                            stroke="rgba(139,94,60,0.12)"
                                            strokeWidth="8"
                                        />
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r={radius}
                                            fill="none"
                                            stroke={C.brown}
                                            strokeWidth="8"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={strokeDashoffset}
                                            strokeLinecap="round"
                                            style={{ transition: "stroke-dashoffset 600ms ease-out", filter: "drop-shadow(0 0 4px rgba(139,94,60,0.35))" }}
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center justify-center">
                                        <span className="font-display font-black text-2xl" style={{ color: C.navy }}>{completionRate}%</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-lg font-bold" style={{ color: C.navy }}>Task Completion</p>
                                    <p className="text-xs" style={{ color: C.muted }}>
                                        <span className="font-bold" style={{ color: C.brown }}>{stats.status_counts.done}</span> of <span className="font-bold" style={{ color: C.navy }}>{stats.total_tasks}</span> tasks completed successfully.
                                    </p>
                                </div>
                            </div>

                            {/* Checklist widget */}
                            {stats.checklist.total > 0 && (
                                <div className="space-y-2 border-t pt-4" style={{ borderColor: C.border }}>
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="flex items-center gap-1.5" style={{ color: C.muted }}>
                                            <CheckSquare size={12} style={{ color: C.brown }} />
                                            Sub-tasks Checklist
                                        </span>
                                        <span className="font-bold" style={{ color: C.navy }}>{checklistPct}% ({stats.checklist.completed}/{stats.checklist.total})</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(139,94,60,0.1)" }}>
                                        <div 
                                            className="h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${checklistPct}%`, background: C.brown }}
                                        />
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Status breakdown count */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { id: "backlog", label: "Backlog", count: stats.status_counts.backlog },
                                { id: "in_progress", label: "In Progress", count: stats.status_counts.in_progress },
                                { id: "in_review", label: "In Review", count: stats.status_counts.in_review },
                                { id: "done", label: "Done", count: stats.status_counts.done }
                            ].map((item) => {
                                const s = STATUS_CFG[item.id];
                                return (
                                    <Card
                                        key={item.id}
                                        className="flex flex-col justify-between"
                                        style={{ background: C.card, border: `1px solid ${C.border}` }}
                                    >
                                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: C.muted }}>
                                            {item.label}
                                        </p>
                                        <p className="text-4xl font-display font-black mt-2" style={{ color: s.color }}>
                                            {item.count}
                                        </p>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Priority breakdown vertical column chart */}
                    <Card>
                        <Label>Task Priorities Breakdown</Label>
                        <PriorityBars priority_counts={stats.priority_counts} />
                    </Card>
                </div>

                {/* RIGHT COLUMN: OVERDUE / DUE SOON TASKS */}
                <div className="space-y-6">
                    <Card className="flex flex-col h-full min-h-[400px]">
                        <Label>Deadlines & Urgency</Label>

                        <div className="flex-1 space-y-5">
                            {/* 1. Overdue section */}
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest" style={{ color: "#c0392b" }}>
                                    <AlertTriangle size={14} />
                                    Overdue ({stats.overdue_tasks.length})
                                </div>
                                <div className="space-y-2">
                                    {stats.overdue_tasks.length === 0 ? (
                                        <p className="text-xs italic p-3 rounded-xl" style={{ background: "rgba(139,94,60,0.04)", color: C.muted }}>
                                            No overdue tasks in this project.
                                        </p>
                                    ) : (
                                        stats.overdue_tasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className="p-3 border rounded-xl flex items-center justify-between"
                                                style={{ background: "rgba(192,57,43,0.03)", borderColor: "rgba(192,57,43,0.15)" }}
                                            >
                                                <div className="space-y-1 max-w-[150px]">
                                                    <p className="text-xs font-semibold truncate" style={{ color: C.navy }}>{task.title}</p>
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-widest ${PRIORITY_COLORS[task.priority]}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "#c0392b" }}>
                                                    <Clock size={10} />
                                                    {new Date(task.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* 2. Due soon section */}
                            <div className="space-y-2.5 border-t pt-4" style={{ borderColor: C.border }}>
                                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest" style={{ color: "#b45309" }}>
                                    <Calendar size={14} />
                                    Due Soon ({stats.due_soon_tasks.length})
                                </div>
                                <div className="space-y-2">
                                    {stats.due_soon_tasks.length === 0 ? (
                                        <p className="text-xs italic p-3 rounded-xl" style={{ background: "rgba(139,94,60,0.04)", color: C.muted }}>
                                            No tasks due soon.
                                        </p>
                                    ) : (
                                        stats.due_soon_tasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className="p-3 border rounded-xl flex items-center justify-between"
                                                style={{ background: "rgba(180,83,9,0.03)", borderColor: "rgba(180,83,9,0.15)" }}
                                            >
                                                <div className="space-y-1 max-w-[150px]">
                                                    <p className="text-xs font-semibold truncate" style={{ color: C.navy }}>{task.title}</p>
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-widest ${PRIORITY_COLORS[task.priority]}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "#b45309" }}>
                                                    <Clock size={10} />
                                                    {new Date(task.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* TEAM WORKLOAD ACCORDION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Active workload accordion */}
                <div className="lg:col-span-2 bg-surface p-6 rounded-3xl space-y-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: C.navy }}>
                            Active Workload & Task Assignments
                        </h3>
                        <p className="text-xs mt-1" style={{ color: C.muted }}>
                            List of team members and tasks assigned to them inside this project. Click a member to see details.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {stats.active_members.length === 0 ? (
                            <p className="text-xs italic p-4 border border-dashed rounded-2xl text-center" style={{ borderColor: C.border, color: C.muted }}>
                                No tasks assigned to any team member yet.
                            </p>
                        ) : (
                            stats.active_members.map((member) => {
                                const isExpanded = expandedMemberId === member.id;

                                return (
                                    <div
                                        key={member.id ?? "unassigned"}
                                        className="border rounded-2xl overflow-hidden transition-all"
                                        style={{ borderColor: C.border, background: "rgba(139,94,60,0.03)" }}
                                    >
                                        {/* Row Header */}
                                        <button
                                            onClick={() => toggleMemberExpand(member.id)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-surface2/50 transition-colors text-left"
                                            style={{ background: "rgba(139,94,60,0.02)" }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold"
                                                    style={{ backgroundColor: member.color }}
                                                >
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold" style={{ color: C.navy }}>
                                                        {member.name}
                                                    </p>
                                                    <p className="text-[10px] font-mono" style={{ color: C.muted }}>{member.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {/* Mini status counts */}
                                                <div className="hidden sm:flex items-center gap-2 text-[9px] font-black uppercase tracking-wider" style={{ color: C.muted }}>
                                                    <span>Backlog: <strong style={{ color: C.navy }}>{member.status_breakdown.backlog}</strong></span>
                                                    <span>·</span>
                                                    <span>Active: <strong style={{ color: STATUS_CFG.in_progress.color }}>{member.status_breakdown.in_progress}</strong></span>
                                                    <span>·</span>
                                                    <span>Review: <strong style={{ color: STATUS_CFG.in_review.color }}>{member.status_breakdown.in_review}</strong></span>
                                                    <span>·</span>
                                                    <span>Done: <strong style={{ color: STATUS_CFG.done.color }}>{member.status_breakdown.done}</strong></span>
                                                </div>

                                                <div className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border"
                                                    style={{ background: "rgba(139,94,60,0.08)", borderColor: C.border, color: C.brown }}>
                                                    {member.tasks.length} tasks
                                                </div>

                                                {isExpanded ? <ChevronUp size={16} style={{ color: C.muted }} /> : <ChevronDown size={16} style={{ color: C.muted }} />}
                                            </div>
                                        </button>

                                        {/* Expanded content */}
                                        {isExpanded && (
                                            <div className="border-t p-4 bg-surface3/30 space-y-3" style={{ borderColor: C.border, background: "rgba(243,228,201,0.3)" }}>
                                                {member.tasks.length === 0 ? (
                                                    <p className="text-xs italic" style={{ color: C.muted }}>No tasks assigned.</p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse text-xs">
                                                            <thead>
                                                                <tr className="border-b font-black uppercase tracking-wider" style={{ borderColor: C.border, color: C.muted }}>
                                                                    <th className="py-2">Task Title</th>
                                                                    <th className="py-2">Status</th>
                                                                    <th className="py-2">Priority</th>
                                                                    <th className="py-2">Due Date</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y text-sm font-medium" style={{ divideColor: "rgba(139,94,60,0.12)", color: C.navy }}>
                                                                {member.tasks.map((task) => (
                                                                    <tr key={task.id} className="hover:bg-surface2/30">
                                                                        <td className="py-2.5 pr-4 font-semibold" style={{ color: C.navy }}>{task.title}</td>
                                                                        <td className="py-2.5">
                                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${STATUS_CFG[task.status]?.color}`}>
                                                                                {STATUS_CFG[task.status]?.label}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2.5">
                                                                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority]}`}>
                                                                                {task.priority}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2.5 font-mono" style={{ color: C.muted }}>
                                                                            {task.due_date 
                                                                                ? new Date(task.due_date).toLocaleDateString([], { month: "short", day: "numeric" })
                                                                                : "None"}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Inactive/Unassigned members panel */}
                <Card className="flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Users size={16} style={{ color: C.brown }} />
                            <Label>Resource Allocation</Label>
                        </div>

                        <div>
                            <p className="text-sm font-bold" style={{ color: C.navy }}>Unassigned Members</p>
                            <p className="text-xs mt-1" style={{ color: C.muted }}>
                                Workspace members with 0 tasks assigned in this project. Use this list to find available resources.
                            </p>
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {stats.inactive_members.length === 0 ? (
                                <p className="text-xs italic p-3 rounded-xl border" style={{ background: "rgba(139,94,60,0.04)", borderColor: C.border, color: C.muted }}>
                                    All workspace members are active in this project.
                                </p>
                            ) : (
                                stats.inactive_members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="p-3 border rounded-xl flex items-center justify-between"
                                        style={{ background: "rgba(139,94,60,0.04)", borderColor: C.border }}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div 
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                                                style={{ backgroundColor: member.color }}
                                            >
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold" style={{ color: C.navy }}>{member.name}</p>
                                                <p className="text-[9px] font-mono" style={{ color: C.muted }}>{member.email}</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider"
                                            style={{ background: "rgba(45,106,79,0.06)", borderColor: "rgba(45,106,79,0.25)", color: "#2d6a4f" }}>
                                            Available
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t mt-6 flex justify-between items-center text-[10px] font-black uppercase tracking-widest" style={{ borderColor: C.border, color: C.muted }}>
                        <span>Total Team Size</span>
                        <span className="font-bold" style={{ color: C.brown }}>{workspace.members.length} members</span>
                    </div>
                </Card>
            </div>
        </div>
    );
}

Show.layout = (page) => <WorkspaceLayout children={page} />;
