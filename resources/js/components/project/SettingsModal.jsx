import { useForm } from "@inertiajs/react";
import { X, Settings, FolderOpen, Save } from "lucide-react";

const C = {
    bg:      "#ede0c8",
    card:    "#f3e4c9",
    navy:    "#0a2947",
    brown:   "#8b5e3c",
    sage:    "#d3d4c0",
    border:  "rgba(139,94,60,0.18)",
    muted:   "rgba(10,41,71,0.68)",
};

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-[28px] border p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                style={{ background: C.card, borderColor: C.border }}>
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.border }}>
                    <div className="flex items-center gap-2" style={{ color: C.navy }}>
                        <Settings style={{ color: C.brown }} size={18} />
                        <h2 className="text-sm font-display font-black uppercase tracking-widest">
                            Project Settings
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl border p-1.5 transition-all hover:bg-black/5"
                        style={{ borderColor: C.border, color: C.navy }}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    {/* Project Name */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.brown }}>
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData("name", e.target.value)}
                            className="w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none transition-all focus:border-[#8b5e3c]"
                            style={{
                                background: "rgba(139,94,60,0.03)",
                                borderColor: C.border,
                                color: C.navy,
                            }}
                            required
                            disabled={processing}
                        />
                        {errors.name && (
                            <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    {/* Git Repo Path */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.brown }}>
                                Local Git Repository Path
                            </label>
                        </div>
                        <div className="relative">
                            <FolderOpen
                                className="absolute top-2.5 left-3"
                                style={{ color: C.brown }}
                                size={14}
                            />
                            <input
                                type="text"
                                placeholder="e.g. F:\__Projects\Web\Scaffold\scaffold"
                                value={data.git_repo_path}
                                onChange={(e) => setData("git_repo_path", e.target.value)}
                                className="w-full rounded-xl border py-2 pr-3 pl-9 text-xs font-bold outline-none transition-all focus:border-[#8b5e3c] font-mono"
                                style={{
                                    background: "rgba(139,94,60,0.03)",
                                    borderColor: C.border,
                                    color: C.navy,
                                }}
                                disabled={processing}
                            />
                        </div>
                        <p className="text-[9px] leading-relaxed" style={{ color: C.muted }}>
                            Provide the absolute local folder path. The app will parse local git logs to generate the Git Feed timeline.
                        </p>
                        {errors.git_repo_path && (
                            <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                                {errors.git_repo_path}
                            </p>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 flex justify-end gap-2 border-t pt-4" style={{ borderColor: C.border }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all"
                            style={{ borderColor: C.border, color: C.muted }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(10,41,71,0.05)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#f3e4c9] shadow-lg transition-all hover:scale-105 active:scale-95"
                            style={{ background: C.brown }}
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
