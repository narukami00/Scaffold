import { Link } from "@inertiajs/react";
import { BarChart3, LayoutGrid, MessageSquare, FileText, Activity } from "lucide-react";

export default function ProjectHeader({ workspace, project, activeTab }) {
    const tabs = [
        { id: "dashboard", label: "Dashboard", href: `/workspaces/${workspace.slug}/projects/${project.slug}`, icon: BarChart3 },
        { id: "board", label: "Board", href: `/workspaces/${workspace.slug}/projects/${project.slug}/board`, icon: LayoutGrid },
        { id: "threads", label: "Threads", href: `/workspaces/${workspace.slug}/projects/${project.slug}/threads`, icon: MessageSquare },
        { id: "docs", label: "Docs", href: `/workspaces/${workspace.slug}/projects/${project.slug}/docs`, icon: FileText },
        { id: "activity", label: "Activity", href: `/workspaces/${workspace.slug}/projects/${project.slug}/activity`, icon: Activity },
    ];

    return (
        <header className="space-y-4 border-b border-border/40 pb-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                <Link href={`/workspaces/${workspace.slug}`} className="hover:text-accent transition-colors">
                    {workspace.name}
                </Link>
                <span>/</span>
                <span className="text-white">{project.name}</span>
            </div>

            {/* Title & Stats */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-display font-black text-white uppercase tracking-tighter sm:text-3xl">
                        {project.name}
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted font-mono">
                        Project ID: <span className="text-accent">{project.slug}</span>
                    </p>
                </div>

                {/* Sub-navigation tabs */}
                <div className="flex bg-surface2/60 border border-border/80 rounded-2xl p-1 shadow-inner self-start sm:self-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all sm:gap-2 sm:px-3.5 sm:py-2 sm:text-xs ${
                                    isSelected
                                        ? "bg-accent text-black shadow-lg scale-[1.03]"
                                        : "text-muted hover:text-white"
                                }`}
                            >
                                <Icon size={12} strokeWidth={2.5} />
                                <span>{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </header>
    );
}
