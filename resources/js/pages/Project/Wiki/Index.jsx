import { useState } from "react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, Link, router } from "@inertiajs/react";
import ProjectHeader from "@/components/project/ProjectHeader";
import { FileText, Plus, Search, Edit2, Trash2, BookOpen, Calendar, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export default function Index({ workspace, project, wikis = [], currentWiki = null }) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredWikis = wikis.filter((wiki) =>
        wiki.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = (wikiSlug) => {
        if (confirm("Are you sure you want to delete this wiki page?")) {
            router.delete(
                `/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${wikiSlug}`
            );
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <Head title={`${project.name} - Wiki`} />
            <ProjectHeader workspace={workspace} project={project} activeTab="wiki" />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Sidebar - List of Wiki Pages */}
                <div className="flex flex-col space-y-4 rounded-2xl border p-4 lg:col-span-1"
                    style={{ background: C.card, borderColor: C.border }}>
                    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: C.border }}>
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.muted }}>
                            Wiki Pages
                        </span>
                        <Link
                            href={`/workspaces/${workspace.slug}/projects/${project.slug}/wiki/create`}
                            className="flex h-7 w-7 items-center justify-center rounded-xl transition-all active:scale-[0.95]"
                            style={{ background: C.brown, color: "#f3e4c9" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#a06b43"}
                            onMouseLeave={e => e.currentTarget.style.background = C.brown}
                            title="New Wiki Page"
                        >
                            <Plus size={14} strokeWidth={3} />
                        </Link>
                    </div>

                    {/* Search bar */}
                    <div className="relative">
                        <Search
                            className="absolute top-2.5 left-3"
                            style={{ color: C.muted }}
                            size={14}
                        />
                        <input
                            type="text"
                            placeholder="Search wiki..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border py-1.5 pr-3 pl-9 text-xs outline-none transition-colors"
                            style={{
                                background: "rgba(139,94,60,0.04)",
                                borderColor: C.border,
                                color: C.navy,
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = C.brown}
                            onBlur={e => e.currentTarget.style.borderColor = C.border}
                        />
                    </div>

                    {/* Wiki list */}
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[50vh] lg:max-h-[60vh]">
                        {filteredWikis.length === 0 ? (
                            <div className="py-8 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                                No pages found
                            </div>
                        ) : (
                            filteredWikis.map((wiki) => {
                                const isActive = currentWiki && currentWiki.id === wiki.id;
                                return (
                                    <Link
                                        key={wiki.id}
                                        href={`/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${wiki.slug}`}
                                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all"
                                        style={{
                                            background: isActive ? C.brown : "transparent",
                                            color: isActive ? "#f3e4c9" : C.navy,
                                            boxShadow: isActive ? "0 2px 8px rgba(139,94,60,0.25)" : "none"
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(139,94,60,0.06)"; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                                    >
                                        <FileText size={14} />
                                        <span className="truncate">{wiki.title}</span>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Main Content Area - Wiki Document View */}
                <div className="flex flex-col space-y-4 rounded-2xl border p-6 lg:col-span-3 min-h-[400px]"
                    style={{ background: C.card, borderColor: C.border }}>
                    {currentWiki ? (
                        <div className="space-y-6">
                            {/* Wiki header actions */}
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4" style={{ borderColor: C.border }}>
                                <div className="space-y-1.5">
                                    <h2 className="font-display font-black text-2xl" style={{ color: C.navy }}>
                                        {currentWiki.title}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest" style={{ color: C.muted }}>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            Updated {new Date(currentWiki.updated_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${currentWiki.slug}/edit`}
                                        className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all"
                                        style={{ borderColor: C.border, color: C.muted, background: "rgba(139,94,60,0.03)" }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.brown; e.currentTarget.style.color = C.brown; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
                                    >
                                        <Edit2 size={12} />
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(currentWiki.slug)}
                                        className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all"
                                        style={{ borderColor: "rgba(192,57,43,0.25)", color: "#c0392b", background: "rgba(192,57,43,0.03)" }}
                                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(192,57,43,0.08)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(192,57,43,0.03)"; }}
                                    >
                                        <Trash2 size={12} />
                                        Delete
                                    </button>
                                </div>
                            </div>

                            {/* Wiki Body Content */}
                            <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-normal">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {currentWiki.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-96 flex-col items-center justify-center space-y-4 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border"
                                style={{ background: "rgba(139,94,60,0.08)", borderColor: C.border, color: C.muted }}>
                                <BookOpen size={24} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-display font-black text-lg" style={{ color: C.navy }}>
                                    Project Knowledge Base
                                </h3>
                                <p className="text-xs max-w-xs leading-normal font-semibold" style={{ color: C.muted }}>
                                    Create Markdown documents to capture team notes, specifications, snippets, and guides.
                                </p>
                            </div>
                            <Link
                                href={`/workspaces/${workspace.slug}/projects/${project.slug}/wiki/create`}
                                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.98]"
                                style={{ background: C.brown, color: "#f3e4c9" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#a06b43"}
                                onMouseLeave={e => e.currentTarget.style.background = C.brown}
                            >
                                <Plus size={14} strokeWidth={3} />
                                Create First Page
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

Index.layout = (page) => <WorkspaceLayout children={page} />;
