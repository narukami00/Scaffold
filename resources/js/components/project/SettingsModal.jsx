import React, { useState } from "react";
import { useForm, router, usePage } from "@inertiajs/react";
import { X, Settings, FolderOpen, Save, Tag, Plus, Trash2, Edit2 } from "lucide-react";

const C = {
    bg:      "#ede0c8",
    card:    "#f3e4c9",
    navy:    "#0a2947",
    brown:   "#8b5e3c",
    sage:    "#d3d4c0",
    border:  "rgba(139,94,60,0.18)",
    muted:   "rgba(10,41,71,0.68)",
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

export default function SettingsModal({ workspace, project, isOpen, onClose }) {
    if (!isOpen) return null;

    const { auth } = usePage().props;
    const isOwner = auth?.user?.id === workspace.owner_id;

    const [activeTab, setActiveTab] = useState("general");

    // Project Name & Git Path Form
    const { data, setData, patch, processing, errors } = useForm({
        name: project.name || "",
        git_repo_path: project.git_repo_path || "",
    });

    // New Label state
    const [newLabelName, setNewLabelName] = useState("");
    const [newLabelColor, setNewLabelColor] = useState(COZY_COLORS[0].value);
    const [labelCreating, setLabelCreating] = useState(false);

    // Editing Label state
    const [editingLabelId, setEditingLabelId] = useState(null);
    const [editingLabelName, setEditingLabelName] = useState("");
    const [editingLabelColor, setEditingLabelColor] = useState("");
    const [labelUpdating, setLabelUpdating] = useState(false);

    const handleSubmitGeneral = (e) => {
        e.preventDefault();
        patch(`/workspaces/${workspace.slug}/projects/${project.slug}`, {
            onSuccess: () => {
                onClose();
            },
        });
    };

    const handleCreateLabel = (e) => {
        e.preventDefault();
        if (!newLabelName.trim()) return;

        setLabelCreating(true);
        router.post(
            `/workspaces/${workspace.slug}/projects/${project.slug}/labels`,
            {
                name: newLabelName,
                color: newLabelColor,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewLabelName("");
                    setNewLabelColor(COZY_COLORS[0].value);
                },
                onFinish: () => setLabelCreating(false),
            }
        );
    };

    const handleStartEditLabel = (label) => {
        setEditingLabelId(label.id);
        setEditingLabelName(label.name);
        setEditingLabelColor(label.color);
    };

    const handleUpdateLabel = (e) => {
        e.preventDefault();
        if (!editingLabelName.trim()) return;

        setLabelUpdating(true);
        router.patch(
            `/workspaces/${workspace.slug}/projects/${project.slug}/labels/${editingLabelId}`,
            {
                name: editingLabelName,
                color: editingLabelColor,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingLabelId(null);
                },
                onFinish: () => setLabelUpdating(false),
            }
        );
    };

    const handleDeleteLabel = (labelId) => {
        if (!confirm("Are you sure you want to delete this label? It will be removed from all tasks.")) return;

        router.delete(
            `/workspaces/${workspace.slug}/projects/${project.slug}/labels/${labelId}`,
            {
                preserveScroll: true,
            }
        );
    };

    const projectLabels = project.labels || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-[28px] border p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
                style={{ background: C.card, borderColor: C.border }}>
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4 shrink-0" style={{ borderColor: C.border }}>
                    <div className="flex items-center gap-2" style={{ color: C.navy }}>
                        <Settings style={{ color: C.brown }} size={18} />
                        <h2 className="text-sm font-display font-black uppercase tracking-widest">
                            Project Settings
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl border p-1.5 transition-all hover:bg-black/5"
                        style={{ borderColor: C.border, color: C.navy }}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Settings Tabs */}
                <div className="flex gap-2 mt-4 border-b pb-3 shrink-0" style={{ borderColor: C.border }}>
                    <button
                        onClick={() => setActiveTab("general")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        style={{
                            background: activeTab === "general" ? C.brown : "transparent",
                            color: activeTab === "general" ? "#f3e4c9" : C.muted,
                        }}
                    >
                        <Settings size={12} />
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab("labels")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        style={{
                            background: activeTab === "labels" ? C.brown : "transparent",
                            color: activeTab === "labels" ? "#f3e4c9" : C.muted,
                        }}
                    >
                        <Tag size={12} />
                        Task Labels
                    </button>
                </div>

                {/* Tab content area */}
                <div className="flex-1 overflow-y-auto mt-6 custom-scrollbar pr-1">
                    {activeTab === "general" ? (
                        /* General Settings Form */
                        <form onSubmit={handleSubmitGeneral} className="space-y-5">
                            {/* Project Name */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: C.brown }}>
                                    Project Name
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData("name", e.target.value)}
                                    className="w-full rounded-xl border px-3 py-2.5 text-xs font-bold outline-none transition-all focus:border-[#8b5e3c]"
                                    style={{
                                        background: "rgba(139,94,60,0.03)",
                                        borderColor: C.border,
                                        color: C.navy,
                                    }}
                                    required
                                    disabled={processing}
                                />
                                {errors.name && (
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Git Repo Path */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.brown }}>
                                        Local Git Repository Path
                                    </label>
                                </div>
                                <div className="relative">
                                    <FolderOpen
                                        className="absolute top-3 left-3"
                                        style={{ color: C.brown }}
                                        size={14}
                                    />
                                    <input
                                        type="text"
                                        placeholder="e.g. F:\__Projects\Web\Scaffold\scaffold"
                                        value={data.git_repo_path}
                                        onChange={(e) => setData("git_repo_path", e.target.value)}
                                        className="w-full rounded-xl border py-2.5 pr-3 pl-9 text-xs font-bold outline-none transition-all focus:border-[#8b5e3c] font-mono"
                                        style={{
                                            background: "rgba(139,94,60,0.03)",
                                            borderColor: C.border,
                                            color: C.navy,
                                        }}
                                        disabled={processing}
                                    />
                                </div>
                                <p className="text-[9px] leading-relaxed" style={{ color: C.muted }}>
                                    Provide the absolute local folder path. The app will parse local git logs to generate the Git Feed timeline.
                                </p>
                                {errors.git_repo_path && (
                                    <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                                        {errors.git_repo_path}
                                    </p>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-6 flex justify-end gap-2 border-t pt-4" style={{ borderColor: C.border }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl border px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all"
                                    style={{ borderColor: C.border, color: C.muted }}
                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(10,41,71,0.05)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                    disabled={processing}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#f3e4c9] shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                    style={{ background: C.brown }}
                                    disabled={processing}
                                >
                                    <Save size={12} />
                                    Save Settings
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Labels Management Tab */
                        <div className="space-y-6">
                            {/* Create Label Form (Owner Only) */}
                            {isOwner && (
                                <form onSubmit={handleCreateLabel} className="p-4 rounded-2xl border space-y-4" style={{ borderColor: C.border, background: "rgba(139,94,60,0.02)" }}>
                                    <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: C.navy }}>
                                        Create New Label
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.brown }}>
                                                Label Name
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Bug, Feature, Refactor"
                                                value={newLabelName}
                                                onChange={(e) => setNewLabelName(e.target.value)}
                                                className="w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none"
                                                style={{
                                                    background: "white",
                                                    borderColor: C.border,
                                                    color: C.navy,
                                                }}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.brown }}>
                                                Theme Color
                                            </label>
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {COZY_COLORS.map((c) => (
                                                    <button
                                                        key={c.value}
                                                        type="button"
                                                        onClick={() => setNewLabelColor(c.value)}
                                                        className={`w-6 h-6 rounded-full border transition-all ${newLabelColor === c.value ? "ring-2 ring-[#0a2947] scale-110" : "scale-100 hover:scale-105"}`}
                                                        style={{ backgroundColor: c.value, borderColor: "rgba(0,0,0,0.1)" }}
                                                        title={c.name}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-1">
                                        <button
                                            type="submit"
                                            disabled={labelCreating || !newLabelName.trim()}
                                            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-[#f3e4c9] shadow transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                            style={{ background: C.brown }}
                                        >
                                            <Plus size={12} strokeWidth={3} />
                                            Add Label
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Existing Labels List */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-black uppercase tracking-widest border-b pb-2" style={{ color: C.muted, borderColor: C.border }}>
                                    Active Labels ({projectLabels.length})
                                </h3>

                                {projectLabels.length === 0 ? (
                                    <p className="text-xs font-semibold py-8 text-center" style={{ color: C.muted }}>
                                        No labels defined for this project yet.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {projectLabels.map((label) => {
                                            const isEditing = editingLabelId === label.id;
                                            return (
                                                <div
                                                    key={label.id}
                                                    className="flex items-center justify-between p-3 rounded-xl border bg-white/20"
                                                    style={{ borderColor: C.border }}
                                                >
                                                    {isEditing ? (
                                                        /* Inline Edit Form */
                                                        <form onSubmit={handleUpdateLabel} className="flex-1 flex flex-wrap items-center gap-3">
                                                            <input
                                                                type="text"
                                                                value={editingLabelName}
                                                                onChange={(e) => setEditingLabelName(e.target.value)}
                                                                className="flex-1 min-w-[120px] rounded-lg border px-2 py-1 text-xs font-bold outline-none"
                                                                style={{ borderColor: C.border, color: C.navy }}
                                                                required
                                                            />
                                                            <div className="flex gap-1">
                                                                {COZY_COLORS.map((c) => (
                                                                    <button
                                                                        key={c.value}
                                                                        type="button"
                                                                        onClick={() => setEditingLabelColor(c.value)}
                                                                        className={`w-5 h-5 rounded-full border transition-all ${editingLabelColor === c.value ? "ring-1 ring-[#0a2947] scale-110" : ""}`}
                                                                        style={{ backgroundColor: c.value, borderColor: "rgba(0,0,0,0.1)" }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <div className="flex gap-1.5 ml-auto">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingLabelId(null)}
                                                                    className="px-2 py-1 text-[10px] font-black uppercase text-slate-500 hover:underline"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="submit"
                                                                    disabled={labelUpdating || !editingLabelName.trim()}
                                                                    className="px-3 py-1 rounded-lg text-[10px] font-black uppercase text-[#f3e4c9] transition-all hover:scale-105"
                                                                    style={{ background: C.brown }}
                                                                >
                                                                    Save
                                                                </button>
                                                            </div>
                                                        </form>
                                                    ) : (
                                                        /* Read Only Row */
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="w-3.5 h-3.5 rounded-full border"
                                                                    style={{ backgroundColor: label.color, borderColor: "rgba(0,0,0,0.08)" }}
                                                                />
                                                                <span className="text-xs font-bold" style={{ color: C.navy }}>
                                                                    {label.name}
                                                                </span>
                                                            </div>

                                                            {isOwner && (
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleStartEditLabel(label)}
                                                                        className="p-1 text-slate-500 hover:text-indigo-700 transition-colors"
                                                                        title="Edit Label"
                                                                    >
                                                                        <Edit2 size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteLabel(label.id)}
                                                                        className="p-1 text-slate-500 hover:text-red-600 transition-colors"
                                                                        title="Delete Label"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
