import { useEffect, useState, useRef } from "react";
import { router } from "@inertiajs/react";
import { Search, FileText, LayoutGrid, MessageSquare, Briefcase, Sparkles, HelpCircle } from "lucide-react";
import axios from "axios";

export default function CommandPalette({ workspace, project = null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState({ projects: [], tasks: [], threads: [], wikis: [] });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    // Flat array of navigable options (quick actions + fetched results)
    const quickActions = project
        ? [
              { type: "action", label: "Go to Kanban Board", icon: LayoutGrid, url: `/workspaces/${workspace.slug}/projects/${project.slug}/board` },
              { type: "action", label: "Go to Threads & Chats", icon: MessageSquare, url: `/workspaces/${workspace.slug}/projects/${project.slug}/threads` },
              { type: "action", label: "Go to Project Wiki", icon: FileText, url: `/workspaces/${workspace.slug}/projects/${project.slug}/wiki` },
          ]
        : [];

    const totalNavigable = [
        ...quickActions,
        ...results.projects.map((p) => ({ type: "project", label: p.name, url: `/workspaces/${workspace.slug}/projects/${p.slug}` })),
        ...results.tasks.map((t) => ({ type: "task", label: t.title, subtitle: `Status: ${t.status}`, url: `/workspaces/${workspace.slug}/projects/${t.project?.slug}/board` })),
        ...results.threads.map((th) => ({ type: "thread", label: th.title, url: `/workspaces/${workspace.slug}/projects/${th.project?.slug}/threads/${th.id}` })),
        ...(results.wikis || []).map((w) => ({ type: "wiki", label: w.title, url: `/workspaces/${workspace.slug}/projects/${w.project?.slug}/wiki/${w.slug}` })),
    ];

    // Toggle palette on Ctrl+K or Cmd+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setResults({ projects: [], tasks: [], threads: [], wikis: [] });
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Handle searching
    useEffect(() => {
        if (query.trim().length < 2) {
            setResults({ projects: [], tasks: [], threads: [], wikis: [] });
            return;
        }

        const fetchResults = async () => {
            try {
                const { data } = await axios.get(
                    `/workspaces/${workspace.slug}/search?q=${encodeURIComponent(query)}`
                );
                setResults(data);
                setSelectedIndex(0);
            } catch (err) {
                console.error("Search failed", err);
            }
        };

        const timer = setTimeout(fetchResults, 100); // 100ms debounce
        return () => clearTimeout(timer);
    }, [query, workspace.slug]);

    // Keyboard navigation inside the list
    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            setIsOpen(false);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % totalNavigable.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + totalNavigable.length) % totalNavigable.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const selected = totalNavigable[selectedIndex];
            if (selected) {
                router.visit(selected.url);
                setIsOpen(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/75 p-4 pt-[15vh] backdrop-blur-md animate-fade-in"
            onClick={() => setIsOpen(false)}
        >
            <div 
                className="relative w-full max-w-lg overflow-hidden rounded-[24px] border border-border/80 bg-surface shadow-2xl focus:outline-none"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Bar Input */}
                <div className="relative flex items-center border-b border-border/50 px-4">
                    <Search className="text-muted mr-3" size={16} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search workspace (tasks, threads, wikis)..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent py-4 text-xs text-white placeholder-muted focus:outline-none"
                    />
                    <kbd className="hidden sm:inline-block rounded border border-border bg-surface2/60 px-2 py-0.5 font-mono text-[9px] font-bold text-muted uppercase tracking-widest">
                        ESC
                    </kbd>
                </div>

                {/* Results / Navigation list */}
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-4 custom-scrollbar">
                    {totalNavigable.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Sparkles className="text-muted mb-2 animate-pulse" size={20} />
                            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                                {query.length < 2 ? "Type to search..." : "No results found"}
                            </p>
                            <p className="text-[10px] text-muted max-w-xs mt-1">
                                Search for workspaces, tasks, discussions, or select standard workspace shortcuts.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {/* Render Navigables */}
                            {totalNavigable.map((item, index) => {
                                const isSelected = index === selectedIndex;
                                const Icon = item.icon || (item.type === "project" ? Briefcase : item.type === "task" ? LayoutGrid : item.type === "wiki" ? FileText : MessageSquare);
                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            router.visit(item.url);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                                            isSelected
                                                ? "bg-accent text-black shadow-lg"
                                                : "text-muted hover:bg-surface2/50 hover:text-white"
                                        }`}
                                    >
                                        <Icon size={14} className="shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{item.label}</p>
                                            {item.subtitle && (
                                                <p className={`text-[9px] font-black uppercase tracking-wider ${
                                                    isSelected ? "text-zinc-800" : "text-muted"
                                                }`}>
                                                    {item.subtitle}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${
                                            isSelected ? "text-zinc-800 bg-black/10" : "text-muted bg-surface2"
                                        } px-2 py-0.5 rounded-lg border border-white/5`}>
                                            {item.type}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer hints */}
                <div className="flex justify-between items-center bg-[#09090b] px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted border-t border-border/30">
                    <span className="flex items-center gap-1">
                        ↑↓ to select
                    </span>
                    <span>
                        Enter to navigate
                    </span>
                </div>
            </div>
        </div>
    );
}
