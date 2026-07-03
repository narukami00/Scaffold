import { Link, usePage } from "@inertiajs/react";
import { BarChart3, LayoutGrid, MessageSquare, FileText, Activity, Settings } from "lucide-react";
import { useState } from "react";
import SettingsModal from "@/components/project/SettingsModal";

// ── Palette tokens ────────────────────────────────────────────────────────────
const C = {
    bg:      "#ede0c8",
    card:    "#f3e4c9",
    navy:    "#0a2947",
    brown:   "#8b5e3c",
    sage:    "#d3d4c0",
    border:  "rgba(139,94,60,0.18)",
    muted:   "rgba(10,41,71,0.68)",
};

export default function ProjectHeader({ workspace, project, activeTab }) {
    const { auth } = usePage().props;
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const isOwner = auth?.user?.id === workspace.owner_id;

    const tabs = [
        { id: "dashboard", label: "Dashboard", href: `/workspaces/${workspace.slug}/projects/${project.slug}`, icon: BarChart3 },
        { id: "board", label: "Board", href: `/workspaces/${workspace.slug}/projects/${project.slug}/board`, icon: LayoutGrid },
        { id: "threads", label: "Threads", href: `/workspaces/${workspace.slug}/projects/${project.slug}/threads`, icon: MessageSquare },
        { id: "wiki", label: "Wiki", href: `/workspaces/${workspace.slug}/projects/${project.slug}/wiki`, icon: FileText },
        { id: "activity", label: "Activity", href: `/workspaces/${workspace.slug}/projects/${project.slug}/activity`, icon: Activity },
    ];

    return (
        <header className="space-y-4 border-b pb-4" style={{ borderColor: "rgba(139,94,60,0.15)" }}>
            <SettingsModal
                workspace={workspace}
                project={project}
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {/* Title & Stats & Switcher */}
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: "rgba(139,94,60,0.65)" }}>
                        Project
                    </p>
                    <div className="flex items-center gap-3">
                        <h1 className="font-display font-black text-3xl leading-tight"
                            style={{ color: C.navy, letterSpacing: "0.04em" }}>
                            {project.name}
                        </h1>
                        {isOwner && (
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="transition-all duration-300 hover:rotate-45 p-1 rounded-lg"
                                style={{ color: C.muted }}
                                onMouseEnter={e => e.currentTarget.style.color = C.brown}
                                onMouseLeave={e => e.currentTarget.style.color = C.muted}
                                title="Project Settings"
                            >
                                <Settings size={16} />
                            </button>
                        )}
                    </div>
                    <p className="text-[10px] font-mono" style={{ color: C.muted }}>
                        ID: /{project.slug}
                    </p>
                </div>

                {/* Sub-navigation tabs */}
                <div className="flex items-center gap-1 p-1 rounded-2xl self-start md:self-auto max-w-full overflow-x-auto whitespace-nowrap scrollbar-none"
                    style={{ background: "rgba(139,94,60,0.08)", border: `1px solid ${C.border}` }}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 shrink-0"
                                style={{
                                    background: isSelected ? C.brown : "transparent",
                                    color: isSelected ? "#f3e4c9" : C.muted,
                                    boxShadow: isSelected ? "0 2px 12px rgba(139,94,60,0.25)" : "none",
                                }}
                                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = "rgba(139,94,60,0.1)"; e.currentTarget.style.color = C.navy; } }}
                                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; } }}
                            >
                                <Icon size={13} strokeWidth={2.5} />
                                <span>{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </header>
    );
}
