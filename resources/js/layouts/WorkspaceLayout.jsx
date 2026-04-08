import { Link, usePage, useForm } from "@inertiajs/react";
import AppLayout from "@/layouts/AppLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ChevronLeft, ChevronRight, FolderKanban, Plus, Settings } from "lucide-react";
import { useState } from "react";

export default function WorkspaceLayout({ children }) {
    // Get the shared data from our Middleware
    const { workspace, workspaceProjects, auth } = usePage().props;
    const [showingNewProject, setShowingNewProject] = useState(false);
    const [isWorkspaceSidebarOpen, setIsWorkspaceSidebarOpen] = useState(true);

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
            <div className="flex h-auto flex-col overflow-hidden lg:h-[calc(100vh-64px)] lg:flex-row">
                {/* 1. Sidebar */}
                <aside
                    className={`w-full border-b border-border bg-surface2/30 transition-all lg:border-b-0 lg:border-r lg:flex lg:flex-col ${
                        isWorkspaceSidebarOpen ? "lg:w-72" : "lg:w-[92px]"
                    }`}
                >
                    <div className="flex items-center justify-between border-b border-border p-4 sm:p-6">
                        <div
                            className={`overflow-hidden transition-all ${
                                isWorkspaceSidebarOpen ? "max-w-[220px]" : "max-w-[32px]"
                            }`}
                        >
                            <h2 className="text-sm font-black uppercase tracking-widest text-white">
                                {isWorkspaceSidebarOpen ? workspace.name : "WS"}
                            </h2>
                            {isWorkspaceSidebarOpen && (
                                <p className="mt-1 text-[10px] uppercase text-muted">
                                    Workspace Level
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                setIsWorkspaceSidebarOpen((current) => !current)
                            }
                            className="rounded-xl border border-border bg-surface2 p-2 text-muted transition-colors hover:border-accent/40 hover:text-accent"
                        >
                            {isWorkspaceSidebarOpen ? (
                                <ChevronLeft size={16} />
                            ) : (
                                <ChevronRight size={16} />
                            )}
                        </button>
                    </div>

                    <div className="overflow-x-auto p-4 lg:flex-1 lg:overflow-y-auto lg:space-y-8">
                        {/* Projects List */}
                        <div className="space-y-4 lg:space-y-4">
                            <div className="flex items-center justify-between px-2">
                                {isWorkspaceSidebarOpen ? (
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted">
                                        Projects
                                    </h3>
                                ) : (
                                    <FolderKanban size={14} className="text-muted" />
                                )}
                                <button
                                    onClick={() => setShowingNewProject(true)}
                                    className="p-1 hover:bg-surface2 rounded text-accent transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex gap-2 lg:block lg:space-y-1">
                                {workspaceProjects.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/workspaces/${workspace.slug}/projects/${project.slug}/board`}
                                        className="block shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-all hover:bg-surface2 hover:text-white lg:mb-1"
                                    >
                                        {isWorkspaceSidebarOpen ? (
                                            <>
                                                <span className="mr-2 opacity-50">
                                                    #
                                                </span>
                                                {project.name}
                                            </>
                                        ) : (
                                            <span className="block text-center">
                                                #
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Settings Link */}
                        <div className="mt-4 border-t border-border pt-4">
                            <Link
                                href={`/workspaces/${workspace.slug}/settings`}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted hover:text-white hover:bg-surface2 transition-all font-medium"
                            >
                                <Settings className="h-4 w-4 opacity-50" />
                                {isWorkspaceSidebarOpen ? "Settings" : null}
                            </Link>
                        </div>
                    </div>
                </aside>

                {/* 2. Content Area */}
                <main className="min-h-[70vh] flex-1 overflow-y-auto bg-surface p-4 sm:p-6 lg:min-h-0 lg:p-8">
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
