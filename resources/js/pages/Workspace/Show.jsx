import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, usePage, useForm, Link, router } from "@inertiajs/react";
import ProjectEditModal from "@/components/workspace/ProjectEditModal";
import { useState, useEffect } from "react";
import {
    BarChart3, FolderKanban, Users, Settings as SettingsIcon,
    Plus, Pencil, Trash2, Mail, AlertTriangle, CheckCircle2,
    Inbox, Clock, Eye, ExternalLink, Crown, X
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

// Status semantic colors (warm tones, no neon)
const STATUS = {
    backlog:     { color: "#1a5f8a", bg: "rgba(26,95,138,0.1)",  border: "rgba(26,95,138,0.2)",  icon: Inbox },
    in_progress: { color: "#b45309", bg: "rgba(180,83,9,0.1)",   border: "rgba(180,83,9,0.2)",   icon: Clock },
    in_review:   { color: "#7c5c1e", bg: "rgba(124,92,30,0.1)",  border: "rgba(124,92,30,0.2)",  icon: Eye },
    done:        { color: "#2d6a4f", bg: "rgba(45,106,79,0.1)",  border: "rgba(45,106,79,0.2)",  icon: CheckCircle2 },
};

// Segmented bar segment colors
const SEG = {
    backlog:     "#1a5f8a",
    in_progress: "#b45309",
    in_review:   "#c69c3a",
    done:        "#2d6a4f",
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

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        New:       { color: "#1a5f8a", bg: "rgba(26,95,138,0.1)",  border: "rgba(26,95,138,0.25)" },
        Ongoing:   { color: "#b45309", bg: "rgba(180,83,9,0.1)",   border: "rgba(180,83,9,0.25)" },
        Completed: { color: "#2d6a4f", bg: "rgba(45,106,79,0.1)",  border: "rgba(45,106,79,0.25)" },
    };
    const s = map[status] || { color: C.muted, bg: "rgba(10,41,71,0.05)", border: "rgba(10,41,71,0.12)" };
    return (
        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0"
            style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
            {status}
        </span>
    );
}

