import { useEffect, useMemo, useState } from "react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, router } from "@inertiajs/react";
import ProjectHeader from "@/components/project/ProjectHeader";
import SettingsModal from "@/components/project/SettingsModal";
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    ExternalLink,
    GitBranch,
    GitCommit,
    GitPullRequest,
    Search,
    Users,
} from "lucide-react";

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

const formatDate = (value) => {
    if (!value) return "Recently";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Recently"
        : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const statusStyle = (state, draft = false) => {
    if (draft) return { color: "#8b5e3c", background: "rgba(139,94,60,0.1)" };
    if (state === "open") return { color: "#2d6a4f", background: "rgba(45,106,79,0.1)" };
    if (state === "merged") return { color: "#6d3fa0", background: "rgba(109,63,160,0.1)" };
    return { color: "#64748b", background: "rgba(100,116,139,0.1)" };
};

function EmptyState({ children }) {
    return (
        <div className="rounded-2xl border border-dashed px-5 py-12 text-center text-xs font-bold uppercase tracking-wider" style={{ borderColor: C.border, color: C.muted }}>
            {children}
        </div>
    );
}

export default function Feed({
    workspace,
    project,
    commits = [],
    branches = [],
    pullRequests = [],
    issues = [],
    analytics = {},
    filters = {},
    error = null,
    githubLinked = false,
}) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeView, setActiveView] = useState("commits");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCommits = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return commits;
        return commits.filter((commit) =>
            [commit.message, commit.short_hash, commit.author_name, commit.author_login]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query)),
        );
    }, [commits, searchQuery]);

    const chooseBranch = (branch) => {
        router.get(
            window.location.pathname,
            { branch },
            { preserveState: true, preserveScroll: true, replace: true, only: ["commits", "branches", "pullRequests", "issues", "analytics", "filters", "error"] },
        );
    };

    useEffect(() => {
        if (!window.Echo || !project?.id) return;
        const channel = window.Echo.private(`project.${project.id}`);
        channel.listen(".GitHubActivityUpdated", () => {
            router.reload({
                only: ["commits", "branches", "pullRequests", "issues", "analytics", "error"],
            });
        });
        return () => window.Echo.leave(`project.${project.id}`);
    }, [project?.id]);

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

            {!githubLinked ? (
                <div className="flex h-80 flex-col items-center justify-center space-y-4 rounded-2xl border text-center" style={{ background: C.card, borderColor: C.border }}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl border" style={{ background: "rgba(139,94,60,0.08)", borderColor: C.border, color: C.muted }}>
                        <GitBranch size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-display text-lg font-black" style={{ color: C.navy }}>Connect GitHub Repository</h3>
                        <p className="max-w-sm text-xs font-semibold leading-normal" style={{ color: C.muted }}>
                            Link a repository to explore commits by branch, pull requests, issues, contributors, and live webhook activity.
                        </p>
                    </div>
                    <button type="button" onClick={() => setIsSettingsOpen(true)} className="rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest" style={{ background: C.brown, color: C.card }}>
                        Configure GitHub Sync
                    </button>
                </div>
            ) : (
                <>
                    {error && (
                        <div className="flex items-start gap-3 rounded-2xl border p-4" style={{ borderColor: "rgba(192,57,43,0.25)", background: "rgba(192,57,43,0.03)", color: "#c0392b" }}>
                            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                            <div className="space-y-1 text-xs">
                                <p className="font-bold">GitHub connection warning</p>
                                <p className="leading-normal opacity-90">{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                        {[
                            ["Commits", analytics.commits ?? 0, GitCommit],
                            ["Contributors", analytics.contributors ?? 0, Users],
                            ["Branches", analytics.branches ?? 0, GitBranch],
                            ["Open issues", analytics.open_issues ?? 0, AlertCircle],
                            ["Open PRs", analytics.open_pull_requests ?? 0, GitPullRequest],
                            ["Merged PRs", analytics.merged_pull_requests ?? 0, CheckCircle2],
                        ].map(([label, value, Icon]) => (
                            <div key={label} className="rounded-2xl border p-4" style={{ background: C.card, borderColor: C.border }}>
                                <div className="mb-3 flex items-center justify-between">
                                    <Icon size={14} style={{ color: C.brown }} />
                                    <span className="text-2xl font-black" style={{ color: C.navy }}>{value}</span>
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.muted }}>{label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border p-1.5" style={{ background: C.card, borderColor: C.border }} role="tablist" aria-label="GitHub activity views">
                        {[
                            ["commits", "Commits", GitCommit, commits.length],
                            ["branches", "Branches", GitBranch, branches.length],
                            ["pulls", "Pull requests", GitPullRequest, pullRequests.length],
                            ["issues", "Issues", AlertCircle, issues.length],
                        ].map(([value, label, Icon, count]) => (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={activeView === value}
                                onClick={() => setActiveView(value)}
                                className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-wider transition"
                                style={activeView === value ? { background: C.navy, color: C.card } : { color: C.muted }}
                            >
                                <Icon size={13} />
                                {label}
                                <span className="rounded-full px-1.5 py-0.5 text-[8px]" style={{ background: activeView === value ? "rgba(243,228,201,0.12)" : "rgba(139,94,60,0.08)" }}>{count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <section className="space-y-5 rounded-2xl border p-4 sm:p-6 lg:col-span-2" style={{ background: C.card, borderColor: C.border }}>
                            {activeView === "commits" && (
                                <>
                                    <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: C.border }}>
                                        <div>
                                            <h2 className="font-display text-sm font-black uppercase tracking-widest" style={{ color: C.navy }}>Commit history</h2>
                                            <p className="mt-1 text-[10px] font-semibold" style={{ color: C.muted }}>Showing {filteredCommits.length} commits from {filters.branch || "default branch"}</p>
                                        </div>
                                        <select
                                            value={filters.branch || ""}
                                            onChange={(event) => chooseBranch(event.target.value)}
                                            className="rounded-xl border bg-transparent px-3 py-2 text-xs font-bold outline-none"
                                            style={{ borderColor: C.border, color: C.navy }}
                                            aria-label="Filter commits by branch"
                                        >
                                            {branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}{branch.is_default ? " (default)" : ""}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
                                        <input
                                            value={searchQuery}
                                            onChange={(event) => setSearchQuery(event.target.value)}
                                            placeholder="Search message, author, or SHA"
                                            className="w-full rounded-xl border bg-transparent py-2.5 pl-9 pr-3 text-xs font-semibold outline-none"
                                            style={{ borderColor: C.border, color: C.navy }}
                                        />
                                    </div>
                                    {filteredCommits.length === 0 ? <EmptyState>No matching commits</EmptyState> : (
                                        <div className="relative ml-2 space-y-4 border-l-2 pl-5" style={{ borderColor: "rgba(139,94,60,0.15)" }}>
                                            {filteredCommits.map((commit) => (
                                                <article key={commit.hash} className="relative rounded-2xl border p-4" style={{ borderColor: C.border }}>
                                                    <span className="absolute -left-[27px] top-5 h-3.5 w-3.5 rounded-full border-4" style={{ background: C.brown, borderColor: C.card }} />
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <a href={commit.html_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border px-2 py-0.5 font-mono text-[9px] font-black" style={{ color: C.brown, borderColor: C.border }}>
                                                            {commit.short_hash}<ExternalLink size={9} />
                                                        </a>
                                                        <time className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>{formatDate(commit.date)}</time>
                                                    </div>
                                                    <p className="mt-3 whitespace-pre-wrap break-words text-xs font-bold leading-relaxed" style={{ color: C.navy }}>{commit.message}</p>
                                                    <div className="mt-3 flex items-center gap-2 border-t pt-3 text-[9px] font-black uppercase tracking-wider" style={{ borderColor: C.border, color: C.muted }}>
                                                        {commit.author_avatar && <img src={commit.author_avatar} alt="" className="h-5 w-5 rounded-full" />}
                                                        <span style={{ color: C.navy }}>{commit.author_login || commit.author_name}</span>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {activeView === "branches" && (
                                <>
                                    <h2 className="border-b pb-4 font-display text-sm font-black uppercase tracking-widest" style={{ color: C.navy, borderColor: C.border }}>Repository branches</h2>
                                    {branches.length === 0 ? <EmptyState>No branches available</EmptyState> : branches.map((branch) => (
                                        <button key={branch.name} type="button" onClick={() => { chooseBranch(branch.name); setActiveView("commits"); }} className="flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition hover:bg-black/[0.02]" style={{ borderColor: C.border }}>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <GitBranch size={14} style={{ color: C.brown }} />
                                                    <span className="truncate text-xs font-black" style={{ color: C.navy }}>{branch.name}</span>
                                                    {branch.is_default && <span className="rounded-full px-2 py-0.5 text-[8px] font-black uppercase" style={{ background: "rgba(45,106,79,0.1)", color: "#2d6a4f" }}>Default</span>}
                                                    {branch.protected && <span className="rounded-full px-2 py-0.5 text-[8px] font-black uppercase" style={{ background: "rgba(139,94,60,0.1)", color: C.brown }}>Protected</span>}
                                                </div>
                                                <p className="mt-1 font-mono text-[9px]" style={{ color: C.muted }}>{branch.last_commit_sha?.slice(0, 10) || "Awaiting first sync"}</p>
                                            </div>
                                            <ArrowRight size={15} style={{ color: C.brown }} />
                                        </button>
                                    ))}
                                </>
                            )}

                            {activeView === "pulls" && (
                                <>
                                    <h2 className="border-b pb-4 font-display text-sm font-black uppercase tracking-widest" style={{ color: C.navy, borderColor: C.border }}>Pull requests</h2>
                                    {pullRequests.length === 0 ? <EmptyState>No pull requests found</EmptyState> : pullRequests.map((pr) => (
                                        <a key={pr.pr_number} href={pr.html_url} target="_blank" rel="noreferrer" className="block rounded-2xl border p-4 transition hover:bg-black/[0.02]" style={{ borderColor: C.border }}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="break-words text-xs font-black" style={{ color: C.navy }}>#{pr.pr_number} {pr.title}</p>
                                                    <p className="mt-2 flex items-center gap-1 font-mono text-[9px]" style={{ color: C.muted }}>{pr.head_branch}<ArrowRight size={10} />{pr.base_branch}</p>
                                                </div>
                                                <span className="shrink-0 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wider" style={statusStyle(pr.state, pr.is_draft)}>{pr.is_draft ? "Draft" : pr.state}</span>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2 border-t pt-3 text-[9px] font-bold" style={{ borderColor: C.border, color: C.muted }}>
                                                {pr.author_avatar && <img src={pr.author_avatar} alt="" className="h-5 w-5 rounded-full" />}
                                                <span>{pr.author_login || "GitHub user"}</span><span className="ml-auto">{formatDate(pr.updated_at)}</span>
                                            </div>
                                        </a>
                                    ))}
                                </>
                            )}

                            {activeView === "issues" && (
                                <>
                                    <h2 className="border-b pb-4 font-display text-sm font-black uppercase tracking-widest" style={{ color: C.navy, borderColor: C.border }}>Repository issues</h2>
                                    {issues.length === 0 ? <EmptyState>No issues found</EmptyState> : issues.map((issue) => (
                                        <a key={issue.number} href={issue.html_url} target="_blank" rel="noreferrer" className="block rounded-2xl border p-4 transition hover:bg-black/[0.02]" style={{ borderColor: C.border }}>
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="break-words text-xs font-black" style={{ color: C.navy }}>#{issue.number} {issue.title}</p>
                                                <span className="shrink-0 rounded-full px-2 py-1 text-[8px] font-black uppercase" style={statusStyle(issue.state)}>{issue.state}</span>
                                            </div>
                                            {issue.labels?.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{issue.labels.map((label) => <span key={label.name} className="rounded-full px-2 py-0.5 text-[8px] font-bold" style={{ background: `#${label.color}20`, color: C.navy }}>{label.name}</span>)}</div>}
                                            <div className="mt-3 flex items-center gap-2 border-t pt-3 text-[9px] font-bold" style={{ borderColor: C.border, color: C.muted }}>
                                                {issue.author_avatar && <img src={issue.author_avatar} alt="" className="h-5 w-5 rounded-full" />}
                                                <span>{issue.author_login}</span><span className="ml-auto">{formatDate(issue.updated_at)}</span>
                                            </div>
                                        </a>
                                    ))}
                                </>
                            )}
                        </section>

                        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
                            <div className="space-y-4 rounded-2xl border p-5" style={{ background: C.card, borderColor: C.border }}>
                                <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: C.border }}>
                                    <GitBranch size={15} style={{ color: C.brown }} />
                                    <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: C.navy }}>Repository</h3>
                                </div>
                                <a href={project.github_repository?.html_url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl border p-3 font-mono text-[10px] font-bold" style={{ color: C.navy, borderColor: C.border }}>
                                    <span className="min-w-0 break-all">{project.github_repository?.full_name}</span><ExternalLink size={12} className="shrink-0" />
                                </a>
                                <div className="rounded-xl border p-3 text-[10px] font-semibold leading-relaxed" style={{ borderColor: C.border, background: "rgba(45,106,79,0.04)", color: C.muted }}>
                                    <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-[#2d6a4f]">Live GitHub data</p>
                                    Commits are loaded for the selected branch. Webhooks refresh branches, issues, pull requests, and task links.
                                </div>
                            </div>

                            <div className="space-y-2 rounded-2xl border p-5" style={{ background: C.card, borderColor: C.border }}>
                                <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest" style={{ color: C.navy }}>Quick branch switch</h3>
                                {branches.slice(0, 8).map((branch) => (
                                    <button key={branch.name} type="button" onClick={() => chooseBranch(branch.name)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[10px] font-bold transition hover:bg-black/[0.03]" style={{ color: branch.name === filters.branch ? C.brown : C.muted }}>
                                        <span className="truncate">{branch.name}</span>{branch.name === filters.branch && <CheckCircle2 size={12} />}
                                    </button>
                                ))}
                            </div>
                        </aside>
                    </div>
                </>
            )}
        </div>
    );
}

Feed.layout = (page) => <WorkspaceLayout children={page} />;
