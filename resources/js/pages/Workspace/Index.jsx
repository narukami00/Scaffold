import AppLayout from "@/layouts/AppLayout";
import { Head, useForm } from "@inertiajs/react";
import { useState } from "react";
import { Plus, X, Users, FolderKanban, Crown, User } from "lucide-react";

// ── Deterministic pattern generator from workspace name ───────────────────────
function hashName(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

function WorkspaceIdenticon({ name, size = 72, hovered = false }) {
    const seed = hashName(name);
    const grid = 5;
    const cellSize = size / grid;

    const cells = [];
    for (let row = 0; row < grid; row++) {
        for (let col = 0; col < Math.ceil(grid / 2); col++) {
            const bit = (seed >> (row * 3 + col)) & 1;
            cells.push({ row, col, on: !!bit });
            if (col !== Math.floor(grid / 2)) {
                cells.push({ row, col: grid - 1 - col, on: !!bit });
            }
        }
    }

    // On hover: cream dots. Default: navy dots.
    const fillColor = hovered ? "#f3e4c9" : `hsl(${[210,220,200,215,205,218][seed % 6]}, 60%, 28%)`;
    const bgFill = hovered ? "#0a2947" : "rgba(10,41,71,0.06)";

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
            <rect width={size} height={size} fill={bgFill} rx="4"
                style={{ transition: "fill 350ms ease" }} />
            {cells
                .filter((c) => c.on)
                .map((c, i) => (
                    <rect
                        key={i}
                        x={c.col * cellSize + 1}
                        y={c.row * cellSize + 1}
                        width={cellSize - 2}
                        height={cellSize - 2}
                        rx="1.5"
                        fill={fillColor}
                        fillOpacity={hovered ? 0.9 : 0.75}
                        style={{ transition: "fill 350ms ease, fill-opacity 350ms ease" }}
                    />
                ))}
        </svg>
    );
}

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
    const isOwner = role === "owner";
    return (
        <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0"
            style={{
                background: isOwner ? "rgba(139,94,60,0.12)" : "rgba(10,41,71,0.07)",
                border: `1px solid ${isOwner ? "rgba(139,94,60,0.3)" : "rgba(10,41,71,0.15)"}`,
                color: isOwner ? "#8b5e3c" : "rgba(10,41,71,0.45)",
            }}
        >
            {isOwner ? <Crown size={8} /> : <User size={8} />}
            {isOwner ? "Owner" : "Member"}
        </span>
    );
}

