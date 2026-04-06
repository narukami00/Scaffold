import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, Link } from "@inertiajs/react";

export default function Show({ workspace }) {
    return (
        <div className="space-y-8">
            <Head title={`${workspace.name} Dashboard`} />

            <div className="space-y-2">
                <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter">
                    Workspace Overview
                </h1>
                <p className="text-muted">
                    Welcome back to {workspace.name}. Your central command
                    center.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stats or shortcut cards can go here later */}
                <div className="bg-surface2 border border-border p-6 rounded-2xl space-y-2">
                    <p className="text-[10px] font-black text-accent uppercase tracking-widest">
                        Active Projects
                    </p>
                    <p className="text-3xl font-bold text-white">
                        READY FOR WORK
                    </p>
                </div>
            </div>
        </div>
    );
}

Show.layout = (page) => <WorkspaceLayout children={page} />;
