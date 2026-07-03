import { usePage, useForm, router } from "@inertiajs/react";
import AppLayout from "@/layouts/AppLayout";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import CommandPalette from "@/components/ui/CommandPalette";

export default function WorkspaceLayout({ children }) {
    const { workspace, project } = usePage().props;
    const [showingNewProject, setShowingNewProject] = useState(false);

    const projectForm = useForm({ name: "" });

    const submitNewProject = (e) => {
        e.preventDefault();
        projectForm.post(`/workspaces/${workspace.slug}/projects`, {
            onSuccess: () => {
                setShowingNewProject(false);
                projectForm.reset();
            },
        });
    };

    return (
        <AppLayout>
            <CommandPalette workspace={workspace} project={project || null} />

            {/* Full-width content — no secondary sidebar */}
            {children}

            {/* ── New Project Modal ─────────────────────────────────────────── */}
            {showingNewProject && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(10,41,71,0.7)", backdropFilter: "blur(10px)" }}
                    onClick={e => { if (e.target === e.currentTarget) setShowingNewProject(false); }}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl p-7 space-y-6 shadow-2xl"
                        style={{ background: "#0d3260", border: "1px solid #1a3f6e" }}
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h3 className="font-display font-black text-xl"
                                    style={{ color: "#f3e4c9", letterSpacing: "0.03em" }}>
                                    New Project
                                </h3>
                                <p className="text-xs" style={{ color: "rgba(211,212,192,0.5)" }}>
                                    A task board for your team.
                                </p>
                            </div>
                            <button onClick={() => setShowingNewProject(false)}
                                className="rounded-lg p-1.5 transition-colors duration-150"
                                style={{ color: "rgba(211,212,192,0.4)" }}
                                onMouseEnter={e => e.currentTarget.style.color = "#f3e4c9"}
                                onMouseLeave={e => e.currentTarget.style.color = "rgba(211,212,192,0.4)"}>
                                <X size={15} />
                            </button>
                        </div>

                        <form onSubmit={submitNewProject} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-widest"
                                    style={{ color: "#f3e4c9" }}>
                                    Project Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Marketing Ops"
                                    value={projectForm.data.name}
                                    onChange={e => projectForm.setData("name", e.target.value)}
                                    autoFocus
                                    className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all duration-200 placeholder:opacity-40"
                                    style={{
                                        background: "rgba(10,41,71,0.8)",
                                        border: `1.5px solid ${projectForm.errors.name ? "#c0392b" : "rgba(139,94,60,0.3)"}`,
                                        color: "#f3e4c9",
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = "#8b5e3c"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,94,60,0.15)"; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = projectForm.errors.name ? "#c0392b" : "rgba(139,94,60,0.3)"; e.currentTarget.style.boxShadow = "none"; }}
                                />
                                {projectForm.errors.name && (
                                    <p className="text-xs" style={{ color: "#c0392b" }}>{projectForm.errors.name}</p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" disabled={projectForm.processing}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                                    style={{ background: "#8b5e3c", color: "#f3e4c9" }}
                                    onMouseEnter={e => { if (!projectForm.processing) e.currentTarget.style.background = "#a06b43"; }}
                                    onMouseLeave={e => { if (!projectForm.processing) e.currentTarget.style.background = "#8b5e3c"; }}>
                                    {projectForm.processing
                                        ? <div className="w-4 h-4 rounded-full border-2 animate-spin"
                                            style={{ borderColor: "rgba(243,228,201,0.3)", borderTopColor: "#f3e4c9" }} />
                                        : <><Plus size={13} /> Create</>}
                                </button>
                                <button type="button" onClick={() => setShowingNewProject(false)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                                    style={{ background: "rgba(243,228,201,0.06)", border: "1px solid rgba(243,228,201,0.12)", color: "rgba(211,212,192,0.6)" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(243,228,201,0.1)"; e.currentTarget.style.color = "#f3e4c9"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(243,228,201,0.06)"; e.currentTarget.style.color = "rgba(211,212,192,0.6)"; }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