// ── Segmented progress bar ────────────────────────────────────────────────────
function SegBar({ backlog, in_progress, in_review, done, total }) {
    if (total === 0) return (
        <div className="h-2 w-full rounded-full" style={{ background: "rgba(139,94,60,0.1)", border: `1px dashed ${C.border}` }} />
    );
    const pct = (n) => `${(n / total) * 100}%`;
    return (
        <div className="h-2 w-full rounded-full overflow-hidden flex" style={{ background: "rgba(139,94,60,0.08)" }}>
            {backlog     > 0 && <div style={{ width: pct(backlog),     background: SEG.backlog }}     title={`Backlog: ${backlog}`} />}
            {in_progress > 0 && <div style={{ width: pct(in_progress), background: SEG.in_progress }} title={`In Progress: ${in_progress}`} />}
            {in_review   > 0 && <div style={{ width: pct(in_review),   background: SEG.in_review }}   title={`In Review: ${in_review}`} />}
            {done        > 0 && <div style={{ width: pct(done),        background: SEG.done }}        title={`Done: ${done}`} />}
        </div>
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

// ── Project Card ────────────────────────────────────────────────────────────
function ProjectCard({ proj, workspace, isOwner, setEditingProject, confirmingProjectId, setConfirmingProjectId, deletingProjectId, submitProjectDelete }) {
    const [hovered, setHovered] = useState(false);
    const total = proj.total;

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="block rounded-2xl overflow-hidden transition-all duration-300 relative"
            style={{
                background: C.card,
                border: `1px solid ${hovered ? "rgba(139,94,60,0.45)" : C.border}`,
                boxShadow: hovered
                    ? "0 20px 40px rgba(139,94,60,0.12), 0 0 0 1px rgba(139,94,60,0.15)"
                    : "0 2px 12px rgba(139,94,60,0.07)",
                transform: hovered
                    ? "perspective(800px) rotateX(-1.5deg) rotateY(1.5deg) translateY(-3px)"
                    : "perspective(800px) rotateX(0) rotateY(0) translateY(0)",
                transformStyle: "preserve-3d",
            }}
        >
            <Link 
                href={`/workspaces/${workspace.slug}/projects/${proj.slug}`}
                className="block p-6 space-y-5"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold truncate" style={{ color: hovered ? C.brown : C.navy }}>
                                {proj.name}
                            </h3>
                        </div>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: C.faint }}>/{proj.slug}</p>
                    </div>
                    <StatusBadge status={proj.status} />
                </div>

                {/* Task metric pills */}
                <div className="grid grid-cols-4 gap-2 text-center" onClick={e => e.stopPropagation()}>
                    {[
                        { label: "Backlog",  val: proj.backlog,     color: SEG.backlog },
                        { label: "Active",   val: proj.in_progress, color: SEG.in_progress },
                        { label: "Review",   val: proj.in_review,   color: SEG.in_review },
                        { label: "Done",     val: proj.done,        color: SEG.done },
                    ].map(m => (
                        <div key={m.label} className="rounded-xl py-2"
                            style={{ background: "rgba(139,94,60,0.06)", border: `1px solid ${C.border}` }}>
                            <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: m.color }}>{m.label}</p>
                            <p className="text-sm font-bold mt-0.5" style={{ color: C.navy }}>{m.val}</p>
                        </div>
                    ))}
                </div>

                {/* Segmented bar */}
                <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                    <SegBar {...proj} />
                    <div className="flex justify-between text-[10px]" style={{ color: C.muted }}>
                        <span>Progress</span>
                        <span>{total > 0 ? Math.round((proj.done / total) * 100) : 0}% done</span>
                    </div>
                </div>
            </Link>

            {/* Actions */}
            <div className="px-6 pb-6 pt-2 flex items-center justify-between" style={{ borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                <div className="flex gap-2">
                    {[
                        { href: `/workspaces/${workspace.slug}/projects/${proj.slug}/board`, label: "Kanban" },
                        { href: `/workspaces/${workspace.slug}/projects/${proj.slug}/threads`, label: "Threads" },
                    ].map(l => (
                        <Link key={l.label} href={l.href}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            style={{ border: `1px solid ${C.border}`, color: C.muted, background: "rgba(139,94,60,0.04)" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = C.brown; e.currentTarget.style.color = C.brown; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
                            <ExternalLink size={10} />{l.label}
                        </Link>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {isOwner && (
                        <button onClick={() => setEditingProject(proj)}
                            className="p-1.5 rounded-xl transition-colors shrink-0 text-muted hover:text-accent"
                            onMouseEnter={e => e.currentTarget.style.color = C.brown}
                            onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                            <Pencil size={11} />
                        </button>
                    )}
                    {isOwner && (
                        confirmingProjectId === proj.id ? (
                            <div className="flex gap-2">
                                <button onClick={() => submitProjectDelete(proj)}
                                    disabled={deletingProjectId === proj.id}
                                    className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                                    style={{ background: "#c0392b", color: "#fff" }}>
                                    Confirm
                                </button>
                                <button onClick={() => setConfirmingProjectId(null)}
                                    className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                                    style={{ border: `1px solid ${C.border}`, color: C.muted }}>
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setConfirmingProjectId(proj.id)}
                                className="p-2 rounded-xl transition-all"
                                style={{ color: "rgba(192,57,43,0.5)" }}
                                onMouseEnter={e => { e.currentTarget.style.color = "#c0392b"; e.currentTarget.style.background = "rgba(192,57,43,0.06)"; }}
                                onMouseLeave={e => { e.currentTarget.style.color = "rgba(192,57,43,0.5)"; e.currentTarget.style.background = "transparent"; }}>
                                <Trash2 size={13} />
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Member avatar stack ───────────────────────────────────────────────────────
function AvatarStack({ members, max = 5, workspaceSlug = null }) {
    const shown = members.slice(0, max);
    const rest = members.length - max;
    return (
        <div className="flex items-center">
            {shown.map((m, i) => {
                const content = m.avatar_path ? (
                    <img
                        src={m.avatar_path}
                        alt={m.name}
                        className="w-8 h-8 rounded-full object-cover border-2 -ml-2 first:ml-0"
                        style={{
                            borderColor: C.bg,
                            zIndex: shown.length - i,
                        }}
                    />
                ) : (
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 -ml-2 first:ml-0"
                        style={{
                            background: m.pivot?.color || C.brown,
                            color: "#f3e4c9",
                            borderColor: C.bg,
                            zIndex: shown.length - i,
                        }}
                    >
                        {m.name.charAt(0).toUpperCase()}
                    </div>
                );

                if (workspaceSlug) {
                    return (
                        <Link
                            key={m.id}
                            href={`/workspaces/${workspaceSlug}/members/${m.id}`}
                            className="hover:scale-110 active:scale-95 transition-all"
                            style={{ zIndex: shown.length - i }}
                            title={m.name}
                        >
                            {content}
                        </Link>
                    );
                }

                return (
                    <div key={m.id} style={{ zIndex: shown.length - i }} title={m.name}>
                        {content}
                    </div>
                );
            })}
            {rest > 0 && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 -ml-2"
                    style={{ background: "rgba(139,94,60,0.15)", color: C.brown, borderColor: C.bg }}>
                    +{rest}
                </div>
            )}
        </div>
    );
}

// ── New project inline modal ──────────────────────────────────────────────────
function NewProjectModal({ workspace, onClose }) {
    const form = useForm({ name: "" });
    const [focused, setFocused] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        form.post(`/workspaces/${workspace.slug}/projects`, {
            onSuccess: () => { onClose(); form.reset(); },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(10,41,71,0.7)", backdropFilter: "blur(10px)" }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-sm rounded-2xl p-7 space-y-6 shadow-2xl"
                style={{ background: "#0d3260", border: "1px solid #1a3f6e" }}>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-display font-black text-xl" style={{ color: "#f3e4c9", letterSpacing: "0.03em" }}>
                            New Project
                        </h3>
                        <p className="text-xs mt-1" style={{ color: "rgba(211,212,192,0.45)" }}>
                            A task board for your team.
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5" style={{ color: "rgba(211,212,192,0.4)" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#f3e4c9"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(211,212,192,0.4)"}>
                        <X size={15} />
                    </button>
                </div>
                <form onSubmit={submit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: "#f3e4c9" }}>
                            Project Name
                        </label>
                        <input
                            autoFocus type="text" placeholder="e.g. Marketing Ops"
                            value={form.data.name} onChange={e => form.setData("name", e.target.value)}
                            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 placeholder:opacity-40"
                            style={{
                                background: "rgba(10,41,71,0.7)",
                                border: `1.5px solid ${form.errors.name ? "#c0392b" : focused ? "#8b5e3c" : "rgba(139,94,60,0.25)"}`,
                                color: "#f3e4c9",
                                boxShadow: focused ? "0 0 0 3px rgba(139,94,60,0.15)" : "none",
                            }}
                            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                        />
                        {form.errors.name && <p className="text-xs" style={{ color: "#c0392b" }}>{form.errors.name}</p>}
                    </div>
                    <div className="flex gap-3">
                        <button type="submit" disabled={form.processing}
                            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                            style={{ background: "#8b5e3c", color: "#f3e4c9" }}
                            onMouseEnter={e => { if (!form.processing) e.currentTarget.style.background = "#a06b43"; }}
                            onMouseLeave={e => { if (!form.processing) e.currentTarget.style.background = "#8b5e3c"; }}>
                            {form.processing
                                ? <div className="w-4 h-4 rounded-full border-2 animate-spin"
                                    style={{ borderColor: "rgba(243,228,201,0.3)", borderTopColor: "#f3e4c9" }} />
                                : <><Plus size={14} /> Create</>}
                        </button>
                        <button type="button" onClick={onClose}
                            className="px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                            style={{ background: "rgba(243,228,201,0.06)", border: "1px solid rgba(243,228,201,0.12)", color: "rgba(211,212,192,0.5)" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(243,228,201,0.1)"; e.currentTarget.style.color = "#f3e4c9"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(243,228,201,0.06)"; e.currentTarget.style.color = "rgba(211,212,192,0.5)"; }}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Show({ workspace, stats, defaultTab }) {
    const { auth } = usePage().props;
    const isOwner = workspace.owner_id === auth.user.id;
    const currentMemberColor = workspace.members.find(m => m.id === auth.user.id)?.pivot?.color;

    const [activeTab, setActiveTab] = useState(defaultTab || "insights");
    const [showNewProject, setShowNewProject] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [confirmingProjectId, setConfirmingProjectId] = useState(null);
    const [deletingProjectId, setDeletingProjectId] = useState(null);
    const [confirmingWorkspaceDelete, setConfirmingWorkspaceDelete] = useState(false);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.pushState({}, "", url.toString());
    };

    useEffect(() => { if (defaultTab) setActiveTab(defaultTab); }, [defaultTab]);

    // Real-time sync
    useEffect(() => {
        if (!workspace.projects?.length) return;
        const channels = workspace.projects.map(p => {
            const ch = window.Echo.join(`project.${p.id}`);
            ch.listen(".TaskUpdated", () => router.reload({ preserveScroll: true }))
              .listen(".TaskDeleted", () => router.reload({ preserveScroll: true }));
            return { id: p.id, ch };
        });
        return () => channels.forEach(({ id, ch }) => {
            ch.stopListening(".TaskUpdated").stopListening(".TaskDeleted");
            window.Echo.leave(`project.${id}`);
        });
    }, [workspace.projects]);

    // Forms
    const updateWorkspaceForm = useForm({ name: workspace.name });
    const submitWorkspaceUpdate = (e) => { e.preventDefault(); updateWorkspaceForm.patch(`/workspaces/${workspace.slug}`); };

    const inviteForm = useForm({ email: "", role: "member" });
    const [inviteEmailFocused, setInviteEmailFocused] = useState(false);
    const submitInvite = (e) => { e.preventDefault(); inviteForm.post(`/workspaces/${workspace.slug}/invitations`, { onSuccess: () => inviteForm.reset() }); };

    const deleteWorkspaceForm = useForm({});
    const submitWorkspaceDelete = () => deleteWorkspaceForm.delete(`/workspaces/${workspace.slug}`, { onSuccess: () => router.visit("/workspaces") });

    const submitProjectDelete = (proj) => {
        setDeletingProjectId(proj.id);
        router.delete(`/workspaces/${workspace.slug}/projects/${proj.slug}`, {
            preserveScroll: true,
            onFinish: () => { setDeletingProjectId(null); setConfirmingProjectId(null); },
        });
    };

    // Completion ring
    const completionRate = stats.total_tasks > 0
        ? Math.round((stats.status_counts.done / stats.total_tasks) * 100) : 0;
    const radius = 45, circ = 2 * Math.PI * radius;
    const dashOffset = circ - (completionRate / 100) * circ;

    // Tabs config
    const TABS = [
        { id: "insights",  label: "Insights",  icon: BarChart3 },
        { id: "projects",  label: "Projects",  icon: FolderKanban },
        { id: "members",   label: "Members",   icon: Users },
        { id: "settings",  label: "Settings",  icon: SettingsIcon },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <Head title={`${workspace.name} — Scaffold`} />

            {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: "rgba(139,94,60,0.65)" }}>
                        Workspace
                    </p>
                    <h1 className="font-display font-black text-4xl leading-tight"
                        style={{ color: C.navy, letterSpacing: "0.04em" }}>
                        {workspace.name}
                    </h1>
                    <div className="flex items-center gap-3 pt-1">
                        <AvatarStack members={workspace.members} workspaceSlug={workspace.slug} />
                        <span className="text-xs" style={{ color: C.muted }}>
                            {workspace.members.length} {workspace.members.length === 1 ? "member" : "members"}
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => setShowNewProject(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 active:scale-[0.97] self-start shrink-0"
                    style={{ background: C.brown, color: "#f3e4c9", boxShadow: "0 4px 20px rgba(139,94,60,0.2)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#a06b43"}
                    onMouseLeave={e => e.currentTarget.style.background = C.brown}
                >
                    <Plus size={15} strokeWidth={2.5} />
                    New Project
                </button>
            </div>

            {/* ── TAB BAR ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 p-1 rounded-2xl self-start"
                style={{ background: "rgba(139,94,60,0.08)", border: `1px solid ${C.border}` }}>
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200"
                            style={{
                                background: active ? C.brown : "transparent",
                                color: active ? "#f3e4c9" : C.muted,
                                boxShadow: active ? "0 2px 12px rgba(139,94,60,0.25)" : "none",
                            }}
                            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(139,94,60,0.1)"; e.currentTarget.style.color = C.navy; } }}
                            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; } }}
                        >
                            <Icon size={13} strokeWidth={2.5} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── INSIGHTS TAB ────────────────────────────────────────────── */}
            {activeTab === "insights" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {/* Completion ring */}
                        <Card className="flex flex-col items-center justify-center text-center space-y-4">
                            <Label>Overall Progress</Label>
                            <div className="relative w-36 h-36 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="72" cy="72" r={radius} fill="none"
                                        stroke="rgba(139,94,60,0.12)" strokeWidth="10" />
                                    <circle cx="72" cy="72" r={radius} fill="none"
                                        stroke={C.brown} strokeWidth="10"
                                        strokeDasharray={circ} strokeDashoffset={dashOffset}
                                        strokeLinecap="round"
                                        style={{ transition: "stroke-dashoffset 600ms ease-out",
                                            filter: "drop-shadow(0 0 6px rgba(139,94,60,0.4))" }}
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="font-display font-black text-3xl" style={{ color: C.navy }}>
                                        {completionRate}%
                                    </span>
                                    <span className="text-[9px] uppercase tracking-wider font-black" style={{ color: C.muted }}>
                                        Done
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs" style={{ color: C.muted }}>
                                <span className="font-bold" style={{ color: C.brown }}>{stats.status_counts.done}</span>
                                {" "}of{" "}
                                <span className="font-bold" style={{ color: C.navy }}>{stats.total_tasks}</span>
                                {" "}tasks completed
                            </p>
                        </Card>

                        {/* Status cards */}
                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                            {[
                                { key: "backlog",     label: "Backlog",     count: stats.status_counts.backlog },
                                { key: "in_progress", label: "In Progress", count: stats.status_counts.in_progress },
                                { key: "in_review",   label: "In Review",   count: stats.status_counts.in_review },
                                { key: "done",        label: "Done",        count: stats.status_counts.done },
                            ].map(item => {
                                const s = STATUS[item.key];
                                const Icon = s.icon;
                                const pct = stats.total_tasks > 0 ? (item.count / stats.total_tasks) * 100 : 0;
                                return (
                                    <Card key={item.key} className="flex flex-col justify-between space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: C.muted }}>
                                                    {item.label}
                                                </p>
                                                <p className="text-4xl font-display font-black mt-1.5" style={{ color: s.color }}>
                                                    {item.count}
                                                </p>
                                            </div>
                                            <div className="p-2.5 rounded-xl" style={{ background: s.bg, color: s.color }}>
                                                <Icon size={16} strokeWidth={2} />
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(139,94,60,0.1)" }}>
                                            <div className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, background: s.color, opacity: 0.7 }} />
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Priority bars */}
                        <Card>
                            <Label>Priority Breakdown</Label>
                            <PriorityBars priority_counts={stats.priority_counts} />
                        </Card>

                        {/* Project health */}
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <Label>Project Health</Label>
                                <button onClick={() => handleTabChange("projects")}
                                    className="text-[10px] font-black uppercase tracking-widest transition-colors"
                                    style={{ color: C.brown }}
                                    onMouseEnter={e => e.currentTarget.style.color = "#a06b43"}
                                    onMouseLeave={e => e.currentTarget.style.color = C.brown}>
                                    View all →
                                </button>
                            </div>
                            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                                {stats.project_stats.length === 0 ? (
                                    <p className="text-xs italic" style={{ color: C.muted }}>No projects yet.</p>
                                ) : stats.project_stats.map(proj => {
                                    const pct = proj.total > 0 ? Math.round((proj.done / proj.total) * 100) : 0;
                                    return (
                                        <div key={proj.id} className="flex items-center justify-between p-3 rounded-xl"
                                            style={{ background: "rgba(139,94,60,0.06)", border: `1px solid ${C.border}` }}>
                                            <div className="min-w-0 flex-1 mr-3">
                                                <p className="text-sm font-semibold truncate" style={{ color: C.navy }}>{proj.name}</p>
                                                <p className="text-[10px]" style={{ color: C.muted }}>{proj.total} tasks · {pct}% done</p>
                                            </div>
                                            <StatusBadge status={proj.status} />
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* ── PROJECTS TAB ────────────────────────────────────────────── */}
            {activeTab === "projects" && (
                <div className="space-y-5">
                    {stats.project_stats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 rounded-2xl text-center space-y-4"
                            style={{ background: "rgba(243,228,201,0.5)", border: `1.5px dashed ${C.border}` }}>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                style={{ background: "rgba(139,94,60,0.1)", border: `1px solid ${C.border}` }}>
                                <FolderKanban size={20} style={{ color: C.brown }} />
                            </div>
                            <div>
                                <p className="font-display font-black text-lg" style={{ color: C.navy, letterSpacing: "0.03em" }}>
                                    No projects yet
                                </p>
                                <p className="text-sm mt-1" style={{ color: C.muted }}>
                                    Create your first project to get started.
                                </p>
                            </div>
                            <button onClick={() => setShowNewProject(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                                style={{ background: C.brown, color: "#f3e4c9" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#a06b43"}
                                onMouseLeave={e => e.currentTarget.style.background = C.brown}>
                                <Plus size={14} /> New Project
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {stats.project_stats.map(proj => (
                                <ProjectCard
                                    key={proj.id}
                                    proj={proj}
                                    workspace={workspace}
                                    isOwner={isOwner}
                                    setEditingProject={setEditingProject}
                                    confirmingProjectId={confirmingProjectId}
                                    setConfirmingProjectId={setConfirmingProjectId}
                                    deletingProjectId={deletingProjectId}
                                    submitProjectDelete={submitProjectDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── MEMBERS TAB ─────────────────────────────────────────────── */}
            {activeTab === "members" && (
                <div className="space-y-5">
                    {/* Members list */}
                    <Card>
                        <Label>Team Members</Label>
                        <div className="space-y-2">
                            {workspace.members.map(member => {
                                const isMe = member.id === auth.user.id;
                                const isOwnerMember = member.id === workspace.owner_id;
                                return (
                                    <div key={member.id}
                                        className="flex items-center justify-between p-3.5 rounded-xl transition-all"
                                        style={{
                                            background: isMe ? "rgba(139,94,60,0.06)" : "rgba(139,94,60,0.03)",
                                            border: `1px solid ${isMe ? "rgba(139,94,60,0.25)" : C.border}`,
                                            borderLeft: isMe ? `3px solid ${C.brown}` : `3px solid transparent`,
                                        }}>
                                        <Link 
                                            href={`/workspaces/${workspace.slug}/members/${member.id}`}
                                            className="flex items-center gap-3 hover:opacity-85 transition-opacity"
                                        >
                                            {member.avatar_path ? (
                                                <img src={member.avatar_path} alt={member.name} className="w-9 h-9 rounded-full object-cover border border-black/5" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black"
                                                    style={{ background: member.pivot?.color || C.brown, color: "#f3e4c9" }}>
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-semibold flex items-center gap-1.5 animate-in fade-in duration-200" style={{ color: C.navy }}>
                                                    {member.name}
                                                    {isMe && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                                        style={{ background: "rgba(139,94,60,0.12)", color: C.brown }}>You</span>}
                                                </p>
                                                <p className="text-[11px] font-mono text-left" style={{ color: C.muted }}>{member.email}</p>
                                            </div>
                                        </Link>
                                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                                            style={{
                                                background: isOwnerMember ? "rgba(139,94,60,0.12)" : "rgba(10,41,71,0.06)",
                                                border: `1px solid ${isOwnerMember ? "rgba(139,94,60,0.3)" : "rgba(10,41,71,0.12)"}`,
                                                color: isOwnerMember ? C.brown : C.muted,
                                            }}>
                                            {isOwnerMember && <Crown size={8} />}
                                            {member.pivot?.role || "member"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Pending invitations */}
                    {(workspace.invitations || []).filter(i => i.status !== "accepted").length > 0 && (
                        <Card>
                            <Label>Pending Invitations</Label>
                            <div className="space-y-2">
                                {workspace.invitations.filter(i => i.status !== "accepted").map(invite => (
                                    <div key={invite.id} className="flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: "rgba(139,94,60,0.04)", border: `1px solid ${C.border}` }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                style={{ background: "rgba(139,94,60,0.08)", color: C.brown }}>
                                                <Mail size={13} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold" style={{ color: C.navy }}>{invite.email}</p>
                                                <p className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Role: {invite.role}</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border"
                                            style={invite.status === "pending"
                                                ? { background: "rgba(26,95,138,0.08)", color: "#1a5f8a", borderColor: "rgba(26,95,138,0.2)" }
                                                : { background: "rgba(192,57,43,0.08)", color: "#c0392b", borderColor: "rgba(192,57,43,0.2)" }}>
                                            {invite.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Invite form */}
                    <Card>
                        <Label>Invite New Member</Label>
                        <p className="text-xs mb-5" style={{ color: C.muted }}>
                            Members receive a notification instantly if they have a Scaffold account.
                        </p>
                        <form onSubmit={submitInvite} className="flex flex-wrap items-end gap-3">
                            <div className="flex-1 min-w-[220px] space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: C.brown }}>
                                    Email Address
                                </label>
                                <input
                                    type="email" placeholder="colleague@example.com"
                                    value={inviteForm.data.email}
                                    onChange={e => inviteForm.setData("email", e.target.value)}
                                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 placeholder:opacity-40"
                                    style={{
                                        background: "rgba(139,94,60,0.05)",
                                        border: `1.5px solid ${inviteForm.errors.email ? "#c0392b" : inviteEmailFocused ? C.brown : C.border}`,
                                        color: C.navy,
                                        boxShadow: inviteEmailFocused ? "0 0 0 3px rgba(139,94,60,0.1)" : "none",
                                    }}
                                    onFocus={() => setInviteEmailFocused(true)}
                                    onBlur={() => setInviteEmailFocused(false)}
                                />
                                {inviteForm.errors.email && <p className="text-xs" style={{ color: "#c0392b" }}>{inviteForm.errors.email}</p>}
                            </div>
                            <button type="submit" disabled={inviteForm.processing}
                                className="px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center gap-2 mb-0.5"
                                style={{ background: C.brown, color: "#f3e4c9" }}
                                onMouseEnter={e => { if (!inviteForm.processing) e.currentTarget.style.background = "#a06b43"; }}
                                onMouseLeave={e => { if (!inviteForm.processing) e.currentTarget.style.background = C.brown; }}>
                                {inviteForm.processing
                                    ? <div className="w-4 h-4 rounded-full border-2 animate-spin"
                                        style={{ borderColor: "rgba(243,228,201,0.3)", borderTopColor: "#f3e4c9" }} />
                                    : <><Mail size={14} /> Send Invite</>}
                            </button>
                        </form>
                    </Card>
                </div>
            )}

            {/* ── SETTINGS TAB ────────────────────────────────────────────── */}
            {activeTab === "settings" && (
                <div className="space-y-5 max-w-2xl">
                    {/* Identity — avatar color picker */}
                    <Card>
                        <Label>Your Identity</Label>
                        <p className="text-xs mb-5" style={{ color: C.muted }}>
                            Pick your avatar color for this workspace. Shown on tasks, threads, and comments.
                        </p>
                        <div className="flex flex-wrap gap-2.5">
                            {[
                                "#C0392B","#E67E22","#F1C40F","#27AE60","#1A5F8A","#8B5E3C",
                                "#5e60ce","#4ea8de","#48bfe3","#2d6a4f","#6d4c41","#455A64",
                                "#E91E63","#9C27B0","#3F51B5","#009688","#FF5722","#795548",
                                "#607D8B","#2C3E50","#16213E","#0a2947","#7c5c1e","#b45309",
                            ].map(color => {
                                const selected = currentMemberColor === color;
                                return (
                                    <button key={color}
                                        onClick={() => router.patch(`/workspaces/${workspace.slug}/preferences/color`, { color }, { preserveScroll: true })}
                                        className="w-9 h-9 rounded-full transition-all duration-150 hover:scale-110"
                                        style={{
                                            backgroundColor: color,
                                            border: selected ? `3px solid ${C.navy}` : "3px solid transparent",
                                            boxShadow: selected ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${color}` : "none",
                                        }}
                                        title={color}
                                    />
                                );
                            })}
                        </div>
                    </Card>

                    {/* General settings */}
                    <Card>
                        <Label>General Settings</Label>
                        <form onSubmit={submitWorkspaceUpdate} className="space-y-4 max-w-sm">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: C.brown }}>
                                    Workspace Name
                                </label>
                                <input
                                    type="text"
                                    value={updateWorkspaceForm.data.name}
                                    onChange={e => updateWorkspaceForm.setData("name", e.target.value)}
                                    disabled={!isOwner}
                                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 disabled:opacity-50"
                                    style={{
                                        background: "rgba(139,94,60,0.05)",
                                        border: `1.5px solid ${updateWorkspaceForm.errors.name ? "#c0392b" : C.border}`,
                                        color: C.navy,
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = C.brown; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,94,60,0.1)"; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
                                />
                            </div>
                            {isOwner ? (
                                <button type="submit" disabled={updateWorkspaceForm.processing}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
                                    style={{ background: C.brown, color: "#f3e4c9" }}
                                    onMouseEnter={e => { if (!updateWorkspaceForm.processing) e.currentTarget.style.background = "#a06b43"; }}
                                    onMouseLeave={e => { if (!updateWorkspaceForm.processing) e.currentTarget.style.background = C.brown; }}>
                                    Save Changes
                                </button>
                            ) : (
                                <p className="text-xs italic" style={{ color: C.muted }}>
                                    Only the workspace owner can update the workspace name.
                                </p>
                            )}
                        </form>
                    </Card>

                    {/* Danger zone */}
                    {isOwner && (
                        <div className="rounded-2xl p-6 space-y-4"
                            style={{ background: "rgba(192,57,43,0.04)", border: "1px solid rgba(192,57,43,0.2)" }}>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <p className="text-sm font-black uppercase tracking-widest" style={{ color: "#c0392b" }}>
                                    Danger Zone
                                </p>
                            </div>
                            <p className="text-sm" style={{ color: C.muted }}>
                                Deleting this workspace is permanent. All projects, tasks, and communication data will be wiped.
                            </p>
                            {confirmingWorkspaceDelete ? (
                                <div className="space-y-3 rounded-xl p-4"
                                    style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.2)" }}>
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle size={16} style={{ color: "#c0392b", flexShrink: 0, marginTop: 2 }} />
                                        <p className="text-sm" style={{ color: C.navy }}>
                                            Delete <strong>{workspace.name}</strong>? This is absolutely irreversible.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={submitWorkspaceDelete}
                                            disabled={deleteWorkspaceForm.processing}
                                            className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
                                            style={{ background: "#c0392b", color: "#fff" }}>
                                            Confirm Delete
                                        </button>
                                        <button onClick={() => setConfirmingWorkspaceDelete(false)}
                                            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                                            style={{ border: `1px solid ${C.border}`, color: C.muted }}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setConfirmingWorkspaceDelete(true)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                                    style={{ background: "#c0392b", color: "#fff" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#a93226"}
                                    onMouseLeave={e => e.currentTarget.style.background = "#c0392b"}>
                                    Delete Workspace
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <ProjectEditModal isOpen={!!editingProject} onClose={() => setEditingProject(null)}
                project={editingProject} workspace={workspace} />
            {showNewProject && <NewProjectModal workspace={workspace} onClose={() => setShowNewProject(false)} />}
        </div>
    );
}

Show.layout = (page) => <WorkspaceLayout children={page} />;
