import { useState } from "react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, Link } from "@inertiajs/react";
import ProjectHeader from "@/components/project/ProjectHeader";
import SettingsModal from "@/components/project/SettingsModal";
import { GitBranch, GitCommit, AlertTriangle } from "lucide-react";

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

export default function Feed({ workspace, project, commits = [], error = null, githubLinked = false }) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <Head title={`${project.name} - Git Feed`} />
            <ProjectHeader workspace={workspace} project={project} activeTab="activity" />

            <SettingsModal
                workspace={workspace}
                project={project}
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Timeline Feed */}
                <div className="rounded-2xl border p-6 lg:col-span-2 space-y-6"
                    style={{ background: C.card, borderColor: C.border }}>
                    <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.border }}>
                        <div className="flex items-center gap-2">
                            <GitBranch style={{ color: C.brown }} size={18} />
                            <h2 className="text-sm font-display font-black uppercase tracking-widest" style={{ color: C.navy }}>
                                Commit History
                            </h2>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 rounded-2xl border p-4"
                            style={{ borderColor: "rgba(192,57,43,0.25)", background: "rgba(192,57,43,0.03)", color: "#c0392b" }}>
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <div className="text-xs space-y-1">
                                <p className="font-bold">GitHub Sync Error</p>
                                <p className="opacity-90 leading-normal">{error}</p>
                            </div>
                        </div>
                    )}

                    {!githubLinked ? (
                        <div className="flex h-72 flex-col items-center justify-center space-y-4 text-center animate-fadeIn">
                            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border text-muted animate-pulse-slow"
                                style={{ background: "rgba(139,94,60,0.08)", borderColor: C.border, color: C.muted }}>
                                <GitBranch size={24} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-display font-black text-lg" style={{ color: C.navy }}>
                                    Connect GitHub Repository
                                </h3>
                                <p className="text-xs max-w-sm leading-normal font-semibold animate-pulse-slow" style={{ color: C.muted }}>
                                    Link this project to a remote GitHub repository to sync commits, branches, and pull requests in real time.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSettingsOpen(true)}
                                className="flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all mt-1 bg-[#8b5e3c] text-[#f3e4c9] shadow-sm font-sans cursor-pointer active:scale-95 duration-200"
                                style={{ borderColor: C.border }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#a06b43"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "#8b5e3c"; }}
                            >
                                Configure GitHub Sync
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fadeIn">
                            {commits.length === 0 ? (
                                <div className="py-12 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                                    No commits recorded in this repository.
                                </div>
                            ) : (
                                <div className="relative border-l-2 pl-5 ml-3 space-y-6" style={{ borderColor: "rgba(139,94,60,0.15)" }}>
                                    {commits.map((commit) => (
                                        <div key={commit.hash} className="relative group">
                                            {/* Bullet icon */}
                                            <span className="absolute -left-[27px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-4 shadow"
                                                style={{ backgroundColor: C.brown, borderColor: C.card }}></span>

                                            <div className="space-y-1.5 rounded-2xl border p-4 transition-all group-hover:border-slate-400 bg-black/[0.01]"
                                                style={{ borderColor: C.border }}>
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="font-mono text-[9px] font-black px-2 py-0.5 rounded-lg border"
                                                        style={{ color: C.brown, background: "rgba(139,94,60,0.08)", borderColor: C.border }}>
                                                        {commit.short_hash}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest font-mono" style={{ color: C.muted }}>
                                                        {commit.date}
                                                    </span>
                                                </div>

                                                <p className="text-xs font-bold leading-relaxed" style={{ color: C.navy }}>
                                                    {commit.message}
                                                </p>

                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest pt-2 border-t"
                                                    style={{ borderColor: "rgba(139,94,60,0.12)", color: C.muted }}>
                                                    <span style={{ color: C.navy }}>{commit.author_name}</span>
                                                    <span>&lt;{commit.author_email}&gt;</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel: GitHub connection detail / benefits */}
                <div className="space-y-6">
                    {githubLinked ? (
                        <div className="rounded-2xl border p-6 self-start space-y-4 shadow-sm animate-fadeIn"
                            style={{ background: C.card, borderColor: C.border }}>
                            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: C.border }}>
                                <GitBranch style={{ color: C.brown }} size={16} />
                                <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: C.navy }}>
                                    GitHub Connected
                                </h3>
                            </div>
                            <p className="text-xs leading-relaxed font-semibold" style={{ color: C.muted }}>
                                This project is connected to the remote GitHub repository:
                            </p>
                            <div className="p-3 rounded-xl border bg-white/40 font-mono text-[10px] break-all" style={{ borderColor: C.border, color: C.navy }}>
                                {project.github_repository?.full_name}
                            </div>
                            <div className="rounded-xl border p-3 text-[10px] space-y-1.5"
                                style={{ borderColor: C.border, background: "rgba(45,106,79,0.03)" }}>
                                <p className="font-black uppercase tracking-wider text-[9px] text-[#2d6a4f]">
                                    Webhook Sync Active
                                </p>
                                <p className="leading-normal font-semibold" style={{ color: C.muted }}>
                                    Commits, branches, and PRs sync automatically in real-time. Commits containing keywords (e.g. <code>fixes #14</code>) will auto-close tasks.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border p-6 self-start space-y-4 shadow-sm animate-fadeIn"
                            style={{ background: C.card, borderColor: C.border }}>
                            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: C.border }}>
                                <GitBranch style={{ color: C.brown }} size={16} />
                                <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: C.navy }}>
                                    GitHub Integration
                                </h3>
                            </div>
                            <p className="text-xs leading-relaxed font-semibold" style={{ color: C.muted }}>
                                Connecting your project to GitHub enables:
                            </p>
                            <ul className="list-disc pl-4 text-xs font-semibold space-y-1.5" style={{ color: C.muted }}>
                                <li>Automatic task-to-PR linking</li>
                                <li>Real-time sync of branches and pull requests</li>
                                <li>Commit timeline feed inside the project</li>
                                <li>Keyword-based auto-closing of tasks (e.g. <code>fixes #12</code>)</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

Feed.layout = (page) => <WorkspaceLayout children={page} />;
