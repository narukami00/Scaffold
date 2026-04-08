import { router, usePage } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useState } from "react";

export default function AppLayout({ children }) {
    const { auth } = usePage().props;
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
                <div className="flex items-center justify-between p-4 sm:p-6">
                    <div
                        className={`overflow-hidden transition-all ${
                            isPrimarySidebarOpen ? "max-w-[180px]" : "max-w-0 lg:max-w-[32px]"
                        }`}
                    >
                        <h1 className="text-xl font-bold tracking-tight text-accent">
                            {isPrimarySidebarOpen ? "Scaffold" : "S"}
                        </h1>
                    </div>
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
                            <Menu size={16} />
                        )}
                    </button>
                </div>

                <nav className="px-4 pb-2 lg:flex-1 lg:space-y-2">
                    {/* Navigation links will go here */}
                    {isPrimarySidebarOpen && (
                        <div className="px-2 py-4 text-xs font-semibold uppercase tracking-wider text-muted">
                            Workspace
                        </div>
                    )}
                </nav>

                <div className="border-t border-border p-4">
                    <div className="flex items-center gap-3 px-2 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/30 bg-accent/20 text-xs font-black uppercase text-accent">
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
                    <button
                        type="button"
                        onClick={() => router.post("/logout")}
                        className="mt-3 w-full rounded-2xl border border-border bg-surface2 px-4 py-2 text-xs font-black uppercase tracking-widest text-muted transition-colors hover:border-accent/40 hover:text-accent"
                    >
                        {isPrimarySidebarOpen ? "Logout" : <ChevronRight size={14} className="mx-auto rotate-180" />}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="hidden h-16 shrink-0 items-center border-b border-border bg-surface/50 px-8 backdrop-blur-md lg:flex">
                    <div className="text-sm text-muted">Breadcrumb / Here</div>
                </header>

                <section className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </section>
            </main>
        </div>
    );
}
