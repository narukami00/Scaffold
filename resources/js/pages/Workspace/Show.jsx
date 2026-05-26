import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, usePage, useForm, Link, router } from "@inertiajs/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ProjectEditModal from "@/components/workspace/ProjectEditModal";
import { useState, useEffect } from "react";
import {
    BarChart3,
    FolderKanban,
    Users,
    Settings as SettingsIcon,
    Plus,
    Pencil,
    Trash2,
    Mail,
    Lock,
    ExternalLink,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";

export default function Show({ workspace, stats, defaultTab }) {
    const { auth } = usePage().props;
    const isOwner = workspace.owner_id === auth.user.id;
    const currentMemberColor = workspace.members.find(
        (m) => m.id === auth.user.id,
    )?.pivot?.color;

    // Tab State Management
    const [activeTab, setActiveTab] = useState(defaultTab || "insights");

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tabName);
        window.history.pushState({}, "", url.toString());
    };

    // Keep state in sync if defaultTab changes (e.g. from direct navigation via Settings link)
    useEffect(() => {
        if (defaultTab) {
            setActiveTab(defaultTab);
        }
    }, [defaultTab]);

    // Real-time task modifications synchronization
    useEffect(() => {
        if (!workspace.projects || workspace.projects.length === 0) return;

        const channels = workspace.projects.map((project) => {
            const channel = window.Echo.join(`project.${project.id}`);

            channel
                .listen(".TaskUpdated", () => {
                    router.reload({ preserveScroll: true });
                })
                .listen(".TaskDeleted", () => {
                    router.reload({ preserveScroll: true });
                });

            return { id: project.id, channel };
        });

        return () => {
            channels.forEach(({ id, channel }) => {
                channel.stopListening(".TaskUpdated");
                channel.stopListening(".TaskDeleted");
                window.Echo.leave(`project.${id}`);
            });
        };
    }, [workspace.projects]);

    // Modals & Project forms
    const [editingProject, setEditingProject] = useState(null);
    const [confirmingProjectId, setConfirmingProjectId] = useState(null);
    const [deletingProjectId, setDeletingProjectId] = useState(null);
    const [showingNewProject, setShowingNewProject] = useState(false);

    const projectForm = useForm({
        name: "",
    });

    const submitNewProject = (e) => {
        e.preventDefault();
        projectForm.post(`/workspaces/${workspace.slug}/projects`, {
            onSuccess: () => {
                setShowingNewProject(false);
                projectForm.reset();
            },
        });
    };

    const submitProjectDelete = (project) => {
        setDeletingProjectId(project.id);
        router.delete(
            `/workspaces/${workspace.slug}/projects/${project.slug}`,
            {
                preserveScroll: true,
                onFinish: () => {
                    setDeletingProjectId(null);
                    setConfirmingProjectId(null);
                },
            },
        );
    };

    // Forms for Settings Tab
    const updateWorkspaceForm = useForm({
        name: workspace.name,
    });

    const submitWorkspaceUpdate = (e) => {
        e.preventDefault();
        updateWorkspaceForm.patch(`/workspaces/${workspace.slug}`);
    };

    const inviteForm = useForm({
        email: "",
        role: "member",
    });

    const submitInvite = (e) => {
        e.preventDefault();
        inviteForm.post(`/workspaces/${workspace.slug}/invitations`, {
            onSuccess: () => inviteForm.reset(),
        });
    };

    const deleteWorkspaceForm = useForm({});
    const [confirmingWorkspaceDelete, setConfirmingWorkspaceDelete] = useState(false);

    const submitWorkspaceDelete = () => {
        deleteWorkspaceForm.delete(`/workspaces/${workspace.slug}`, {
            onSuccess: () => router.visit("/workspaces"),
        });
    };

    // Stats calculations
    const completionRate = stats.total_tasks > 0 
        ? Math.round((stats.status_counts.done / stats.total_tasks) * 100)
        : 0;

    // SVG Radial Circle Calculations
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (completionRate / 100) * circumference;

    // Priority column maximum for chart height scaling
    const maxPriorityCount = Math.max(
        ...Object.values(stats.priority_counts), 
        1 // Prevent division by zero
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <Head title={`${workspace.name} Dashboard`} />

            {/* HEADER AREA */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-6">
                <div className="space-y-1.5">
                    <h1 className="text-3xl font-display font-black text-white uppercase tracking-tighter sm:text-4xl">
                        {workspace.name} Dashboard
                    </h1>
                    <p className="text-sm text-muted">
                        Central command center for monitoring tasks, projects, and team members.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-surface2/60 border border-border/80 rounded-2xl p-1 shadow-inner self-start md:self-auto">
                    {[
                        { id: "insights", label: "Insights", icon: BarChart3 },
                        { id: "projects", label: "Projects", icon: FolderKanban },
                        { id: "members", label: "Members & Team", icon: Users },
                        { id: "settings", label: "Settings", icon: SettingsIcon },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                    isSelected
                                        ? "bg-accent text-black shadow-lg scale-[1.03]"
                                        : "text-muted hover:text-white"
                                }`}
                            >
                                <Icon size={14} strokeWidth={2.5} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB CONTENTS */}
            
            {/* 1. INSIGHTS TAB */}
            {activeTab === "insights" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Completion Ring Widget */}
                        <div className="bg-surface border border-border p-6 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                            <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em] self-start">
                                Overall Progress
                            </h3>
                            <div className="relative w-36 h-36 flex items-center justify-center">
                                {/* SVG Ring */}
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="72"
                                        cy="72"
                                        r={radius}
                                        className="stroke-surface2 fill-none"
                                        strokeWidth="10"
                                    />
                                    <circle
                                        cx="72"
                                        cy="72"
                                        r={radius}
                                        className="stroke-accent fill-none transition-all duration-500 ease-out"
                                        strokeWidth="10"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-white">{completionRate}%</span>
                                    <span className="text-[9px] uppercase tracking-wider text-muted font-bold">Done</span>
                                </div>
                            </div>
                            <p className="text-xs text-muted">
                                <span className="text-accent font-bold">{stats.status_counts.done}</span> of <span className="text-white font-bold">{stats.total_tasks}</span> total workspace tasks completed.
                            </p>
                        </div>

                        {/* Status Breakdown Grid */}
                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                            {[
                                { status: "backlog", label: "Backlog", count: stats.status_counts.backlog, color: "text-[#7c6aff]", bg: "bg-[#7c6aff]/10", border: "border-[#7c6aff]/20" },
                                { status: "in_progress", label: "In Progress", count: stats.status_counts.in_progress, color: "text-[#40c8ff]", bg: "bg-[#40c8ff]/10", border: "border-[#40c8ff]/20" },
                                { status: "in_review", label: "In Review", count: stats.status_counts.in_review, color: "text-[#ffa040]", bg: "bg-[#ffa040]/10", border: "border-[#ffa040]/20" },
                                { status: "done", label: "Done", count: stats.status_counts.done, color: "text-[#4fffb0]", bg: "bg-[#4fffb0]/10", border: "border-[#4fffb0]/20" }
                            ].map((item) => (
                                <div
                                    key={item.status}
                                    className={`bg-surface border ${item.border} p-6 rounded-3xl flex flex-col justify-between shadow-xl`}
                                >
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                                            {item.label}
                                        </p>
                                        <p className={`text-4xl font-black ${item.color} mt-2`}>
                                            {item.count}
                                        </p>
                                    </div>
                                    <div className="w-full bg-surface2 h-1.5 rounded-full overflow-hidden mt-4">
                                        <div
                                            className={`h-full ${item.bg.replace('/10', '')}`}
                                            style={{
                                                width: stats.total_tasks > 0 
                                                    ? `${(item.count / stats.total_tasks) * 100}%` 
                                                    : "0%"
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Priority chart */}
                        <div className="bg-surface border border-border p-6 rounded-3xl space-y-6 shadow-xl">
                            <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em]">
                                Tasks Priority Breakdown
                            </h3>
                            
                            {/* Vertical Bar Chart */}
                            <div className="h-64 flex items-end justify-between px-4 pb-2 border-b border-border/40">
                                {[
                                    { label: "Urgent", count: stats.priority_counts.urgent, barColor: "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]", text: "text-red-400" },
                                    { label: "High", count: stats.priority_counts.high, barColor: "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]", text: "text-orange-400" },
                                    { label: "Medium", count: stats.priority_counts.medium, barColor: "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]", text: "text-yellow-400" },
                                    { label: "Low", count: stats.priority_counts.low, barColor: "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]", text: "text-blue-400" }
                                ].map((item) => {
                                    const heightPct = (item.count / maxPriorityCount) * 100;
                                    return (
                                        <div key={item.label} className="flex flex-col items-center gap-2 w-16 group">
                                            {/* Hover Count Tooltip */}
                                            <span className="text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-mono">
                                                {item.count}
                                            </span>
                                            
                                            {/* Bar */}
                                            <div className="w-full bg-surface2 rounded-t-lg overflow-hidden flex items-end h-44">
                                                <div 
                                                    className={`w-full rounded-t-md transition-all duration-500 ${item.barColor}`} 
                                                    style={{ height: `${heightPct}%` }}
                                                />
                                            </div>

                                            {/* Label */}
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${item.text} mt-1`}>
                                                {item.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between text-xs text-muted px-4 font-medium">
                                <span>Low priority makes up the foundation.</span>
                                <span>Urgent requires immediate action.</span>
                            </div>
                        </div>

                        {/* Project status tracker list */}
                        <div className="bg-surface border border-border p-6 rounded-3xl space-y-6 shadow-xl">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black text-muted uppercase tracking-[0.2em]">
                                    Project Health Status
                                </h3>
                                <Link
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleTabChange("projects"); }}
                                    className="text-xs font-bold text-accent hover:underline uppercase tracking-wider"
                                >
                                    Manage
                                </Link>
                            </div>

                            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
                                {stats.project_stats.length === 0 ? (
                                    <p className="text-xs text-muted italic">No projects created yet.</p>
                                ) : (
                                    stats.project_stats.map((proj) => {
                                        let badgeColor = "border-muted/30 bg-muted/5 text-muted";
                                        if (proj.status === "New") badgeColor = "border-blue-500/20 bg-blue-500/5 text-blue-400";
                                        else if (proj.status === "Completed") badgeColor = "border-emerald-500/20 bg-emerald-500/5 text-emerald-400";
                                        else if (proj.status === "Ongoing") badgeColor = "border-[#ffa040]/30 bg-[#ffa040]/5 text-[#ffa040]";

                                        const progress = proj.total > 0 ? Math.round((proj.done / proj.total) * 100) : 0;

                                        return (
                                            <div key={proj.id} className="p-4 bg-surface2/50 border border-border rounded-2xl flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-white">{proj.name}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted">
                                                        <span>{proj.total} tasks</span>
                                                        <span>·</span>
                                                        <span>{progress}% done</span>
                                                    </div>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${badgeColor}`}>
                                                    {proj.status}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. PROJECTS TAB */}
            {activeTab === "projects" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                            Workspace Projects
                        </h2>
                        <Button
                            onClick={() => setShowingNewProject(true)}
                            className="w-auto px-4 py-2 text-xs"
                        >
                            <Plus size={14} strokeWidth={2.5} />
                            New Project
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {stats.project_stats.length === 0 ? (
                            <div className="md:col-span-2 border border-dashed border-border rounded-3xl p-12 text-center space-y-4">
                                <p className="text-sm text-muted">No projects found. Create a project to start staging tasks.</p>
                                <Button
                                    onClick={() => setShowingNewProject(true)}
                                    className="w-auto mx-auto px-6"
                                >
                                    Create First Project
                                </Button>
                            </div>
                        ) : (
                            stats.project_stats.map((proj) => {
                                const backlogPct = proj.total > 0 ? (proj.backlog / proj.total) * 100 : 0;
                                const inProgressPct = proj.total > 0 ? (proj.in_progress / proj.total) * 100 : 0;
                                const inReviewPct = proj.total > 0 ? (proj.in_review / proj.total) * 100 : 0;
                                const donePct = proj.total > 0 ? (proj.done / proj.total) * 100 : 0;

                                let badgeColor = "border-muted/30 bg-muted/5 text-muted";
                                if (proj.status === "New") badgeColor = "border-blue-500/20 bg-blue-500/5 text-blue-400";
                                else if (proj.status === "Completed") badgeColor = "border-emerald-500/20 bg-emerald-500/5 text-emerald-400";
                                else if (proj.status === "Ongoing") badgeColor = "border-[#ffa040]/30 bg-[#ffa040]/5 text-[#ffa040]";

                                return (
                                    <div
                                        key={proj.id}
                                        className="bg-surface border border-border p-6 rounded-3xl space-y-6 shadow-xl flex flex-col justify-between transition-all hover:border-accent/30"
                                    >
                                        <div className="space-y-4">
                                            {/* Name & status */}
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1">
                                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                        {proj.name}
                                                        {isOwner && (
                                                            <button
                                                                onClick={() => setEditingProject(proj)}
                                                                className="p-1 rounded text-muted hover:text-accent hover:bg-surface2 transition-colors"
                                                                title="Rename Project"
                                                            >
                                                                <Pencil size={11} />
                                                            </button>
                                                        )}
                                                    </h3>
                                                    <p className="text-[10px] text-muted font-mono">{proj.slug}</p>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest shrink-0 ${badgeColor}`}>
                                                    {proj.status}
                                                </span>
                                            </div>

                                            {/* Task metrics breakdown */}
                                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                                <div className="bg-surface2/40 p-2 rounded-xl border border-border/30">
                                                    <p className="text-[9px] font-black uppercase tracking-wider text-muted">Backlog</p>
                                                    <p className="text-sm font-bold text-white mt-1">{proj.backlog}</p>
                                                </div>
                                                <div className="bg-surface2/40 p-2 rounded-xl border border-border/30">
                                                    <p className="text-[9px] font-black uppercase tracking-wider text-[#40c8ff]">Ongoing</p>
                                                    <p className="text-sm font-bold text-[#40c8ff] mt-1">{proj.in_progress}</p>
                                                </div>
                                                <div className="bg-surface2/40 p-2 rounded-xl border border-border/30">
                                                    <p className="text-[9px] font-black uppercase tracking-wider text-[#ffa040]">Review</p>
                                                    <p className="text-sm font-bold text-[#ffa040] mt-1">{proj.in_review}</p>
                                                </div>
                                                <div className="bg-surface2/40 p-2 rounded-xl border border-border/30">
                                                    <p className="text-[9px] font-black uppercase tracking-wider text-[#4fffb0]">Done</p>
                                                    <p className="text-sm font-bold text-[#4fffb0] mt-1">{proj.done}</p>
                                                </div>
                                            </div>

                                            {/* Segmented language/progress bar */}
                                            {proj.total > 0 ? (
                                                <div className="space-y-1.5">
                                                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface2">
                                                        {backlogPct > 0 && (
                                                            <div 
                                                                className="bg-[#7c6aff]" 
                                                                style={{ width: `${backlogPct}%` }} 
                                                                title={`Backlog: ${proj.backlog}`}
                                                            />
                                                        )}
                                                        {inProgressPct > 0 && (
                                                            <div 
                                                                className="bg-[#40c8ff]" 
                                                                style={{ width: `${inProgressPct}%` }} 
                                                                title={`In Progress: ${proj.in_progress}`}
                                                            />
                                                        )}
                                                        {inReviewPct > 0 && (
                                                            <div 
                                                                className="bg-[#ffa040]" 
                                                                style={{ width: `${inReviewPct}%` }} 
                                                                title={`In Review: ${proj.in_review}`}
                                                            />
                                                        )}
                                                        {donePct > 0 && (
                                                            <div 
                                                                className="bg-[#4fffb0]" 
                                                                style={{ width: `${donePct}%` }} 
                                                                title={`Done: ${proj.done}`}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] text-muted">
                                                        <span>Progress</span>
                                                        <span>{Math.round(donePct)}% Completed</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-2.5 w-full bg-surface2 rounded-full border border-dashed border-border" />
                                            )}
                                        </div>

                                        {/* Navigation Actions */}
                                        <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-6">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/workspaces/${workspace.slug}/projects/${proj.slug}/board`}
                                                    className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface2/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted transition-all hover:border-accent/40 hover:text-accent hover:bg-surface2"
                                                >
                                                    <ExternalLink size={11} />
                                                    Kanban Board
                                                </Link>
                                                <Link
                                                    href={`/workspaces/${workspace.slug}/projects/${proj.slug}/threads`}
                                                    className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface2/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted transition-all hover:border-accent/40 hover:text-accent hover:bg-surface2"
                                                >
                                                    Threads
                                                </Link>
                                            </div>

                                            {isOwner && (
                                                confirmingProjectId === proj.id ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => submitProjectDelete(proj)}
                                                            disabled={deletingProjectId === proj.id}
                                                            className="px-3 py-1 bg-accent-red text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-accent-red/90 transition-colors"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmingProjectId(null)}
                                                            disabled={deletingProjectId === proj.id}
                                                            className="px-3 py-1 bg-surface border border-border text-muted text-[10px] font-black uppercase tracking-wider rounded-xl hover:text-white transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmingProjectId(proj.id)}
                                                        className="p-2 rounded-xl text-accent-red/60 hover:text-accent-red hover:bg-accent-red/5 border border-transparent hover:border-accent-red/20 transition-all"
                                                        title="Delete Project"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* 3. MEMBERS TAB */}
            {activeTab === "members" && (
                <div className="space-y-8 animate-in fade-in duration-200">
                    <div className="bg-surface border border-border p-8 rounded-3xl space-y-6 shadow-xl">
                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                                Team Members
                            </h3>
                            <p className="text-sm text-muted">
                                Manage who has access to this workspace.
                            </p>
                        </div>

                        {/* Member List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {workspace.members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 bg-surface2/40 rounded-2xl border border-border shadow-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
                                            style={{ backgroundColor: member.pivot?.color || '#3b82f6' }}
                                        >
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold">
                                                {member.name}
                                            </p>
                                            <p className="text-xs text-muted font-mono">
                                                {member.email}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-border text-[9px] uppercase font-black tracking-widest text-muted">
                                        {member.pivot?.role || "Owner"}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Pending Invitations */}
                        {(workspace.invitations || []).filter(invite => invite.status !== 'accepted').length > 0 && (
                            <div className="space-y-4 pt-6 border-t border-border/40">
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted">
                                    Pending & Recently Declined
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(workspace.invitations || [])
                                        .filter(invite => invite.status !== 'accepted')
                                        .map((invite) => (
                                            <div
                                                key={invite.id}
                                                className="flex items-center justify-between p-3 bg-surface2/20 rounded-xl border border-border/50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-muted">
                                                        <Mail size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-white font-semibold">
                                                            {invite.email}
                                                        </p>
                                                        <p className="text-[9px] text-muted uppercase">
                                                            Role: {invite.role}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                                    invite.status === 'pending' 
                                                        ? 'bg-accent/10 text-accent border-accent/20' 
                                                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                }`}>
                                                    {invite.status}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Invite Form */}
                        <div className="pt-6 border-t border-border/40">
                            <div className="mb-6">
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                    Invite New Member
                                </h4>
                                <p className="text-xs text-muted mt-1">
                                    Team members will receive a notification instantly if they have a DevSpace account.
                                </p>
                            </div>
                            <form
                                onSubmit={submitInvite}
                                className="flex flex-wrap items-end gap-4"
                            >
                                <div className="flex-1 min-w-[200px]">
                                    <Input
                                        label="EMAIL ADDRESS"
                                        placeholder="colleague@example.com"
                                        value={inviteForm.data.email}
                                        onChange={(e) =>
                                            inviteForm.setData("email", e.target.value)
                                        }
                                        error={inviteForm.errors.email}
                                    />
                                </div>
                                <Button
                                    loading={inviteForm.processing}
                                    className="w-auto px-8 mb-0.5"
                                >
                                    Send Invite
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. SETTINGS TAB */}
            {activeTab === "settings" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    
                    {/* SECTION 0: Identity selection */}
                    <div className="bg-surface border border-border p-8 rounded-3xl space-y-6 shadow-xl">
                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                                Your Identity
                            </h3>
                            <p className="text-sm text-muted">
                                Pick your signature avatar color for this workspace. This will represent you on tasks, threads, and comments.
                            </p>
                        </div>

                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3">
                            {[
                                "#FF4D4D", "#FF8C42", "#FFD166", "#06D6A0", "#118AB2", "#7400B8",
                                "#5e60ce", "#4ea8de", "#48bfe3", "#56cfe1", "#64dfdf", "#72efdd",
                                "#80ffdb", "#ff006e", "#8338ec", "#3a86ff", "#fb5607", "#ffbe0b",
                                "#e0e1dd", "#778da9", "#415a77", "#1b263b", "#ef4444", "#3b82f6"
                            ].map((color) => {
                                const isSelected = currentMemberColor === color;
                                
                                return (
                                    <button
                                        key={color}
                                        onClick={() => router.patch(`/workspaces/${workspace.slug}/preferences/color`, { color }, { preserveScroll: true })}
                                        className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${isSelected ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 1: General settings */}
                    <div className="bg-surface border border-border p-8 rounded-3xl space-y-6 shadow-xl">
                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                                General Settings
                            </h3>
                            <p className="text-sm text-muted">
                                Configure general parameters of this workspace.
                            </p>
                        </div>

                        <form onSubmit={submitWorkspaceUpdate} className="space-y-4 max-w-md">
                            <Input
                                label="WORKSPACE NAME"
                                value={updateWorkspaceForm.data.name}
                                onChange={(e) =>
                                    updateWorkspaceForm.setData("name", e.target.value)
                                }
                                error={updateWorkspaceForm.errors.name}
                                disabled={!isOwner}
                            />
                            {isOwner ? (
                                <Button
                                    loading={updateWorkspaceForm.processing}
                                    className="w-auto px-8"
                                >
                                    Save Changes
                                </Button>
                            ) : (
                                <p className="text-xs text-muted italic">
                                    Only the workspace owner can update the workspace name.
                                </p>
                            )}
                        </form>
                    </div>

                    {/* SECTION 2: Danger Zone */}
                    <div className="bg-accent-red/5 border border-accent-red/20 p-8 rounded-3xl space-y-6 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
                            <h3 className="text-xl font-bold text-accent-red uppercase tracking-tight">
                                Danger Zone
                            </h3>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <p className="text-sm text-muted">
                                    Deleting a workspace is a permanent action. All projects, tasks, and historical communication data will be permanently wiped.
                                </p>
                            </div>

                            {isOwner ? (
                                confirmingWorkspaceDelete ? (
                                    <div className="space-y-4 rounded-2xl border border-accent-red/25 bg-accent-red/10 p-5">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="text-accent-red shrink-0" size={20} />
                                            <p className="text-sm text-white">
                                                Delete <span className="font-bold">{workspace.name}</span>? This action is absolutely irreversible.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <Button
                                                type="button"
                                                onClick={submitWorkspaceDelete}
                                                loading={deleteWorkspaceForm.processing}
                                                className="w-auto px-8 bg-accent-red hover:bg-accent-red/80 border-accent-red/20"
                                            >
                                                Confirm Delete
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => setConfirmingWorkspaceDelete(false)}
                                                className="bg-surface hover:bg-surface2 border-border w-auto px-8"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={() => setConfirmingWorkspaceDelete(true)}
                                        className="w-auto px-8 bg-accent-red hover:bg-accent-red/80 border-accent-red/20"
                                    >
                                        Delete Workspace
                                    </Button>
                                )
                            ) : (
                                <p className="text-xs text-muted italic">
                                    Only the workspace owner can delete the workspace.
                                </p>
                            )}
                        </div>
                    </div>

                </div>
            )}

            {/* Rename project dialog modal */}
            <ProjectEditModal
                isOpen={!!editingProject}
                onClose={() => setEditingProject(null)}
                project={editingProject}
                workspace={workspace}
            />

            {/* Create Project Modal Dialog */}
            {showingNewProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface2 border border-border p-8 rounded-3xl w-full max-w-sm space-y-6 shadow-2xl">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                                New Project
                            </h3>
                            <p className="text-xs text-muted">
                                Internal task board for your team.
                            </p>
                        </div>
                        <form onSubmit={submitNewProject} className="space-y-4">
                            <Input
                                label="PROJECT NAME"
                                placeholder="Marketing Ops"
                                value={projectForm.data.name}
                                onChange={(e) =>
                                    projectForm.setData("name", e.target.value)
                                }
                                error={projectForm.errors.name}
                                autoFocus
                            />
                            <div className="flex items-center gap-3">
                                <Button
                                    loading={projectForm.processing}
                                    className="flex-1"
                                >
                                    Create
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setShowingNewProject(false)}
                                    className="bg-surface hover:bg-surface2 border-border"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

Show.layout = (page) => <WorkspaceLayout children={page} />;
