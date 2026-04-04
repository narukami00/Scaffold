export default function AppLayout({ children }) {
    return (
        <div className="min-h-screen flex bg-bg text-text selection:bg-accent/30">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0">
                <div className="p-6">
                    <h1 className="text-xl font-bold tracking-tight text-accent">
                        Scaffold
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {/* Navigation links will go here */}
                    <div className="text-xs font-semibold text-muted uppercase tracking-wider px-2 py-4">
                        Workspace
                    </div>
                </nav>

                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 px-2 py-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30" />
                        <div className="text-sm font-medium truncate">
                            User Name
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-md flex items-center px-8 shrink-0">
                    <div className="text-sm text-muted">Breadcrumb / Here</div>
                </header>

                <section className="flex-1 overflow-y-auto p-8">
                    {children}
                </section>
            </main>
        </div>
    );
}
