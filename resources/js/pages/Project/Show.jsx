import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, router } from "@inertiajs/react";
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
    Zap,
    Briefcase
} from "lucide-react";

const PRIORITY_COLORS = {
    urgent: "text-red-400 bg-red-500/10 border-red-500/20",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

const STATUS_CFG = {
    backlog: { label: "Backlog", color: "text-muted", bar: "bg-[#7c6aff]" },
    in_progress: { label: "In Progress", color: "text-[#40c8ff]", bar: "bg-[#40c8ff]" },
    in_review: { label: "In Review", color: "text-[#ffa040]", bar: "bg-[#ffa040]" },
    done: { label: "Done", color: "text-[#4fffb0]", bar: "bg-[#4fffb0]" },
};

export default function Show({ workspace, project, stats }) {
    // Accordion state for Team Workload
    const [expandedMemberId, setExpandedMemberId] = useState(null);
    const [showInactiveMembers, setShowInactiveMembers] = useState(false);

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

    const maxPriorityCount = Math.max(
        ...Object.values(stats.priority_counts), 
        1
    );

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
                        <div className="bg-surface border border-border p-6 rounded-3xl flex flex-col justify-between shadow-xl space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em]">
                                    Project Completion
                                </h3>
                                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                                    {stats.total_tasks - stats.status_counts.done} remaining
                                </span>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r={radius}
                                            className="stroke-surface2 fill-none"
                                            strokeWidth="8"
                                        />
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r={radius}
                                            className="stroke-accent fill-none transition-all duration-500 ease-out"
                                            strokeWidth="8"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={strokeDashoffset}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center justify-center">
                                        <span className="text-xl font-black text-white">{completionRate}%</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-lg font-bold text-white">Task Completion</p>
                                    <p className="text-xs text-muted">
                                        <span className="text-accent font-bold">{stats.status_counts.done}</span> of <span className="text-white font-bold">{stats.total_tasks}</span> tasks completed successfully.
                                    </p>
                                </div>
                            </div>

                            {/* Checklist widget */}
                            {stats.checklist.total > 0 && (
                                <div className="space-y-2 border-t border-border/40 pt-4">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-muted flex items-center gap-1.5">
                                            <CheckSquare size={12} className="text-accent" />
                                            Sub-tasks Checklist
                                        </span>
                                        <span className="text-white font-bold">{checklistPct}% ({stats.checklist.completed}/{stats.checklist.total})</span>
                                    </div>
                                    <div className="w-full bg-surface2 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-accent transition-all duration-500" 
                                            style={{ width: `${checklistPct}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status breakdown count */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { id: "backlog", label: "Backlog", count: stats.status_counts.backlog, color: "text-muted", bg: "bg-surface2/50" },
                                { id: "in_progress", label: "In Progress", count: stats.status_counts.in_progress, color: "text-[#40c8ff]", bg: "bg-[#40c8ff]/10 border-[#40c8ff]/20" },
                                { id: "in_review", label: "In Review", count: stats.status_counts.in_review, color: "text-[#ffa040]", bg: "bg-[#ffa040]/10 border-[#ffa040]/20" },
                                { id: "done", label: "Done", count: stats.status_counts.done, color: "text-[#4fffb0]", bg: "bg-[#4fffb0]/10 border-[#4fffb0]/20" }
                            ].map((item) => (
                                <div
                                    key={item.id}
                                    className={`bg-surface border border-border p-4 rounded-2xl flex flex-col justify-between shadow-md ${item.border || ""}`}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-wider text-muted">
                                        {item.label}
                                    </p>
                                    <p className={`text-3xl font-black ${item.color} mt-2`}>
                                        {item.count}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Priority breakdown vertical column chart */}
                    <div className="bg-surface border border-border p-6 rounded-3xl space-y-6 shadow-xl">
                        <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em]">
                            Task Priorities Breakdown
                        </h3>

                        <div className="h-48 flex items-end justify-between px-4 pb-2 border-b border-border/40">
                            {[
                                { label: "Urgent", count: stats.priority_counts.urgent, barColor: "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]", text: "text-red-400" },
                                { label: "High", count: stats.priority_counts.high, barColor: "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]", text: "text-orange-400" },
                                { label: "Medium", count: stats.priority_counts.medium, barColor: "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]", text: "text-yellow-400" },
                                { label: "Low", count: stats.priority_counts.low, barColor: "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]", text: "text-blue-400" }
                            ].map((item) => {
                                const heightPct = (item.count / maxPriorityCount) * 100;
                                return (
                                    <div key={item.label} className="flex flex-col items-center gap-2 w-16 group">
                                        <span className="text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">
                                            {item.count}
                                        </span>
                                        <div className="w-full bg-surface2 rounded-t-lg overflow-hidden flex items-end h-32">
                                            <div 
                                                className={`w-full rounded-t-md transition-all duration-500 ${item.barColor}`} 
                                                style={{ height: `${heightPct}%` }}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${item.text} mt-1`}>
                                            {item.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: OVERDUE / DUE SOON TASKS */}
                <div className="space-y-6">
                    <div className="bg-surface border border-border p-6 rounded-3xl shadow-xl flex flex-col h-full min-h-[432px]">
                        <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em] mb-4">
                            Deadlines & Urgency
                        </h3>

                        <div className="flex-1 space-y-6">
                            {/* 1. Overdue section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-widest">
                                    <AlertTriangle size={14} />
                                    Overdue ({stats.overdue_tasks.length})
                                </div>
                                <div className="space-y-2">
                                    {stats.overdue_tasks.length === 0 ? (
                                        <p className="text-xs text-muted italic p-2 bg-surface2/25 rounded-xl">
                                            No overdue tasks in this project.
                                        </p>
                                    ) : (
                                        stats.overdue_tasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className="p-3 bg-red-500/[0.03] border border-red-500/10 rounded-xl flex items-center justify-between"
                                            >
                                                <div className="space-y-0.5 max-w-[150px]">
                                                    <p className="text-xs font-semibold text-white line-clamp-1">{task.title}</p>
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-widest ${PRIORITY_COLORS[task.priority]}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                                                    <Clock size={10} />
                                                    {new Date(task.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* 2. Due soon section */}
                            <div className="space-y-3 border-t border-border/40 pt-4">
                                <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs uppercase tracking-widest">
                                    <Calendar size={14} />
                                    Due Soon ({stats.due_soon_tasks.length})
                                </div>
                                <div className="space-y-2">
                                    {stats.due_soon_tasks.length === 0 ? (
                                        <p className="text-xs text-muted italic p-2 bg-surface2/25 rounded-xl">
                                            No tasks due soon.
                                        </p>
                                    ) : (
                                        stats.due_soon_tasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className="p-3 bg-yellow-500/[0.03] border border-yellow-500/10 rounded-xl flex items-center justify-between"
                                            >
                                                <div className="space-y-0.5 max-w-[150px]">
                                                    <p className="text-xs font-semibold text-white line-clamp-1">{task.title}</p>
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-widest ${PRIORITY_COLORS[task.priority]}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-400">
                                                    <Clock size={10} />
                                                    {new Date(task.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TEAM WORKLOAD ACCORDION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Active workload accordion */}
                <div className="lg:col-span-2 bg-surface border border-border p-6 rounded-3xl shadow-xl space-y-6">
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                            Active Workload & Task Assignments
                        </h3>
                        <p className="text-xs text-muted mt-1">
                            List of team members and tasks assigned to them inside this project. Click a member to see details.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {stats.active_members.length === 0 ? (
                            <p className="text-xs text-muted italic p-4 border border-dashed border-border rounded-2xl text-center">
                                No tasks assigned to any team member yet.
                            </p>
                        ) : (
                            stats.active_members.map((member) => {
                                const isExpanded = expandedMemberId === member.id;
                                const isUnassigned = member.id === null;

                                return (
                                    <div
                                        key={member.id ?? "unassigned"}
                                        className="border border-border rounded-2xl overflow-hidden transition-all bg-surface2/25"
                                    >
                                        {/* Row Header */}
                                        <button
                                            onClick={() => toggleMemberExpand(member.id)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-surface2/50 transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold"
                                                    style={{ backgroundColor: member.color }}
                                                >
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">
                                                        {member.name}
                                                    </p>
                                                    <p className="text-[10px] text-muted font-mono">{member.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {/* Mini status counts */}
                                                <div className="hidden sm:flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-muted">
                                                    <span>Backlog: <strong className="text-white">{member.status_breakdown.backlog}</strong></span>
                                                    <span>·</span>
                                                    <span>Ongoing: <strong className="text-[#40c8ff]">{member.status_breakdown.in_progress}</strong></span>
                                                    <span>·</span>
                                                    <span>Review: <strong className="text-[#ffa040]">{member.status_breakdown.in_review}</strong></span>
                                                    <span>·</span>
                                                    <span>Done: <strong className="text-[#4fffb0]">{member.status_breakdown.done}</strong></span>
                                                </div>

                                                <div className="px-2.5 py-0.5 rounded-full bg-border text-[9px] font-black text-muted uppercase">
                                                    {member.tasks.length} tasks
                                                </div>

                                                {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                                            </div>
                                        </button>

                                        {/* Expanded content */}
                                        {isExpanded && (
                                            <div className="border-t border-border p-4 bg-surface3/30 space-y-3">
                                                {member.tasks.length === 0 ? (
                                                    <p className="text-xs text-muted italic">No tasks assigned.</p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse text-xs">
                                                            <thead>
                                                                <tr className="border-b border-border/40 text-muted font-black uppercase tracking-wider">
                                                                    <th className="py-2">Task Title</th>
                                                                    <th className="py-2">Status</th>
                                                                    <th className="py-2">Priority</th>
                                                                    <th className="py-2">Due Date</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/20 text-white font-medium">
                                                                {member.tasks.map((task) => (
                                                                    <tr key={task.id} className="hover:bg-surface2/30">
                                                                        <td className="py-2.5 pr-4 font-semibold">{task.title}</td>
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
                                                                        <td className="py-2.5 text-muted font-mono">
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
                <div className="bg-surface border border-border p-6 rounded-3xl shadow-xl flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-accent" />
                            <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em]">
                                Resource Allocation
                            </h3>
                        </div>

                        <div>
                            <p className="text-sm font-bold text-white">Unassigned Members</p>
                            <p className="text-xs text-muted mt-1">
                                Workspace members with 0 tasks assigned in this project. Use this list to find available resources.
                            </p>
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {stats.inactive_members.length === 0 ? (
                                <p className="text-xs text-muted italic p-2 bg-surface2/25 rounded-xl">
                                    All workspace members are active in this project.
                                </p>
                            ) : (
                                stats.inactive_members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="p-3 bg-surface2/40 border border-border/80 rounded-xl flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div 
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-inner"
                                                style={{ backgroundColor: member.color }}
                                            >
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-white">{member.name}</p>
                                                <p className="text-[9px] text-muted font-mono">{member.email}</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-[8px] font-black uppercase tracking-wider">
                                            Available
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border/40 mt-6 flex justify-between items-center text-[10px] text-muted font-black uppercase tracking-widest">
                        <span>Total Team Size</span>
                        <span className="text-accent font-bold">{workspace.members.length} members</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

Show.layout = (page) => <WorkspaceLayout children={page} />;
