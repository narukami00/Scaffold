import { useForm } from "@inertiajs/react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, Link } from "@inertiajs/react";
import ProjectHeader from "@/components/project/ProjectHeader";
import MarkdownEditor from "@/components/ui/MarkdownEditor";
import { Save, ArrowLeft } from "lucide-react";

export default function CreateEdit({ workspace, project, wiki = null, isEdit = false }) {
    const { data, setData, post, patch, processing, errors } = useForm({
        title: wiki ? wiki.title : "",
        content: wiki ? wiki.content : "",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            patch(`/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${wiki.slug}`);
        } else {
            post(`/workspaces/${workspace.slug}/projects/${project.slug}/wiki`);
        }
    };

    return (
        <div className="space-y-6">
            <Head title={isEdit ? `${project.name} - Edit Wiki` : `${project.name} - New Wiki`} />
            <ProjectHeader workspace={workspace} project={project} activeTab="wiki" />

            <div className="mx-auto max-w-4xl rounded-3xl border border-border/80 bg-surface2/20 p-6">
                {/* Form header */}
                <div className="mb-6 flex items-center justify-between border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={
                                wiki
                                    ? `/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${wiki.slug}`
                                    : `/workspaces/${workspace.slug}/projects/${project.slug}/wiki`
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-colors hover:text-white"
                        >
                            <ArrowLeft size={14} />
                        </Link>
                        <h2 className="text-lg font-display font-black uppercase tracking-tight text-white">
                            {isEdit ? "Edit Wiki Page" : "Create Wiki Page"}
                        </h2>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted">
                            Page Title
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Database Architecture Guide"
                            value={data.title}
                            onChange={(e) => setData("title", e.target.value)}
                            className="w-full rounded-xl border border-border/60 bg-surface/50 px-4 py-2.5 text-sm text-white placeholder-muted focus:border-accent focus:outline-none"
                            required
                        />
                        {errors.title && (
                            <p className="text-[10px] font-black uppercase tracking-wider text-red-400">
                                {errors.title}
                            </p>
                        )}
                    </div>

                    {/* Content Input (MarkdownEditor) */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted">
                            Markdown Content
                        </label>
                        <MarkdownEditor
                            value={data.content}
                            onChange={(val) => setData("content", val)}
                            placeholder="Write your wiki documentation here in Markdown format..."
                            uploadUrl={`/workspaces/${workspace.slug}/media/upload`}
                            disabled={processing}
                        />
                        {errors.content && (
                            <p className="text-[10px] font-black uppercase tracking-wider text-red-400">
                                {errors.content}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 border-t border-border/50 pt-4">
                        <Link
                            href={
                                wiki
                                    ? `/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${wiki.slug}`
                                    : `/workspaces/${workspace.slug}/projects/${project.slug}/wiki`
                            }
                            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-black uppercase tracking-widest text-muted transition-colors hover:text-white"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
                        >
                            <Save size={14} />
                            {isEdit ? "Save Changes" : "Publish Page"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

CreateEdit.layout = (page) => <WorkspaceLayout children={page} />;
