import { usePage, Link } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, LayoutDashboard, LogOut, FolderKanban, Settings, Plus, Menu, X, Search } from "lucide-react";
import { useState, useEffect } from "react";
import NotificationPanel from "@/components/ui/NotificationPanel";

// ── Scaffold geometric icon mark ──────────────────────────────────────────────
function ScaffoldMark({ size = 28 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.5" y="1.5" width="33" height="33" rx="6" stroke="#f3e4c9" strokeWidth="1.5" strokeOpacity="0.6" />
            <line x1="1.5" y1="12" x2="34.5" y2="12" stroke="#f3e4c9" strokeWidth="1" strokeOpacity="0.35" />
            <line x1="1.5" y1="24" x2="34.5" y2="24" stroke="#f3e4c9" strokeWidth="1" strokeOpacity="0.35" />
            <line x1="12" y1="1.5" x2="12" y2="34.5" stroke="#f3e4c9" strokeWidth="1" strokeOpacity="0.35" />
            <line x1="24" y1="1.5" x2="24" y2="34.5" stroke="#f3e4c9" strokeWidth="1" strokeOpacity="0.35" />
            <circle cx="12" cy="12" r="2.5" fill="#f3e4c9" fillOpacity="0.85" />
            <circle cx="24" cy="12" r="2.5" fill="#f3e4c9" fillOpacity="0.85" />
            <circle cx="12" cy="24" r="2.5" fill="#f3e4c9" fillOpacity="0.85" />
            <circle cx="24" cy="24" r="2.5" fill="#f3e4c9" fillOpacity="0.85" />
            <circle cx="18" cy="18" r="3" fill="#f3e4c9" />
        </svg>
    );
}

