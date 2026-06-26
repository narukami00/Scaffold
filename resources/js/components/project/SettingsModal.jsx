import { useForm } from "@inertiajs/react";
import { X, Settings, FolderOpen, Save } from "lucide-react";

export default function SettingsModal({ workspace, project, isOpen, onClose }) {
    if (!isOpen) return null;

    const { data, setData, patch, processing, errors } = useForm({
        name: project.name || "",
        git_repo_path: project.git_repo_path || "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(`/workspaces/${workspace.slug}/projects/${project.slug}`, {
            onSuccess: () => {
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md rounded-[28px] border border-border bg-surface p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                    <div className="flex items-center gap-2 text-white">
                        <Settings className="text-accent" size={18} />
                        <h2 className="text-sm font-display font-black uppercase tracking-widest">
                            Project Settings
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-border bg-surface2/50 p-1.5 text-muted transition-colors hover:text-white"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {/* Project Name */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted">
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData("name", e.target.value)}
                            className="w-full rounded-xl border border-border/60 bg-surface2/30 px-3 py-2 text-xs text-white placeholder-muted focus:border-accent focus:outline-none"
                            required
                            disabled={processing}
                        />
                        {errors.name && (
                            <p className="text-[10px] font-black uppercase tracking-wider text-red-400">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    {/* Git Repo Path */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted">
                                Local Git Repository Path
                            </label>
                        </div>
                        <div className="relative">
                            <FolderOpen
                                className="absolute top-2.5 left-3 text-muted"
                                size={14}
                            />
                            <input
                                type="text"
                                placeholder="e.g. F:\__Projects\Web\Scaffold\scaffold"
                                value={data.git_repo_path}
                                onChange={(e) => setData("git_repo_path", e.target.value)}
                                className="w-full rounded-xl border border-border/60 bg-surface2/30 py-2 pr-3 pl-9 text-xs text-white placeholder-muted focus:border-accent focus:outline-none font-mono"
                                disabled={processing}
                            />
                        </div>
                        <p className="text-[9px] text-muted leading-relaxed">
                            Provide the absolute local folder path. The app will parse local git logs to generate the Git Feed timeline.
                        </p>
                        {errors.git_repo_path && (
                            <p className="text-[10px] font-black uppercase tracking-wider text-red-400">
                                {errors.git_repo_path}
                            </p>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 flex justify-end gap-2 border-t border-border/50 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-black uppercase tracking-widest text-muted transition-colors hover:text-white"
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-lg transition-all hover:scale-105"
                            disabled={processing}
                        >
                            <Save size={12} />
                            Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
