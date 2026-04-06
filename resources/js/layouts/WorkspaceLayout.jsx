import { Link, usePage, useForm } from "@inertiajs/react";
import AppLayout from "@/layouts/AppLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useState } from "react";

export default function WorkspaceLayout({ children }) {
    // Get the shared data from our Middleware
    const { workspace, workspaceProjects, auth } = usePage().props;
    const [showingNewProject, setShowingNewProject] = useState(false);

    const projectForm = useForm({
        name: "",
    });

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
            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* 1. Sidebar */}
                <aside className="w-72 bg-surface2/30 border-r border-border flex flex-col">
                    <div className="p-6 border-b border-border">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">
                            {workspace.name}
                        </h2>
                        <p className="text-[10px] text-muted uppercase mt-1">
                            Workspace Level
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-8">
                        {/* Projects List */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[10px] font-black text-muted uppercase tracking-widest">
                                    Projects
                                </h3>
                                <button
                                    onClick={() => setShowingNewProject(true)}
                                    className="p-1 hover:bg-surface2 rounded text-accent transition-colors"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-1">
                                {workspaceProjects.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/workspaces/${workspace.slug}/projects/${project.slug}/board`}
                                        className="block px-3 py-2 rounded-xl text-sm text-muted hover:text-white hover:bg-surface2 transition-all font-medium"
                                    >
                                        <span className="opacity-50 mr-2">
                                            #
                                        </span>
                                        {project.name}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Settings Link */}
                        <div className="pt-4 border-t border-border">
                            <Link
                                href={`/workspaces/${workspace.slug}/settings`}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted hover:text-white hover:bg-surface2 transition-all font-medium"
                            >
                                <svg
                                    className="w-4 h-4 opacity-50"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                                Settings
                            </Link>
                        </div>
                    </div>
                </aside>

                {/* 2. Content Area */}
                <main className="flex-1 overflow-y-auto bg-surface p-8">
                    {children}
                </main>
            </div>

            {/* Simple Create Project Inline Modal/Overlay */}
            {showingNewProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface2 border border-border p-8 rounded-3xl w-full max-w-sm space-y-6 shadow-2xl">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                                New Project
                            </h3>
                            <p className="text-xs text-muted">
                                Internal task board for your team.
                            </p>
                        </div>
                        <form onSubmit={submitNewProject} className="space-y-4">
                            <Input
                                label="PROJECT NAME"
                                placeholder="Marketing Ops"
                                value={projectForm.data.name}
                                onChange={(e) =>
                                    projectForm.setData("name", e.target.value)
                                }
                                error={projectForm.errors.name}
                                autoFocus
                            />
                            <div className="flex items-center gap-3">
                                <Button
                                    loading={projectForm.processing}
                                    className="flex-1"
                                >
                                    Create
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setShowingNewProject(false)}
                                    className="bg-surface hover:bg-surface2 border-border"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
