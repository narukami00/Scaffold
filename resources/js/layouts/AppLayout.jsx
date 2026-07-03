import { usePage, Link } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, LayoutDashboard, LogOut, FolderKanban, Settings, Plus } from "lucide-react";
import { useState } from "react";
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
    const [open, setOpen] = useState(true);

    const initials = user?.name
        ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : "U";

    return (
        <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "#0a2947" }}>

            {/* ── PRIMARY SIDEBAR ──────────────────────────────────────────────── */}
            <aside
                className={`w-full shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r transition-all duration-300 ${open ? "lg:w-60" : "lg:w-[68px]"}`}
                style={{ background: "#071d38", borderColor: "#1a3f6e" }}
            >
                {/* Logo */}
                <div
                    className={`flex items-center h-16 shrink-0 border-b px-4 ${open ? "justify-between px-5" : "justify-center"}`}
                    style={{ borderColor: "#1a3f6e" }}
                >
                    {open && (
                        <Link href="/workspaces" className="flex items-center gap-2.5 min-w-0">
                            <ScaffoldMark size={26} />
                            <span className="font-display font-black text-lg truncate"
                                style={{ color: "#f3e4c9", letterSpacing: "0.04em" }}>
                                Scaffold
                            </span>
                        </Link>
                    )}
                    {!open && (
                        <button type="button" onClick={() => setOpen(true)} title="Expand sidebar">
                            <ScaffoldMark size={26} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setOpen(v => !v)}
                        className={`shrink-0 rounded-lg p-1.5 transition-all duration-150 ${!open ? "hidden" : ""}`}
                        style={{ background: "rgba(243,228,201,0.06)", border: "1px solid rgba(243,228,201,0.12)", color: "rgba(243,228,201,0.5)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(243,228,201,0.12)"; e.currentTarget.style.color = "#f3e4c9"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(243,228,201,0.06)"; e.currentTarget.style.color = "rgba(243,228,201,0.5)"; }}
                    >
                        {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">

                    {/* Workspaces link */}
                    <NavItem href="/workspaces" icon={<LayoutDashboard size={15} strokeWidth={2} />} label="Workspaces" open={open} />

                    {/* Workspace + projects section */}
                    {workspace && (
                        <div className="pt-4">
                            {open && (
                                <p className="px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.2em]"
                                    style={{ color: "rgba(211,212,192,0.35)" }}>
                                    Workspace
                                </p>
                            )}

                            {/* Workspace name link */}
                            <NavItem
                                href={`/workspaces/${workspace.slug}`}
                                icon={
                                    <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0"
                                        style={{ background: "rgba(139,94,60,0.35)", color: "#f3e4c9" }}>
                                        {workspace.name.charAt(0).toUpperCase()}
                                    </span>
                                }
                                label={workspace.name}
                                open={open}
                                exactMatch
                            />

                            {/* Projects list */}
                            {workspaceProjects && workspaceProjects.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                    {open && (
                                        <div className="flex items-center justify-between px-3 py-1">
                                            <p className="text-[9px] font-bold uppercase tracking-[0.2em]"
                                                style={{ color: "rgba(211,212,192,0.3)" }}>
                                                Projects
                                            </p>
                                        </div>
                                    )}
                                    {workspaceProjects.map(proj => (
                                        <ProjectNavItem key={proj.id} project={proj} workspace={workspace} open={open} />
                                    ))}
                                </div>
                            )}

                            {/* Settings link */}
                            {open ? (
                                <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(26,63,110,0.5)" }}>
                                    <Link
                                        href={`/workspaces/${workspace.slug}?tab=settings`}
                                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-150"
                                        style={{ color: "rgba(211,212,192,0.4)" }}
                                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(243,228,201,0.06)"; e.currentTarget.style.color = "#f3e4c9"; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(211,212,192,0.4)"; }}
                                    >
                                        <Settings size={12} strokeWidth={2} />
                                        Settings
                                    </Link>
                                </div>
                            ) : (
                                <div className="mt-2 flex justify-center">
                                    <Link
                                        href={`/workspaces/${workspace.slug}?tab=settings`}
                                        className="p-2 rounded-lg transition-all duration-150"
                                        style={{ color: "rgba(211,212,192,0.4)" }}
                                        onMouseEnter={e => { e.currentTarget.style.color = "#f3e4c9"; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(211,212,192,0.4)"; }}
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
                    <div className={`flex items-center gap-3 px-2 py-2 mb-2 ${!open ? "justify-center px-0" : ""}`}>
                        <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black"
                            style={{ background: "#8b5e3c", color: "#f3e4c9" }}>
                            {initials}
                        </div>
                        {open && (
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold" style={{ color: "#f3e4c9" }}>
                                    {user?.name || "User"}
                                </div>
                                <div className="truncate text-[10px] uppercase tracking-widest" style={{ color: "rgba(211,212,192,0.45)" }}>
                                    {user?.email || ""}
                                </div>
                            </div>
                        )}
                    </div>
                    <Link
                        href="/logout" method="post" as="button" type="button"
                        className={`w-full rounded-xl py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 ${open ? "px-3 justify-start" : "justify-center px-0"}`}
                        style={{ background: "rgba(243,228,201,0.05)", border: "1px solid rgba(243,228,201,0.1)", color: "rgba(211,212,192,0.5)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(243,228,201,0.1)"; e.currentTarget.style.color = "#f3e4c9"; e.currentTarget.style.borderColor = "rgba(243,228,201,0.2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(243,228,201,0.05)"; e.currentTarget.style.color = "rgba(211,212,192,0.5)"; e.currentTarget.style.borderColor = "rgba(243,228,201,0.1)"; }}
                    >
                        <LogOut size={13} />
                        {open && "Logout"}
                    </Link>
                </div>
            </aside>

            {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden min-h-screen lg:min-h-0">
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
        </div>
    );
}

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ href, icon, label, open, exactMatch = false }) {
    const { url } = usePage();
    const isActive = exactMatch
        ? (url === href || url.startsWith(href + "?"))
        : (url === href || url.startsWith(href + "?") || url.startsWith(href + "/"));

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${!open ? "justify-center px-0" : ""}`}
            style={{ background: isActive ? "#f3e4c9" : "transparent", color: isActive ? "#0a2947" : "rgba(211,212,192,0.6)" }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(243,228,201,0.08)"; e.currentTarget.style.color = "#f3e4c9"; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(211,212,192,0.6)"; } }}
        >
            <span className="shrink-0">{icon}</span>
            {open && <span className="truncate uppercase tracking-widest text-[10px] font-bold">{label}</span>}
        </Link>
    );
}

// ── ProjectNavItem ────────────────────────────────────────────────────────────
function ProjectNavItem({ project, workspace, open }) {
    const { url } = usePage();
    const href = `/workspaces/${workspace.slug}/projects/${project.slug}`;
    const isActive = url.startsWith(href);

    return (
        <Link
            href={href}
            className={`flex items-center gap-2 rounded-xl py-2 text-[11px] font-medium transition-all duration-150 ${open ? "px-3" : "justify-center px-0"}`}
            style={{
                background: isActive ? "rgba(243,228,201,0.08)" : "transparent",
                color: isActive ? "#f3e4c9" : "rgba(211,212,192,0.5)",
                borderLeft: isActive ? "2px solid #8b5e3c" : "2px solid transparent",
                paddingLeft: open ? (isActive ? "10px" : "12px") : undefined,
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(243,228,201,0.05)"; e.currentTarget.style.color = "#f3e4c9"; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(211,212,192,0.5)"; } }}
        >
            {open ? (
                <>
                    <span style={{ color: "rgba(139,94,60,0.6)", fontSize: 12 }}>#</span>
                    <span className="truncate">{project.name}</span>
                </>
            ) : (
                <span className="text-[9px] font-black">
                    {project.name.charAt(0).toUpperCase()}
                </span>
            )}
        </Link>
    );
}
