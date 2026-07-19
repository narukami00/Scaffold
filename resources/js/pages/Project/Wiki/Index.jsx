import { useState, useEffect } from "react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, Link, router } from "@inertiajs/react";
import ProjectHeader from "@/components/project/ProjectHeader";
import { FileText, Plus, Search, Edit2, Trash2, BookOpen, Calendar, User, X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import axios from "axios";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

const getFileExtension = (url) => {
    if (!url) return "";
    const cleanUrl = url.split("?")[0].split("#")[0];
    return cleanUrl.split(".").pop().toLowerCase();
};

const isViewableFile = (url) => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0].split("#")[0];
    const extensions = [
        "txt", "text", "md", "markdown", "json", "js", "ts", "py", "rs", "go",
        "c", "cpp", "h", "hpp", "cs", "java", "sh", "bat", "html", "css", "sql",
        "xml", "yaml", "yml", "pdf"
    ];
    const ext = cleanUrl.split(".").pop().toLowerCase();
    return extensions.includes(ext);
};

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
    const [viewingFileUrl, setViewingFileUrl] = useState(null);
    const [viewingFileName, setViewingFileName] = useState("");
    const [fileContent, setFileContent] = useState("");
    const [fileLoading, setFileLoading] = useState(false);
    const [fileError, setFileError] = useState(null);

    useEffect(() => {
        if (!project?.id || !window.Echo) return;

        const channel = window.Echo.private(`project.${project.id}`);
        const reloadWiki = () => {
            router.reload({ only: ["wikis", "currentWiki"] });
        };

        channel
            .listen(".WikiCreated", reloadWiki)
            .listen(".WikiUpdated", (e) => {
                if (currentWiki && e.wiki?.slug === currentWiki.slug) {
                    router.reload({ only: ["wikis", "currentWiki"] });
                } else {
                    reloadWiki();
                }
            })
            .listen(".WikiDeleted", (e) => {
                if (currentWiki && e.slug === currentWiki.slug) {
                    router.visit(
                        `/workspaces/${workspace.slug}/projects/${project.slug}/wiki`,
                    );
                } else {
                    reloadWiki();
                }
            });

        return () => {
            window.Echo.leave(`project.${project.id}`);
        };
    }, [project?.id, currentWiki?.slug, workspace?.slug, project?.slug]);

    const handleViewFile = (href, fileName) => {
        setViewingFileUrl(href);
        setViewingFileName(fileName);
        setFileLoading(true);
        setFileError(null);
        setFileContent("");

        axios.get(href)
            .then(res => {
                const content = typeof res.data === "object" ? JSON.stringify(res.data, null, 2) : res.data;
                setFileContent(content);
            })
            .catch(err => {
                console.error("Failed to load file contents", err);
                setFileError("Could not retrieve file content.");
            })
            .finally(() => {
                setFileLoading(false);
            });
    };

    const getHighlightedCode = () => {
        if (!fileContent) return "";
        try {
            const ext = getFileExtension(viewingFileUrl);
            let lang = ext;
            if (lang === "js") lang = "javascript";
            if (lang === "ts") lang = "typescript";
            if (lang === "py") lang = "python";
            if (lang === "rs") lang = "rust";
            if (lang === "cs") lang = "csharp";
            if (lang === "bat") lang = "dos";
            if (lang === "yml") lang = "yaml";
            
            if (hljs.getLanguage(lang)) {
                return hljs.highlight(fileContent, { language: lang }).value;
            } else {
                return hljs.highlightAuto(fileContent).value;
            }
        } catch (e) {
            console.error("Highlighting error", e);
            return fileContent;
        }
    };

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
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        a: ({ href, children, ...props }) => {
                                            if (isViewableFile(href)) {
                                                const fileName = children && children[0] ? children[0] : "Attached File";
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewFile(href, fileName)}
                                                        className="font-black underline text-indigo-700 hover:text-indigo-900 cursor-pointer"
                                                        title="Click to view file contents"
                                                    >
                                                        {children}
                                                    </button>
                                                );
                                            }
                                            return <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>;
                                        }
                                    }}
                                >
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

            {/* Code & Text File Viewer Modal */}
            {viewingFileUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-5xl rounded-[28px] border p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
                        style={{ background: C.card, borderColor: C.border }}>
                        
                        {/* Header */}
                        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.border }}>
                            <div className="flex items-center gap-2.5 min-w-0" style={{ color: C.navy }}>
                                <FileText className="shrink-0" style={{ color: C.brown }} size={18} />
                                <h3 className="font-display font-black text-sm uppercase tracking-widest truncate">
                                    {viewingFileName}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {/* Copy Button */}
                                {getFileExtension(viewingFileUrl) !== "md" && getFileExtension(viewingFileUrl) !== "markdown" && fileContent && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(fileContent);
                                            alert("Copied to clipboard!");
                                        }}
                                        className="rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-black/5"
                                        style={{ borderColor: C.border, color: C.navy }}
                                    >
                                        Copy Code
                                    </button>
                                )}
                                {/* Download Button */}
                                <a
                                    href={viewingFileUrl}
                                    download={viewingFileName}
                                    className="rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-black/5"
                                    style={{ borderColor: C.border, color: C.navy }}
                                >
                                    Download
                                </a>
                                {/* Close Button */}
                                <button
                                    type="button"
                                    onClick={() => setViewingFileUrl(null)}
                                    className="rounded-xl border p-1.5 transition-all hover:bg-black/5"
                                    style={{ borderColor: C.border, color: C.navy }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        {fileLoading ? (
                            <div className="flex h-96 flex-col items-center justify-center space-y-2">
                                <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.brown }} />
                                <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.muted }}>Loading file content...</p>
                            </div>
                        ) : fileError ? (
                            <div className="flex h-96 flex-col items-center justify-center text-center p-4">
                                <p className="text-sm font-semibold text-red-700">{fileError}</p>
                                <a href={viewingFileUrl} target="_blank" rel="noreferrer" className="mt-4 text-xs font-bold underline text-indigo-700">
                                    Open directly in browser
                                </a>
                            </div>
                        ) : (getFileExtension(viewingFileUrl) === "md" || getFileExtension(viewingFileUrl) === "markdown") ? (
                            <div className="flex-1 overflow-y-auto mt-4 rounded-xl border p-6 bg-[#fdfaf3] text-slate-800 max-h-[60vh] custom-scrollbar prose prose-sm max-w-none"
                                 style={{ borderColor: C.border }}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {fileContent}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto mt-4 rounded-xl border p-4 bg-slate-950 text-slate-100 max-h-[60vh] custom-scrollbar">
                                <div className="flex items-start font-mono text-[11px] leading-5">
                                    {/* Line Numbers */}
                                    <div className="flex select-none text-slate-500 pr-3 border-r border-slate-800/80 text-right flex-col shrink-0">
                                        {fileContent.split("\n").map((_, i) => (
                                            <span key={i} className="h-5 leading-5">{i + 1}</span>
                                        ))}
                                    </div>
                                    {/* Highlighted Code */}
                                    <pre className="flex-1 pl-4 overflow-x-auto select-text font-mono text-[11px] custom-scrollbar whitespace-pre">
                                        <code className="block leading-5" dangerouslySetInnerHTML={{ __html: getHighlightedCode() }} />
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

Index.layout = (page) => <WorkspaceLayout children={page} />;
