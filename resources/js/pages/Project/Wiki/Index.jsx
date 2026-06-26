import { useState } from "react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, Link, router } from "@inertiajs/react";
import ProjectHeader from "@/components/project/ProjectHeader";
import { FileText, Plus, Search, Edit2, Trash2, BookOpen, Calendar, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
        <div className="space-y-6">
            <Head title={`${project.name} - Wiki`} />
            <ProjectHeader workspace={workspace} project={project} activeTab="wiki" />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Sidebar - List of Wiki Pages */}
                <div className="flex flex-col space-y-4 rounded-3xl border border-border/80 bg-surface2/40 p-4 lg:col-span-1">
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                        <span className="text-xs font-black uppercase tracking-widest text-muted">
                            Wiki Pages
                        </span>
                        <Link
                            href={`/workspaces/${workspace.slug}/projects/${project.slug}/wiki/create`}
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-accent text-black shadow transition-transform hover:scale-105"
                            title="New Wiki Page"
                        >
                            <Plus size={14} strokeWidth={3} />
                        </Link>
                    </div>

                    {/* Search bar */}
                    <div className="relative">
                        <Search
                            className="absolute top-2.5 left-3 text-muted"
                            size={14}
                        />
                        <input
                            type="text"
                            placeholder="Search wiki..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-border/60 bg-surface/50 py-1.5 pr-3 pl-9 text-xs text-white placeholder-muted focus:border-accent focus:outline-none"
                        />
                    </div>

                    {/* Wiki list */}
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[50vh] lg:max-h-[60vh]">
                        {filteredWikis.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted font-semibold uppercase tracking-wider">
                                No pages found
                            </div>
                        ) : (
                            filteredWikis.map((wiki) => {
                                const isActive = currentWiki && currentWiki.id === wiki.id;
                                return (
                                    <Link
                                        key={wiki.id}
                                        href={`/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${wiki.slug}`}
                                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                                            isActive
                                                ? "bg-accent text-black shadow-lg"
                                                : "text-muted hover:bg-surface2/50 hover:text-white"
                                        }`}
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
                <div className="flex flex-col space-y-4 rounded-3xl border border-border/80 bg-surface2/20 p-6 lg:col-span-3">
                    {currentWiki ? (
                        <div className="space-y-6">
                            {/* Wiki header actions */}
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-4">
                                <div className="space-y-1.5">
                                    <h2 className="text-xl font-display font-black uppercase tracking-tight text-white sm:text-2xl">
                                        {currentWiki.title}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest text-muted">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            Updated {new Date(currentWiki.updated_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${currentWiki.slug}/edit`}
                                        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted transition-colors hover:text-white"
                                    >
                                        <Edit2 size={12} />
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(currentWiki.slug)}
                                        className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20"
                                    >
                                        <Trash2 size={12} />
                                        Delete
                                    </button>
                                </div>
                            </div>

                            {/* Wiki Body Content */}
                            <div className="prose prose-invert max-w-none text-sm leading-relaxed text-zinc-300">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {currentWiki.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-96 flex-col items-center justify-center space-y-4 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-surface2/60 border border-border/80 text-muted">
                                <BookOpen size={24} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                                    Project Knowledge Base
                                </h3>
                                <p className="text-xs text-muted max-w-xs leading-normal">
                                    Create Markdown documents to capture team notes, specifications, snippets, and guides.
                                </p>
                            </div>
                            <Link
                                href={`/workspaces/${workspace.slug}/projects/${project.slug}/wiki/create`}
                                className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-lg transition-transform hover:scale-105"
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
