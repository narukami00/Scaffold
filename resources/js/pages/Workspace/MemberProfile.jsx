import React, { useState, useRef } from "react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, usePage, useForm, Link } from "@inertiajs/react";
import { 
    CheckCircle2, Clock, Eye, AlertTriangle, BookOpen, 
    MessageSquare, Mail, Calendar, User as UserIcon, Camera, Edit2, Check, ChevronLeft
} from "lucide-react";

const C = {
    bg:          "#ede0c8",
    card:        "#f3e4c9",
    navy:        "#0a2947",
    brown:       "#8b5e3c",
    sage:        "#d3d4c0",
    border:      "rgba(139,94,60,0.18)",
    borderHover: "rgba(139,94,60,0.4)",
    muted:       "rgba(10,41,71,0.68)",
    faint:       "rgba(10,41,71,0.25)",
};

const COZY_COLORS = [
    { name: "Terracotta", value: "#d9745b" },
    { name: "Warm Amber", value: "#e5a93b" },
    { name: "Sage", value: "#8b9a7c" },
    { name: "Soft Teal", value: "#6b8f9c" },
    { name: "Dusty Rose", value: "#c8828f" },
    { name: "Warm Mocha", value: "#9c8070" },
    { name: "Cozy Lavender", value: "#8f809c" },
];

const STATUS_BADGES = {
    backlog:     { label: "Backlog", color: "#1a5f8a", bg: "rgba(26,95,138,0.1)", border: "rgba(26,95,138,0.2)" },
    in_progress: { label: "In Progress", color: "#b45309", bg: "rgba(180,83,9,0.1)", border: "rgba(180,83,9,0.2)" },
    in_review:   { label: "In Review", color: "#7c5c1e", bg: "rgba(124,92,30,0.1)", border: "rgba(124,92,30,0.2)" },
    done:        { label: "Done", color: "#2d6a4f", bg: "rgba(45,106,79,0.1)", border: "rgba(45,106,79,0.2)" },
};

const PRIORITY_BADGES = {
    low:    { label: "Low", color: "bg-slate-500/20 text-slate-700" },
    medium: { label: "Medium", color: "bg-blue-500/20 text-blue-700" },
    high:   { label: "High", color: "bg-orange-500/20 text-orange-700" },
    urgent: { label: "Urgent", color: "bg-red-500/20 text-red-700" },
};

