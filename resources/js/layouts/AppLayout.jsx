import { router, usePage, Link } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, Menu, FolderKanban, LogOut } from "lucide-react";
import { useState } from "react";
import NotificationPanel from "@/components/ui/NotificationPanel";

export default function AppLayout({ children }) {
    const { auth, workspace, project } = usePage().props;
    const user = auth?.user;
    const [isPrimarySidebarOpen, setIsPrimarySidebarOpen] = useState(true);

    return (
        <div className="min-h-screen flex flex-col bg-bg text-text selection:bg-accent/30 lg:flex-row">
            {/* Sidebar */}
            <aside
                className={`w-full border-b border-border bg-surface transition-all lg:border-b-0 lg:border-r lg:shrink-0 ${
                    isPrimarySidebarOpen ? "lg:w-64" : "lg:w-[88px]"
                }`}
            >
                <div className={`flex items-center justify-between border-b border-border p-4 ${isPrimarySidebarOpen ? "sm:p-6" : "lg:p-4 lg:justify-center"}`}>
                    {isPrimarySidebarOpen && (
                        <div className="overflow-hidden transition-all max-w-[180px]">
                            <h1 className="text-xl font-bold tracking-tight text-accent">
                                Scaffold
                            </h1>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() =>
                            setIsPrimarySidebarOpen((current) => !current)
                        }
                        className="rounded-xl border border-border bg-surface2 p-2 text-muted transition-colors hover:border-accent/40 hover:text-accent"
                    >
                        {isPrimarySidebarOpen ? (
                            <ChevronLeft size={16} />
                        ) : (
                            <ChevronRight size={16} />
                        )}
                    </button>
                </div>

                <nav className="px-2 pb-2 lg:flex-1 space-y-1">
                    <Link
                        href="/workspaces"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-muted hover:text-white hover:bg-surface2/50 transition-all ${!isPrimarySidebarOpen ? "justify-center px-0" : ""}`}
                    >
                        <FolderKanban size={14} className="opacity-70" />
                        {isPrimarySidebarOpen ? "Workspaces" : null}
                    </Link>

                    {workspace && (
                        <div className="space-y-1 pt-4">
                            {isPrimarySidebarOpen && (
                                <div className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted border-t border-border/40 mt-2 pt-4">
                                    Active Workspace
                                </div>
                            )}
                            <Link
                                href={`/workspaces/${workspace.slug}`}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-accent bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-all ${!isPrimarySidebarOpen ? "justify-center px-0" : ""}`}
                            >
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/20 text-[9px] font-black uppercase text-accent">
                                    {workspace.name.charAt(0).toUpperCase()}
                                </div>
                                {isPrimarySidebarOpen ? (
                                    <span className="truncate">{workspace.name}</span>
                                ) : null}
                            </Link>
                        </div>
                    )}
                </nav>

                <div className="border-t border-border p-4">
                    <div className={`flex items-center gap-3 px-2 py-3 ${!isPrimarySidebarOpen ? "justify-center px-0" : ""}`}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/20 text-xs font-black uppercase text-accent">
                            {user?.name?.slice(0, 2) || "U"}
                        </div>
                        {isPrimarySidebarOpen && (
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-white">
                                    {user?.name || "User"}
                                </div>
                                <div className="truncate text-[10px] uppercase tracking-widest text-muted">
                                    {user?.email || "Signed In"}
                                </div>
                            </div>
                        )}
                    </div>
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        type="button"
                        className={`mt-3 w-full rounded-2xl border border-border bg-surface2 px-4 py-2 text-xs font-black uppercase tracking-widest text-muted transition-colors hover:border-accent/40 hover:text-accent ${!isPrimarySidebarOpen ? "px-0 py-2.5 flex justify-center" : ""}`}
                    >
                        {isPrimarySidebarOpen ? "Logout" : <LogOut size={14} className="mx-auto" />}
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="hidden h-16 shrink-0 items-center justify-between border-b border-border bg-surface/50 px-8 backdrop-blur-md lg:flex">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
                        {!workspace ? (
                            <span className="text-white">Workspaces</span>
                        ) : (
                            <>
                                <Link href="/workspaces" className="hover:text-accent transition-colors">
                                    Workspaces
                                </Link>
                                <span className="text-muted/50">/</span>
                                <Link
                                    href={`/workspaces/${workspace.slug}`}
                                    className={`hover:text-accent transition-colors ${!project ? "text-white" : "text-muted"}`}
                                >
                                    {workspace.name}
                                </Link>
                                {project && (
                                    <>
                                        <span className="text-muted/50">/</span>
                                        <span className="text-white">{project.name}</span>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationPanel />
                    </div>
                </header>

                <section className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </section>
            </main>
        </div>
    );
}
