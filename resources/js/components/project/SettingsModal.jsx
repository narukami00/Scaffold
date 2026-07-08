import React, { useState, useEffect } from "react";
import { useForm, router, usePage } from "@inertiajs/react";
import { X, Settings, FolderOpen, Save, Tag, Plus, Trash2, Edit2, GitBranch, RefreshCw } from "lucide-react";

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
    const { auth, github_app_slug, errors: pageErrors } = usePage().props;
    const isOwner = auth?.user?.id === workspace.owner_id;

    const [activeTab, setActiveTab] = useState("general");

    // Settings Modal dynamic states
    const [labels, setLabels] = useState([]);
    const [linkedRepo, setLinkedRepo] = useState(null);
    const [githubInstallations, setGithubInstallations] = useState([]);
    const [loadingSettings, setLoadingSettings] = useState(false);

    // GitHub Repo Linking states
    const [githubRepos, setGithubRepos] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [selectedRepoId, setSelectedRepoId] = useState("");
    const [linking, setLinking] = useState(false);

    const loadSettingsData = () => {
        setLoadingSettings(true);
        fetch(`/workspaces/${workspace.slug}/projects/${project.slug}/settings-data`)
            .then(res => res.json())
            .then(data => {
                setLabels(data.labels || []);
                setLinkedRepo(data.github_repository || null);
                setGithubInstallations(data.github_installations || []);
                setLoadingSettings(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingSettings(false);
            });
    };

    useEffect(() => {
        if (isOpen) {
            loadSettingsData();
        }
    }, [isOpen, project.slug]);

    const loadGithubRepos = () => {
        setLoadingRepos(true);
        fetch(`/workspaces/${workspace.slug}/github/repositories`)
            .then(res => res.json())
            .then(data => {
                setGithubRepos(data);
                setLoadingRepos(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingRepos(false);
            });
    };

    useEffect(() => {
        if (activeTab === "github" && githubRepos.length === 0 && !loadingRepos && githubInstallations?.length > 0) {
            loadGithubRepos();
        }
    }, [activeTab, githubInstallations]);

    const handleLinkRepo = () => {
        const repo = githubRepos.find(r => r.github_repo_id.toString() === selectedRepoId.toString());
        if (!repo) return;

        setLinking(true);
        router.post(
            `/workspaces/${workspace.slug}/projects/${project.slug}/github/link`,
            {
                github_repo_id: repo.github_repo_id,
                github_installation_id: repo.github_installation_id,
                full_name: repo.full_name,
                default_branch: repo.default_branch,
                html_url: repo.html_url,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setLinking(false);
                    setSelectedRepoId("");
                    loadSettingsData();
                },
                onFinish: () => setLinking(false),
            }
        );
    };

    const handleUnlinkRepo = () => {
        if (!confirm("Are you sure you want to unlink this repository? This will not delete any issues or pull requests on GitHub.")) return;

        setLinking(true);
        router.post(
            `/workspaces/${workspace.slug}/projects/${project.slug}/github/unlink`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setLinking(false);
                    loadSettingsData();
                },
                onFinish: () => setLinking(false),
            }
        );
    };

    // Project Name & Git Path Form
    const { data, setData, patch, processing, errors } = useForm({
        name: project.name || "",
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
                    loadSettingsData();
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
                    loadSettingsData();
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
                onSuccess: () => {
                    loadSettingsData();
                }
            }
        );
    };

    const projectLabels = labels || [];

    if (!isOpen) return null;

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
                    <button
                        onClick={() => setActiveTab("github")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        style={{
                            background: activeTab === "github" ? C.brown : "transparent",
                            color: activeTab === "github" ? "#f3e4c9" : C.muted,
                        }}
                    >
                        <GitBranch size={12} />
                        GitHub Sync
                    </button>
                </div>

                {/* Tab content area */}
                <div className="flex-1 overflow-y-auto mt-6 custom-scrollbar pr-1">
                    {activeTab === "general" && (
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
                    )}

                    {activeTab === "labels" && (
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

                    {activeTab === "github" && (
                        <div className="space-y-6 animate-fadeIn pb-6">
                            <div className="p-4 rounded-2xl border bg-white/20" style={{ borderColor: C.border }}>
                                <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: C.navy }}>
                                    GitHub App Integration
                                </h3>
                                <p className="text-xs font-bold leading-relaxed mb-4 animate-pulse-slow" style={{ color: C.muted }}>
                                    Connect this DevSpace project to a remote GitHub repository to automatically link pull requests, sync task states (Done/Backlog), and display live branch and commit timelines.
                                </p>
                                {pageErrors && pageErrors.github && (
                                    <div className="p-3 mb-4 rounded-xl border bg-red-50 text-[#c0392b] text-xs font-bold leading-relaxed" style={{ borderColor: "rgba(192,57,43,0.25)" }}>
                                        ⚠️ GitHub Connection Error: {pageErrors.github}
                                    </div>
                                )}
                                {linkedRepo ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 rounded-xl border bg-white/60" style={{ borderColor: C.border }}>
                                            <div>
                                                <p className="text-xs font-black" style={{ color: C.navy }}>
                                                    Linked Repository
                                                </p>
                                                <a href={linkedRepo.html_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold underline text-blue-600 hover:text-blue-800 break-all">
                                                    {linkedRepo.full_name}
                                                </a>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1">
                                                    Default branch: <span className="font-mono font-bold text-[#8b5e3c]">{linkedRepo.default_branch}</span>
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleUnlinkRepo}
                                                disabled={linking}
                                                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-red-600 hover:bg-red-50/50 transition-all border border-red-200 disabled:opacity-50"
                                            >
                                                {linking ? "Unlinking..." : "Unlink"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {githubInstallations && githubInstallations.length > 0 ? (
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: C.brown }}>
                                                    Select a GitHub Repository
                                                </label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={selectedRepoId}
                                                        onChange={(e) => setSelectedRepoId(e.target.value)}
                                                        disabled={loadingRepos || linking}
                                                        className="flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold outline-none transition-all focus:border-[#8b5e3c]"
                                                        style={{
                                                            background: "rgba(139,94,60,0.03)",
                                                            borderColor: C.border,
                                                            color: C.navy,
                                                        }}
                                                    >
                                                        <option value="">-- Choose Repository --</option>
                                                        {githubRepos.map(repo => (
                                                            <option key={repo.github_repo_id} value={repo.github_repo_id}>
                                                                {repo.full_name} {repo.private ? '(Private)' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    
                                                    <button
                                                        type="button"
                                                        onClick={handleLinkRepo}
                                                        disabled={!selectedRepoId || linking}
                                                        className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-[#8b5e3c] text-[#f3e4c9] disabled:opacity-50"
                                                    >
                                                        {linking ? "Linking..." : "Link"}
                                                    </button>
                                                </div>

                                                {loadingRepos && (
                                                    <p className="text-[10px] font-bold text-slate-500 animate-pulse mt-2">
                                                        Loading repositories...
                                                    </p>
                                                )}

                                                <div className="pt-2 text-center border-t mt-4" style={{ borderColor: C.border }}>
                                                    <a
                                                        href={`/workspaces/${workspace.slug}/github/connect`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:underline"
                                                    >
                                                        + Configure App Permissions on GitHub
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <p className="text-xs font-bold text-slate-500 mb-4">
                                                    No GitHub installations connected to this workspace yet.
                                                </p>
                                                <a
                                                    href={`/workspaces/${workspace.slug}/github/connect`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-[#0a2947] text-[#f3e4c9] hover:opacity-90 shadow-md hover:scale-[1.02]"
                                                >
                                                    <GitBranch size={14} />
                                                    Connect GitHub App
                                                </a>
                                            </div>
                                        )}
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