export default function AppLayout({ children, onNewProject }) {
    const { auth, workspace, workspaceProjects, project } = usePage().props;
    const user = auth?.user;

    // Persist sidebar open state across transitions (desktop only)
    const [open, setOpen] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("scaffold_sidebar_open");
            return saved !== null ? JSON.parse(saved) : true;
        }
        return true;
    });

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isProjectSearchOpen, setIsProjectSearchOpen] = useState(false);
    const [projectSearchQuery, setProjectSearchQuery] = useState("");
    const [windowHeight, setWindowHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 800);
    const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
    // Tailwind `lg` = 1024px. Below that the nav is a top bar, not a sidebar —
    // never apply the desktop "minimized" icon-rail layout there.
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true
    );
    const navExpanded = !isDesktop || open;

    const workspaces = auth?.workspaces || [];
    const filteredWorkspaces = workspaces.filter(ws =>
        ws.name.toLowerCase().includes(workspaceSearchQuery.toLowerCase())
    );

    const activeWorkspaceSlug = workspace?.slug || workspaces[0]?.slug;
    const profileHref = activeWorkspaceSlug 
        ? `/workspaces/${activeWorkspaceSlug}/members/${user.id}` 
        : "#";

    useEffect(() => {
        const handleResize = () => setWindowHeight(window.innerHeight);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia("(min-width: 1024px)");
        const onChange = (event) => {
            setIsDesktop(event.matches);
            if (event.matches) setMobileMenuOpen(false);
        };
        setIsDesktop(mq.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    const toggleOpen = (val) => {
        setOpen(val);
        if (typeof window !== "undefined") {
            localStorage.setItem("scaffold_sidebar_open", JSON.stringify(val));
        }
    };

    const initials = user?.name
        ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : "U";

    return (
        <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "#0a2947" }}>

            {/* ── PRIMARY SIDEBAR ──────────────────────────────────────────────── */}
            <aside
                className={`w-full shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r lg:h-screen lg:sticky lg:top-0 fixed lg:relative inset-x-0 top-0 z-[80] transition-all duration-300 ${open ? "lg:w-60" : "lg:w-[68px]"} ${mobileMenuOpen ? "h-screen overflow-y-auto" : "h-16 overflow-hidden"}`}
                style={{ background: "#071d38", borderColor: "#1a3f6e" }}
            >
                {/* Logo */}
                <div
                    className={`flex items-center h-16 shrink-0 border-b px-4 ${navExpanded ? "justify-between px-5" : "justify-center"}`}
                    style={{ borderColor: "#1a3f6e" }}
                >
                    {navExpanded ? (
                        <Link href="/workspaces" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 min-w-0">
                            <ScaffoldMark size={26} />
                            <span className="font-display font-black text-lg truncate"
                                style={{ color: "#f3e4c9", letterSpacing: "0.04em" }}>
                                Scaffold
                            </span>
                        </Link>
                    ) : (
                        <button type="button" onClick={() => toggleOpen(true)} title="Expand sidebar" className="hidden lg:block">
                            <ScaffoldMark size={26} />
                        </button>
                    )}

                    {/* Mobile Notification and Hamburger wrapper */}
                    <div className="flex items-center gap-3 lg:hidden">
                        <NotificationPanel />
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(v => !v)}
                            className="shrink-0 rounded-lg p-1.5 transition-all duration-150"
                            style={{ background: "rgba(243,228,201,0.06)", border: "1px solid rgba(243,228,201,0.12)", color: "#f3e4c9" }}
                        >
                            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                        </button>
                    </div>

                    {/* Desktop sidebar toggle chevron */}
                    {open && (
                        <button
                            type="button"
                            onClick={() => toggleOpen(false)}
                            className="hidden lg:block shrink-0 rounded-lg p-1.5 transition-all duration-150"
                            style={{ background: "rgba(243,228,201,0.06)", border: "1px solid rgba(243,228,201,0.12)", color: "rgba(243,228,201,0.5)" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(243,228,201,0.12)"; e.currentTarget.style.color = "#f3e4c9"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(243,228,201,0.06)"; e.currentTarget.style.color = "rgba(243,228,201,0.5)"; }}
                        >
                            <ChevronLeft size={14} />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">

                    {/* Workspaces link */}
                    <NavItem href="/workspaces" icon={<LayoutDashboard size={15} strokeWidth={2} />} label="Workspaces" open={navExpanded} onClick={() => setMobileMenuOpen(false)} />

                    {/* Workspaces list if not currently inside any workspace */}
                    {!workspace && (
                        <div className="pt-4 space-y-2">
                            {navExpanded && (
                                <div className="space-y-2 px-3">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.2em]"
                                        style={{ color: "rgba(211,212,192,0.35)" }}>
                                        My Workspaces
                                    </p>
                                    
                                    {/* Workspaces Search Bar */}
                                    <div className="relative">
                                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={workspaceSearchQuery}
                                            onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                                            placeholder="Search workspaces..."
                                            className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[10px] font-semibold border bg-black/15 outline-none transition-colors border-[#1a3f6e] focus:border-[#8b5e3c]"
                                            style={{ color: "#f3e4c9" }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Workspaces items */}
                            <div className="space-y-0.5 mt-2">
                                {filteredWorkspaces.slice(0, 5).map(ws => (
                                    <NavItem
                                        key={ws.id}
                                        href={`/workspaces/${ws.slug}`}
                                        onClick={() => setMobileMenuOpen(false)}
                                        icon={
                                            <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0"
                                                style={{ background: "rgba(139,94,60,0.35)", color: "#f3e4c9" }}>
                                                {ws.name.charAt(0).toUpperCase()}
                                            </span>
                                        }
                                        label={ws.name}
                                        open={navExpanded}
                                        exactMatch
                                    />
                                ))}

                                {filteredWorkspaces.length > 5 && navExpanded && (
                                    <div className="px-3 text-[9px] font-bold uppercase tracking-wider text-slate-500 py-1">
                                        + {filteredWorkspaces.length - 5} more workspaces
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Workspace + projects section */}
                    {workspace && (
                        <div className="pt-4">
                            {navExpanded && (
                                <p className="px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.2em]"
                                    style={{ color: "rgba(211,212,192,0.35)" }}>
                                    Workspace
                                </p>
                            )}

                            {/* Workspace name link */}
                            <NavItem
                                href={`/workspaces/${workspace.slug}`} onClick={() => setMobileMenuOpen(false)}
                                icon={
                                    <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0"
                                        style={{ background: "rgba(139,94,60,0.35)", color: "#f3e4c9" }}>
                                        {workspace.name.charAt(0).toUpperCase()}
                                    </span>
                                }
                                label={workspace.name}
                                open={navExpanded}
                                exactMatch
                            />

                            {/* Projects list with dynamic height scaling */}
                            {workspaceProjects && workspaceProjects.length > 0 && (() => {
                                const projectsToDisplay = workspaceProjects || [];
                                const maxProjects = Math.max(1, Math.floor((windowHeight - 380) / 36));
                                const showSeeMore = projectsToDisplay.length > maxProjects;
                                const visibleProjects = showSeeMore
                                    ? projectsToDisplay.slice(0, Math.max(1, maxProjects - 1))
                                    : projectsToDisplay;

                                return (
                                    <div className="mt-1 space-y-0.5">
                                        {navExpanded && (
                                            <div className="flex items-center justify-between px-3 py-1">
                                                <p className="text-[9px] font-bold uppercase tracking-[0.2em]"
                                                    style={{ color: "rgba(211,212,192,0.3)" }}>
                                                    Projects
                                                </p>
                                            </div>
                                        )}
                                        {visibleProjects.map(proj => (
                                            <ProjectNavItem key={proj.id} project={proj} workspace={workspace} open={navExpanded} onClick={() => setMobileMenuOpen(false)} />
                                        ))}

                                        {showSeeMore && (
                                            navExpanded ? (
                                                <button
                                                    onClick={() => setIsProjectSearchOpen(true)}
                                                    className="w-full flex items-center gap-2 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all duration-150"
                                                    style={{ color: "#8b5e3c" }}
                                                    onMouseEnter={e => e.currentTarget.style.color = "#f3e4c9"}
                                                    onMouseLeave={e => e.currentTarget.style.color = "#8b5e3c"}
                                                >
                                                    <span>+ See {projectsToDisplay.length - visibleProjects.length} more</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setIsProjectSearchOpen(true)}
                                                    className="w-full flex justify-center py-2 transition-all duration-150"
                                                    style={{ color: "#8b5e3c" }}
                                                    title="See all projects"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            )
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Settings link */}
                            {navExpanded ? (
                                <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(26,63,110,0.5)" }}>
                                    <Link
                                        href={`/workspaces/${workspace.slug}?tab=settings`} onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-150"
                                        style={{ color: "rgba(211,212,192,0.85)" }}
                                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(243,228,201,0.06)"; e.currentTarget.style.color = "#f3e4c9"; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(211,212,192,0.85)"; }}
                                    >
                                        <Settings size={12} strokeWidth={2} />
                                        Settings
                                    </Link>
                                </div>
                            ) : (
                                <div className="mt-2 flex justify-center">
                                    <Link
                                        href={`/workspaces/${workspace.slug}?tab=settings`} onClick={() => setMobileMenuOpen(false)}
                                        className="p-2 rounded-lg transition-all duration-150"
                                        style={{ color: "rgba(211,212,192,0.85)" }}
                                        onMouseEnter={e => { e.currentTarget.style.color = "#f3e4c9"; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(211,212,192,0.85)"; }}
                                    >
                                        <Settings size={13} strokeWidth={2} />
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                {/* User footer */}
                <div className="shrink-0 border-t p-3" style={{ borderColor: "#1a3f6e" }}>
                    <Link
                        href={profileHref}
                        className={`flex items-center gap-3 px-2 py-2 mb-2 rounded-xl transition-all hover:bg-white/5 ${!navExpanded ? "justify-center px-0" : ""}`}
                    >
                        {user.avatar_path ? (
                            <img src={user.avatar_path} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black"
                                style={{ background: "#8b5e3c", color: "#f3e4c9" }}>
                                {initials}
                            </div>
                        )}
                        {navExpanded && (
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold animate-in fade-in duration-200" style={{ color: "#f3e4c9" }}>
                                    {user?.name || "User"}
                                </div>
                                <div className="truncate text-[10px] uppercase tracking-widest" style={{ color: "rgba(211,212,192,0.45)" }}>
                                    {user?.email || ""}
                                </div>
                            </div>
                        )}
                    </Link>
                    <Link
                        href="/logout" method="post" as="button" type="button"
                        className={`w-full rounded-xl py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 ${navExpanded ? "px-3 justify-start" : "justify-center px-0"}`}
                        style={{ background: "rgba(243,228,201,0.05)", border: "1px solid rgba(243,228,201,0.1)", color: "rgba(211,212,192,0.5)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(243,228,201,0.1)"; e.currentTarget.style.color = "#f3e4c9"; e.currentTarget.style.borderColor = "rgba(243,228,201,0.2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(243,228,201,0.05)"; e.currentTarget.style.color = "rgba(211,212,192,0.5)"; e.currentTarget.style.borderColor = "rgba(243,228,201,0.1)"; }}
                    >
                        <LogOut size={13} />
                        {navExpanded && "Logout"}
                    </Link>
                </div>
            </aside>

            {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden min-h-screen lg:min-h-0 pt-16 lg:pt-0">
                {/* Topbar */}
                <header
                    className="hidden lg:flex h-16 shrink-0 items-center justify-between px-8 border-b"
                    style={{ background: "rgba(237,224,200,0.95)", borderColor: "rgba(139,94,60,0.15)", backdropFilter: "blur(12px)" }}
                >
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
                        style={{ color: "rgba(10,41,71,0.4)" }}>
                        {!workspace ? (
                            <span style={{ color: "#0a2947" }}>Workspaces</span>
                        ) : (
                            <>
                                <Link href="/workspaces" className="transition-colors duration-150"
                                    style={{ color: "rgba(10,41,71,0.4)" }}
                                    onMouseEnter={e => e.currentTarget.style.color = "#0a2947"}
                                    onMouseLeave={e => e.currentTarget.style.color = "rgba(10,41,71,0.4)"}>
                                    Workspaces
                                </Link>
                                <span style={{ color: "rgba(10,41,71,0.25)" }}>/</span>
                                <Link href={`/workspaces/${workspace.slug}`} className="transition-colors duration-150"
                                    style={{ color: !project ? "#0a2947" : "rgba(10,41,71,0.4)" }}
                                    onMouseEnter={e => e.currentTarget.style.color = "#0a2947"}
                                    onMouseLeave={e => { if (project) e.currentTarget.style.color = "rgba(10,41,71,0.4)"; }}>
                                    {workspace.name}
                                </Link>
                                {project && (
                                    <>
                                        <span style={{ color: "rgba(10,41,71,0.25)" }}>/</span>
                                        <span style={{ color: "#0a2947" }}>{project.name}</span>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationPanel />
                    </div>
                </header>

                <section className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" style={{ background: "#ede0c8" }}>
                    {children}
                </section>
            </main>

            {/* ── All Projects Search & Navigation Modal ── */}
            {isProjectSearchOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md rounded-[32px] border p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                        style={{ background: "#ede0c8", borderColor: "rgba(139,94,60,0.18)" }}>
                        
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: "#8b5e3c" }}>
                                All Projects
                            </span>
                            <button
                                onClick={() => {
                                    setIsProjectSearchOpen(false);
                                    setProjectSearchQuery("");
                                }}
                                className="rounded-xl border p-2 transition-all hover:bg-black/5"
                                style={{ borderColor: "rgba(139,94,60,0.18)", color: "#0a2947" }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative mb-4">
                            <input
                                type="text"
                                className="w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none transition-all"
                                style={{ borderColor: "rgba(139,94,60,0.18)", background: "#f3e4c9", color: "#0a2947" }}
                                placeholder="Search project by name..."
                                value={projectSearchQuery}
                                onChange={(e) => setProjectSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* List */}
                        <div className="max-h-60 space-y-1 overflow-y-auto custom-scrollbar pr-1">
                            {(workspaceProjects || [])
                                .filter(proj => proj.name.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                                .length === 0 ? (
                                <p className="py-6 text-center text-xs text-slate-500">
                                    No projects found.
                                </p>
                            ) : (
                                (workspaceProjects || [])
                                    .filter(proj => proj.name.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                                    .map(proj => {
                                        const href = `/workspaces/${workspace.slug}/projects/${proj.slug}`;
                                        return (
                                            <Link
                                                key={proj.id}
                                                href={href}
                                                onClick={() => {
                                                    setIsProjectSearchOpen(false);
                                                    setProjectSearchQuery("");
                                                    setMobileMenuOpen(false);
                                                }}
                                                className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:bg-black/[0.03]"
                                                style={{ border: "1px solid transparent" }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,94,60,0.12)"}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                                            >
                                                <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0"
                                                    style={{ background: "rgba(139,94,60,0.15)", color: "#8b5e3c" }}>
                                                    #
                                                </span>
                                                <span className="text-sm font-bold" style={{ color: "#0a2947" }}>
                                                    {proj.name}
                                                </span>
                                            </Link>
                                        );
                                    })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ href, icon, label, open, exactMatch = false, onClick }) {
    const { url } = usePage();
    const isActive = exactMatch
        ? (url === href || url.startsWith(href + "?"))
        : (url === href || url.startsWith(href + "?") || url.startsWith(href + "/"));

    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${!open ? "justify-center px-0" : ""}`}
            style={{ background: isActive ? "#f3e4c9" : "transparent", color: isActive ? "#0a2947" : "rgba(211,212,192,0.85)" }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(243,228,201,0.08)"; e.currentTarget.style.color = "#f3e4c9"; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(211,212,192,0.85)"; } }}
        >
            <span className="shrink-0">{icon}</span>
            {open && <span className="truncate uppercase tracking-widest text-[10px] font-bold">{label}</span>}
        </Link>
    );
}

// ── ProjectNavItem ────────────────────────────────────────────────────────────
function ProjectNavItem({ project, workspace, open, onClick }) {
    const { url } = usePage();
    const href = `/workspaces/${workspace.slug}/projects/${project.slug}`;
    const isActive = url.startsWith(href);

    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-2 rounded-xl text-[11px] font-bold transition-all duration-150 ${open ? "px-3 py-2" : "h-8 w-8 mx-auto justify-center"}`}
            style={{
                background: isActive ? "#f3e4c9" : "transparent",
                color: isActive ? "#0a2947" : "rgba(211,212,192,0.85)",
            }}
            onMouseEnter={e => {
                if (!isActive) {
                    e.currentTarget.style.background = "rgba(243,228,201,0.06)";
                    e.currentTarget.style.color = "#f3e4c9";
                }
            }}
            onMouseLeave={e => {
                if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(211,212,192,0.85)";
                }
            }}
        >
            {open ? (
                <>
                    <span style={{ color: isActive ? "rgba(10,41,71,0.5)" : "rgba(139,94,60,0.6)", fontSize: 12 }}>#</span>
                    <span className="truncate">{project.name}</span>
                </>
            ) : (
                <span className="text-[10px] font-black uppercase">
                    {project.name.charAt(0)}
                </span>
            )}
        </Link>
    );
}
