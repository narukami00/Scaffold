import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head } from "@inertiajs/react";
import ProjectHeader from "@/components/project/ProjectHeader";

export default function Activity({ workspace, project }) {
    return (
        <div className="space-y-6">
            <Head title={`${project.name} - Activity`} />
            <ProjectHeader workspace={workspace} project={project} activeTab="activity" />
            <div className="h-96 border-2 border-dashed border-border rounded-3xl flex items-center justify-center text-muted uppercase font-black tracking-widest bg-surface2/20">
                Activity Logs Coming Soon
            </div>
        </div>
    );
}

Activity.layout = (page) => <WorkspaceLayout children={page} />;