export default function MemberProfile({ profileUser, stats, assignedTasks }) {
    const { auth, workspace } = usePage().props;
    const isOwnProfile = Number(auth.user.id) === Number(profileUser.id);
    const [isEditing, setIsEditing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        name: profileUser.name,
        title: profileUser.title || "",
        bio: profileUser.bio || "",
        color: profileUser.color,
        avatar: null,
    });

    const initials = profileUser.name
        ? profileUser.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : "U";

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData("avatar", file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        clearErrors();
        post(`/workspaces/${workspace.slug}/members/profile`, {
            forceFormData: true,
            onSuccess: () => {
                setIsEditing(false);
                setPreviewUrl(null);
            },
        });
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in duration-300">
            <Head title={`${profileUser.name} - Profile`} />

            <div>
                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest transition-colors duration-150"
                    style={{ color: C.brown }}
                    onMouseEnter={e => e.currentTarget.style.color = "#a06b43"}
                    onMouseLeave={e => e.currentTarget.style.color = C.brown}
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                </button>
            </div>

            {/* ── PROFILE HEADER CARD ────────────────────────────────────────── */}
            <div className="rounded-[32px] border p-6 md:p-8 shadow-sm transition-all"
                style={{ background: C.card, borderColor: C.border }}>
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                    {/* Avatar Upload Container */}
                    <div className="relative group shrink-0">
                        <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden flex items-center justify-center text-3xl font-black border-4 shadow-md transition-all select-none"
                            style={{ 
                                backgroundColor: data.color, 
                                color: "#f3e4c9", 
                                borderColor: C.navy 
                            }}>
                            {previewUrl ? (
                                <img src={previewUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                            ) : profileUser.avatar_path ? (
                                <img src={profileUser.avatar_path} alt={profileUser.name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{initials}</span>
                            )}
                        </div>
                        {isOwnProfile && isEditing && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-2.5 rounded-full text-white shadow-md transition-all scale-95 hover:scale-105"
                                style={{ background: C.navy }}
                                title="Upload Profile Picture"
                            >
                                <Camera size={14} />
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>

                    {/* Metadata Detail / Edit Form */}
                    <div className="flex-1 text-center md:text-left min-w-0 space-y-4">
                        {!isEditing ? (
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                    <h1 className="text-2xl font-black tracking-tight" style={{ color: C.navy }}>
                                        {profileUser.name}
                                    </h1>
                                    {isOwnProfile && (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                                            style={{ borderColor: C.border, color: C.brown, background: "rgba(139,94,60,0.04)" }}
                                        >
                                            <Edit2 size={10} />
                                            Edit Profile
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm font-black uppercase tracking-widest text-[#8b5e3c]">
                                    {profileUser.title || "No Title Defined"}
                                </p>
                                <p className="text-xs max-w-2xl leading-relaxed font-semibold opacity-75" style={{ color: C.navy }}>
                                    {profileUser.bio || "No summary provided."}
                                </p>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 pt-2 text-[10px] uppercase font-bold tracking-widest" style={{ color: C.muted }}>
                                    <div className="flex items-center gap-1.5">
                                        <Mail size={12} className="opacity-60" />
                                        <span>{profileUser.email}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={12} className="opacity-60" />
                                        <span>Joined Workspace: {profileUser.joined_at || "N/A"}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.muted }}>Full Name</label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData("name", e.target.value)}
                                            className="w-full px-4 py-2 text-xs rounded-xl border bg-white/40 focus:bg-white outline-none focus:border-[#8b5e3c] transition-colors font-semibold"
                                            style={{ borderColor: C.border, color: C.navy }}
                                        />
                                        {errors.name && <p className="text-red-600 text-[10px] font-bold mt-1">{errors.name}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.muted }}>Job Title</label>
                                        <input
                                            type="text"
                                            value={data.title}
                                            onChange={(e) => setData("title", e.target.value)}
                                            placeholder="e.g. Senior Product Designer"
                                            className="w-full px-4 py-2 text-xs rounded-xl border bg-white/40 focus:bg-white outline-none focus:border-[#8b5e3c] transition-colors font-semibold"
                                            style={{ borderColor: C.border, color: C.navy }}
                                        />
                                        {errors.title && <p className="text-red-600 text-[10px] font-bold mt-1">{errors.title}</p>}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.muted }}>Short Bio</label>
                                    <textarea
                                        value={data.bio}
                                        onChange={(e) => setData("bio", e.target.value)}
                                        placeholder="Tell other workspace members about your role and expertise..."
                                        rows={3}
                                        className="w-full px-4 py-2 text-xs rounded-xl border bg-white/40 focus:bg-white outline-none focus:border-[#8b5e3c] transition-colors font-semibold resize-none"
                                        style={{ borderColor: C.border, color: C.navy }}
                                    />
                                    {errors.bio && <p className="text-red-600 text-[10px] font-bold mt-1">{errors.bio}</p>}
                                </div>

                                {/* Cozy Color selection */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: C.muted }}>
                                        Signature Workspace Color
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {COZY_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => setData("color", color.value)}
                                                className="w-6 h-6 rounded-full border border-black/10 flex items-center justify-center transition-all hover:scale-110 active:scale-95 text-white"
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            >
                                                {data.color === color.value && <Check size={12} />}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.color && <p className="text-red-600 text-[10px] font-bold mt-1">{errors.color}</p>}
                                </div>

                                <div className="flex gap-2 justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setPreviewUrl(null);
                                            setData({
                                                name: profileUser.name,
                                                title: profileUser.title || "",
                                                bio: profileUser.bio || "",
                                                color: profileUser.color,
                                                avatar: null,
                                            });
                                        }}
                                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:bg-black/5"
                                        style={{ color: C.navy }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-white hover:opacity-90 disabled:opacity-50"
                                        style={{ background: C.navy }}
                                    >
                                        Save Profile
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* ── METRICS DASHBOARD ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-2xl border p-4 shadow-sm text-center" style={{ background: C.card, borderColor: C.border }}>
                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                        <CheckCircle2 size={18} />
                    </div>
                    <div className="text-lg font-black" style={{ color: C.navy }}>{stats.completed}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Tasks Completed</div>
                </div>
                <div className="rounded-2xl border p-4 shadow-sm text-center" style={{ background: C.card, borderColor: C.border }}>
                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                        <Clock size={18} />
                    </div>
                    <div className="text-lg font-black" style={{ color: C.navy }}>{stats.pending}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Tasks Pending</div>
                </div>
                <div className="rounded-2xl border p-4 shadow-sm text-center" style={{ background: C.card, borderColor: C.border }}>
                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                        <AlertTriangle size={18} />
                    </div>
                    <div className="text-lg font-black" style={{ color: C.navy }}>{stats.blocked}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Tasks Blocked</div>
                </div>
                <div className="rounded-2xl border p-4 shadow-sm text-center" style={{ background: C.card, borderColor: C.border }}>
                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                        <BookOpen size={18} />
                    </div>
                    <div className="text-lg font-black" style={{ color: C.navy }}>{stats.wikis}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Wikis Written</div>
                </div>
                <div className="rounded-2xl border p-4 shadow-sm text-center col-span-2 lg:col-span-1" style={{ background: C.card, borderColor: C.border }}>
                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                        <MessageSquare size={18} />
                    </div>
                    <div className="text-lg font-black" style={{ color: C.navy }}>{stats.threads}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Threads Started</div>
                </div>
            </div>

            {/* ── ASSIGNED TASKS LIST ────────────────────────────────────────── */}
            <div className="rounded-[32px] border p-6 md:p-8 shadow-sm"
                style={{ background: C.card, borderColor: C.border }}>
                <div className="flex items-center gap-2 mb-6">
                    <UserIcon size={16} style={{ color: C.brown }} />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: C.navy }}>
                        Work Assignments ({assignedTasks.length})
                    </h2>
                </div>

                {assignedTasks.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl border border-dashed" style={{ borderColor: C.border }}>
                        <p className="text-xs font-semibold" style={{ color: C.muted }}>
                            No active tasks assigned in this workspace.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b" style={{ borderColor: C.border }}>
                                    <th className="py-3 px-4 font-black uppercase tracking-wider" style={{ color: C.muted }}>Task</th>
                                    <th className="py-3 px-4 font-black uppercase tracking-wider" style={{ color: C.muted }}>Project</th>
                                    <th className="py-3 px-4 font-black uppercase tracking-wider" style={{ color: C.muted }}>Status</th>
                                    <th className="py-3 px-4 font-black uppercase tracking-wider" style={{ color: C.muted }}>Priority</th>
                                    <th className="py-3 px-4 font-black uppercase tracking-wider" style={{ color: C.muted }}>Due Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ divideColor: C.border }}>
                                {assignedTasks.map((task) => {
                                    const sBadge = STATUS_BADGES[task.status] || { label: task.status, color: "#999", bg: "rgba(0,0,0,0.05)", border: "rgba(0,0,0,0.1)" };
                                    const pBadge = PRIORITY_BADGES[task.priority] || { label: task.priority, color: "bg-slate-100 text-slate-700" };

                                    return (
                                        <tr key={task.id} className="hover:bg-black/[0.01] transition-colors">
                                            <td className="py-3.5 px-4 font-bold min-w-[200px]" style={{ color: C.navy }}>
                                                <Link 
                                                    href={`/workspaces/${workspace.slug}/projects/${task.project.slug}/board?taskId=${task.id}`}
                                                    className="hover:underline flex flex-col gap-1 items-start"
                                                >
                                                    <span>{task.title}</span>
                                                    {task.labels && task.labels.length > 0 && (
                                                        <div className="flex gap-1">
                                                            {task.labels.map(l => (
                                                                <span key={l.id} className="h-1.5 w-1.5 rounded-full border border-black/5" style={{ backgroundColor: l.color }} title={l.name} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </Link>
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-slate-600">
                                                <Link href={`/workspaces/${workspace.slug}/projects/${task.project.slug}/board`} className="hover:underline">
                                                    {task.project.name}
                                                </Link>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider"
                                                    style={{ color: sBadge.color, backgroundColor: sBadge.bg, borderColor: sBadge.border }}>
                                                    {sBadge.label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${pBadge.color}`}>
                                                    {pBadge.label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-slate-700">
                                                {task.due_date ? new Date(task.due_date).toLocaleDateString() : "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

MemberProfile.layout = (page) => <WorkspaceLayout children={page} />;
