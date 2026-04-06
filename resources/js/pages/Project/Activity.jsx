import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head } from "@inertiajs/react";

export default function Activity({ project }) {
    return (
        <div className="space-y-6">
            <Head title={`${project.name} - Activity`} />
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tighter">
                Recent Activity
            </h1>
            <div className="h-96 border-2 border-dashed border-border rounded-3xl flex items-center justify-center text-muted uppercase font-black tracking-widest bg-surface2/20">
                Activity Logs Coming Soon
            </div>
        </div>
    );
}

Activity.layout = (page) => <WorkspaceLayout children={page} />;