// ── Workspace Card ────────────────────────────────────────────────────────────
function WorkspaceCard({ workspace }) {
    const [hovered, setHovered] = useState(false);

    return (
        <a
            href={`/workspaces/${workspace.slug}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="block rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
            style={{
                background: "#f3e4c9",
                border: `1px solid ${hovered ? "rgba(139,94,60,0.45)" : "rgba(139,94,60,0.18)"}`,
                boxShadow: hovered
                    ? "0 20px 40px rgba(139,94,60,0.15), 0 0 0 1px rgba(139,94,60,0.2)"
                    : "0 2px 12px rgba(139,94,60,0.08)",
                transform: hovered
                    ? "perspective(800px) rotateX(-2deg) rotateY(2deg) translateY(-4px)"
                    : "perspective(800px) rotateX(0) rotateY(0) translateY(0)",
                transformStyle: "preserve-3d",
            }}
        >
            {/* Identicon strip */}
            <div
                className="w-full overflow-hidden flex items-center justify-center"
                style={{
                    height: 80,
                    background: hovered ? "#0a2947" : "rgba(10,41,71,0.04)",
                    transition: "background 350ms ease",
                }}
            >
                <WorkspaceIdenticon name={workspace.name} size={80} hovered={hovered} />
            </div>

            {/* Card body */}
            <div className="p-5 space-y-3">
                {/* Name + role */}
                <div className="flex items-start justify-between gap-2">
                    <h3
                        className="text-base font-bold leading-tight truncate"
                        style={{ color: hovered ? "#0a2947" : "#1a3a5c" }}
                    >
                        {workspace.name}
                    </h3>
                    <RoleBadge role={workspace.user_role} />
                </div>

                {/* Slug */}
                <p
                    className="text-[10px] uppercase tracking-widest font-mono truncate"
                    style={{ color: "rgba(10,41,71,0.3)" }}
                >
                    /{workspace.slug}
                </p>

                {/* Stats row */}
                <div
                    className="flex items-center gap-4 pt-3"
                    style={{ borderTop: "1px solid rgba(139,94,60,0.12)" }}
                >
                    <div className="flex items-center gap-1.5">
                        <Users size={11} style={{ color: "rgba(139,94,60,0.5)" }} />
                        <span className="text-xs" style={{ color: "rgba(10,41,71,0.5)" }}>
                            <span className="font-semibold">{workspace.members_count ?? 0}</span>{" "}
                            {workspace.members_count === 1 ? "member" : "members"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <FolderKanban size={11} style={{ color: "rgba(139,94,60,0.5)" }} />
                        <span className="text-xs" style={{ color: "rgba(10,41,71,0.5)" }}>
                            <span className="font-semibold">{workspace.projects_count ?? 0}</span>{" "}
                            {workspace.projects_count === 1 ? "project" : "projects"}
                        </span>
                    </div>
                </div>
            </div>
        </a>
    );
}

// ── Create Workspace Modal ────────────────────────────────────────────────────
function CreateWorkspaceModal({ onClose }) {
    const { data, setData, post, processing, errors } = useForm({ name: "" });
    const [inputFocused, setInputFocused] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post("/workspaces", { onSuccess: () => onClose() });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(10,41,71,0.7)", backdropFilter: "blur(10px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full max-w-sm rounded-2xl p-7 space-y-6 shadow-2xl"
                style={{ background: "#0d3260", border: "1px solid #1a3f6e" }}
            >
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h2
                            className="font-display font-black text-2xl"
                            style={{ color: "#f3e4c9", letterSpacing: "0.03em" }}
                        >
                            New Workspace
                        </h2>
                        <p className="text-xs" style={{ color: "rgba(211,212,192,0.45)" }}>
                            Give your team a dedicated space to collaborate.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 transition-colors duration-150"
                        style={{ color: "rgba(211,212,192,0.4)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#f3e4c9")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(211,212,192,0.4)")}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={submit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label
                            className="block text-[10px] font-black uppercase tracking-widest"
                            style={{ color: "#f3e4c9" }}
                        >
                            Workspace Name
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Marketing Ops"
                            value={data.name}
                            onChange={(e) => setData("name", e.target.value)}
                            autoFocus
                            className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all duration-200 placeholder:opacity-40"
                            style={{
                                background: "rgba(10,41,71,0.7)",
                                border: `1.5px solid ${errors.name ? "#c0392b" : inputFocused ? "#8b5e3c" : "rgba(139,94,60,0.25)"}`,
                                color: "#f3e4c9",
                                boxShadow: inputFocused ? "0 0 0 3px rgba(139,94,60,0.15)" : "none",
                            }}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                        />
                        {errors.name && (
                            <p className="text-xs" style={{ color: "#c0392b" }}>{errors.name}</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                            style={{ background: "#8b5e3c", color: "#f3e4c9", boxShadow: "0 4px 20px rgba(139,94,60,0.25)" }}
                            onMouseEnter={(e) => { if (!processing) e.currentTarget.style.background = "#a06b43"; }}
                            onMouseLeave={(e) => { if (!processing) e.currentTarget.style.background = "#8b5e3c"; }}
                        >
                            {processing ? (
                                <div className="w-4 h-4 rounded-full border-2 animate-spin"
                                    style={{ borderColor: "rgba(243,228,201,0.3)", borderTopColor: "#f3e4c9" }} />
                            ) : (
                                <><Plus size={14} /> Create Workspace</>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                            style={{
                                background: "rgba(243,228,201,0.06)",
                                border: "1px solid rgba(243,228,201,0.12)",
                                color: "rgba(211,212,192,0.5)",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(243,228,201,0.1)"; e.currentTarget.style.color = "#f3e4c9"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(243,228,201,0.06)"; e.currentTarget.style.color = "rgba(211,212,192,0.5)"; }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onCreateClick }) {
    return (
        <div
            className="col-span-full flex flex-col items-center justify-center py-24 rounded-2xl text-center space-y-5"
            style={{
                background: "rgba(243,228,201,0.5)",
                border: "1.5px dashed rgba(139,94,60,0.25)",
            }}
        >
            <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(139,94,60,0.1)", border: "1px solid rgba(139,94,60,0.2)" }}
            >
                <FolderKanban size={22} style={{ color: "rgba(139,94,60,0.6)" }} />
            </div>
            <div className="space-y-1.5">
                <p
                    className="font-display font-black text-lg"
                    style={{ color: "#0a2947", letterSpacing: "0.03em" }}
                >
                    No workspaces yet
                </p>
                <p className="text-sm max-w-xs mx-auto" style={{ color: "rgba(10,41,71,0.45)" }}>
                    Create your first workspace and invite your team to get started.
                </p>
            </div>
            <button
                onClick={onCreateClick}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.98]"
                style={{ background: "#8b5e3c", color: "#f3e4c9" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#a06b43")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#8b5e3c")}
            >
                <Plus size={14} />
                Create your first workspace
            </button>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Index({ workspaces }) {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <Head title="Workspaces — Scaffold" />

            {/* Page header */}
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <p
                        className="text-[10px] font-bold uppercase tracking-[0.25em]"
                        style={{ color: "rgba(139,94,60,0.7)" }}
                    >
                        Your workspaces
                    </p>
                    <h1
                        className="font-display font-black text-4xl"
                        style={{ color: "#0a2947", letterSpacing: "0.04em" }}
                    >
                        {workspaces.length > 0
                            ? `${workspaces.length} ${workspaces.length === 1 ? "workspace" : "workspaces"}`
                            : "Workspaces"}
                    </h1>
                </div>

                <button
                    id="create-workspace-btn"
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 active:scale-[0.97]"
                    style={{
                        background: "#8b5e3c",
                        color: "#f3e4c9",
                        boxShadow: "0 4px 20px rgba(139,94,60,0.2)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#a06b43")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#8b5e3c")}
                >
                    <Plus size={15} strokeWidth={2.5} />
                    New Workspace
                </button>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(139,94,60,0.15)" }} />

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {workspaces.length === 0 ? (
                    <EmptyState onCreateClick={() => setShowModal(true)} />
                ) : (
                    workspaces.map((ws) => (
                        <WorkspaceCard key={ws.id} workspace={ws} />
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && <CreateWorkspaceModal onClose={() => setShowModal(false)} />}
        </div>
    );
}

Index.layout = (page) => <AppLayout children={page} />;
