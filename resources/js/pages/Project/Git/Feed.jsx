import { useState } from "react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, Link, router } from "@inertiajs/react";
import ProjectHeader from "@/components/project/ProjectHeader";
import { GitBranch, GitCommit, RefreshCw, AlertTriangle, Terminal, Copy, Check, HelpCircle } from "lucide-react";

export default function Feed({ workspace, project, commits = [], error = null }) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showingHelpModal, setShowingHelpModal] = useState(false);
    const [helpPage, setHelpPage] = useState(1);

    const handleSync = () => {
        setIsSyncing(true);
        router.post(
            `/workspaces/${workspace.slug}/projects/${project.slug}/git/sync`,
            {},
            {
                onFinish: () => {
                    setIsSyncing(false);
                },
            }
        );
    };

    const webhookUrl = `${window.location.origin}/public/workspaces/${workspace.slug}/projects/${project.slug}/git/webhook`;

    const hookScript = `#!/bin/sh
# Local post-commit hook for Scaffold task integration
# Save this file as '.git/hooks/post-commit' (and run 'chmod +x' on macOS/Linux)

COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
AUTHOR_NAME=$(git log -1 --pretty=%an)

curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d "{\\"hash\\":\\"$COMMIT_HASH\\",\\"message\\":\\"$COMMIT_MSG\\",\\"author_name\\":\\"$AUTHOR_NAME\\"}"
`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(hookScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <Head title={`${project.name} - Git Feed`} />
            <ProjectHeader workspace={workspace} project={project} activeTab="activity" />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Timeline Feed */}
                <div className="rounded-3xl border border-border/80 bg-surface2/20 p-6 lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between border-b border-border/50 pb-4">
                        <div className="flex items-center gap-2">
                            <GitBranch className="text-accent" size={18} />
                            <h2 className="text-sm font-display font-black uppercase tracking-widest text-white">
                                Commit History
                            </h2>
                        </div>

                        {project.git_repo_path && (
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted transition-colors hover:text-white disabled:opacity-50"
                            >
                                <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                                Sync Commits
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-red-400">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <div className="text-xs space-y-1">
                                <p className="font-bold">Git Integration Error</p>
                                <p className="text-red-300/80 leading-normal">{error}</p>
                            </div>
                        </div>
                    )}

                    {!project.git_repo_path ? (
                        <div className="flex h-72 flex-col items-center justify-center space-y-4 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-surface2/60 border border-border/80 text-muted">
                                <GitCommit size={24} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                                    Link Git Repository
                                </h3>
                                <p className="text-xs text-muted max-w-sm leading-normal">
                                    Connect this project to a local Git folder. Scaffold will scan commit logs to build your timeline.
                                </p>
                            </div>
                            <p className="text-[10px] text-muted italic">
                                Click the gear settings icon in the project header to configure.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setHelpPage(1);
                                    setShowingHelpModal(true);
                                }}
                                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors cursor-pointer mt-1"
                            >
                                <HelpCircle size={12} />
                                View Setup Guide
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {commits.length === 0 ? (
                                <div className="py-12 text-center text-xs text-muted font-semibold uppercase tracking-wider">
                                    No commits recorded in this repository.
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-border/50 pl-5 ml-3 space-y-6">
                                    {commits.map((commit, index) => (
                                        <div key={commit.hash} className="relative group">
                                            {/* Bullet icon */}
                                            <span className="absolute -left-[27px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent border-4 border-surface shadow"></span>

                                            <div className="space-y-1 bg-surface2/30 rounded-2xl border border-border/40 p-4 transition-all group-hover:border-border">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="font-mono text-[10px] font-black text-accent bg-accent/5 px-2 py-0.5 rounded-lg border border-accent/20">
                                                        {commit.short_hash}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted">
                                                        {commit.date}
                                                    </span>
                                                </div>

                                                <p className="text-xs font-bold text-white leading-relaxed">
                                                    {commit.message}
                                                </p>

                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted pt-2 border-t border-border/30">
                                                    <span className="text-zinc-400">{commit.author_name}</span>
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

                {/* Git Hook Info Card */}
                <div className="rounded-3xl border border-border/80 bg-surface2/40 p-6 self-start space-y-4">
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                        <div className="flex items-center gap-2">
                            <Terminal className="text-accent" size={16} />
                            <h3 className="text-xs font-black uppercase tracking-widest text-white">
                                Git Automation Hook
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setHelpPage(1);
                                setShowingHelpModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-border bg-surface hover:text-white transition-colors hover:border-accent/40 text-muted cursor-pointer"
                            title="Open Git Setup Guide"
                        >
                            <HelpCircle size={14} />
                        </button>
                    </div>

                    <p className="text-xs text-muted leading-relaxed">
                        Expose real-time commit pushes locally! Scaffold can receive commit notifications when you run <code className="text-accent font-mono text-[10px]">git commit</code> and automatically transition referenced tasks to Done.
                    </p>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted">
                                post-commit hook script
                            </span>
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors"
                            >
                                {copied ? <Check size={10} /> : <Copy size={10} />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>
                        <pre className="overflow-x-auto rounded-xl border border-border/80 bg-surface/85 p-3 text-[9px] font-mono text-zinc-300 leading-normal custom-scrollbar select-all">
                            {hookScript}
                        </pre>
                    </div>

                    <div className="rounded-2xl border border-border/40 bg-surface/30 p-3 text-[10px] text-muted space-y-1.5">
                        <p className="font-bold text-white uppercase tracking-wider text-[9px]">
                            Keywords to resolve tasks:
                        </p>
                        <p className="leading-normal">
                            Include <code className="text-accent font-bold">fix #14</code>, <code className="text-accent font-bold">closes #14</code>, or <code className="text-accent font-bold">resolve #14</code> in your commit message.
                        </p>
                    </div>
                </div>
            </div>

            {/* Git Integration Multi-Page Help Guide Modal */}
            {showingHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface border border-border p-6 rounded-3xl w-full max-w-lg space-y-6 shadow-2xl relative">
                        <button
                            type="button"
                            onClick={() => setShowingHelpModal(false)}
                            className="absolute top-4 right-4 text-muted hover:text-white rounded-lg p-1 hover:bg-surface2 transition-colors cursor-pointer text-lg font-bold"
                        >
                            &times;
                        </button>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-accent">
                                <HelpCircle size={18} strokeWidth={2.5} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Git Integration Guide</span>
                            </div>
                            <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">
                                {helpPage === 1 && "1. How Git Integration Works"}
                                {helpPage === 2 && "2. Linking a Local Repository"}
                                {helpPage === 3 && "3. Setting up Real-time Webhooks"}
                                {helpPage === 4 && "4. Automation & Commit Messages"}
                            </h3>
                        </div>

                        {/* Page Contents */}
                        <div className="text-xs text-muted leading-relaxed space-y-4 min-h-[180px] py-2 border-t border-b border-border/40">
                            {helpPage === 1 && (
                                <div className="space-y-3">
                                    <p>
                                        Scaffold provides <strong>two types</strong> of Git integration to keep your development workflow fully in sync with your task board:
                                    </p>
                                    <ul className="list-disc pl-4 space-y-1.5">
                                        <li><strong>Local Repo Scanning:</strong> Scans your local commit history directly from the repository folder path to build a commit log timeline inside this Activity tab.</li>
                                        <li><strong>Real-time Hooks:</strong> Listens for incoming git commit events via a webhook, automatically transitions referenced tasks (e.g. <code>#12</code>) to <strong>Done</strong>, and posts commit comments.</li>
                                    </ul>
                                </div>
                            )}

                            {helpPage === 2 && (
                                <div className="space-y-3">
                                    <p>
                                        To link your local repository and display commit history:
                                    </p>
                                    <ol className="list-decimal pl-4 space-y-2">
                                        <li>Click the <strong>Settings (Gear)</strong> icon in the project header page.</li>
                                        <li>Find the <strong>Git Repository Path</strong> field.</li>
                                        <li>Enter the absolute folder path where your <code>.git</code> folder is located on your local disk.
                                            <div className="bg-surface2 p-2 rounded-xl mt-1 font-mono text-[10px] text-zinc-400 break-all">
                                                Windows: F:\__Projects\Web\my-project<br />
                                                macOS/Linux: /Users/username/projects/my-project
                                            </div>
                                        </li>
                                        <li>Click <strong>Save Changes</strong>, then press the <strong>Sync Commits</strong> button on this page.</li>
                                    </ol>
                                </div>
                            )}

                            {helpPage === 3 && (
                                <div className="space-y-3">
                                    <p>
                                        To trigger automatic task updates instantly when you run <code>git commit</code>:
                                    </p>
                                    <ol className="list-decimal pl-4 space-y-2">
                                        <li>Copy the <strong>post-commit hook script</strong> provided on the right-hand panel of this page.</li>
                                        <li>Navigate to your project's local directory and enter the hidden <code>.git/hooks/</code> directory.</li>
                                        <li>Create a file named <code>post-commit</code> (no extension) and paste the script inside it.</li>
                                        <li>If you are on macOS or Linux, make the file executable by running this terminal command:
                                            <div className="bg-surface2 p-2 rounded-xl mt-1 font-mono text-[10px] text-zinc-400">
                                                chmod +x .git/hooks/post-commit
                                            </div>
                                        </li>
                                    </ol>
                                </div>
                            )}

                            {helpPage === 4 && (
                                <div className="space-y-3">
                                    <p>
                                        Scaffold scans your commit messages for references to tasks:
                                    </p>
                                    <ul className="list-disc pl-4 space-y-2">
                                        <li><strong>Reference task:</strong> Use <code>#ID</code> (e.g. <code>#12</code>) in your commit message. Scaffold will link the commit in the activity timeline and log a comment on the task.</li>
                                        <li><strong>Close task:</strong> Prepend action words like <code>closes #12</code>, <code>fix #12</code>, <code>resolve #12</code>, or <code>done #12</code>. This will automatically transition the task to <strong>Done</strong>!</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Navigation controls */}
                        <div className="flex items-center justify-between text-xs pt-2">
                            <span className="text-[10px] font-black uppercase text-muted tracking-widest">
                                Page {helpPage} of 4
                            </span>
                            <div className="flex items-center gap-2">
                                {helpPage > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setHelpPage(prev => prev - 1)}
                                        className="px-3 py-1.5 bg-surface2 hover:bg-surface border border-border text-white rounded-xl transition-colors cursor-pointer"
                                    >
                                        Back
                                    </button>
                                )}
                                {helpPage < 4 ? (
                                    <button
                                        type="button"
                                        onClick={() => setHelpPage(prev => prev + 1)}
                                        className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold transition-colors cursor-pointer"
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowingHelpModal(false)}
                                        className="px-4 py-1.5 bg-accent-green hover:bg-accent-green/90 text-black rounded-xl font-black uppercase tracking-wider transition-colors cursor-pointer"
                                    >
                                        Got It
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

Feed.layout = (page) => <WorkspaceLayout children={page} />;
