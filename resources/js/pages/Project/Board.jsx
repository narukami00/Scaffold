import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head } from "@inertiajs/react";

export default function Board({ project }) {
    return (
        <div className="space-y-6">
            <Head title={`${project.name} - Board`} />
            <div className="space-y-1">
                <h1 className="text-3xl font-display font-black text-white uppercase tracking-tighter">
                    {project.name}
                </h1>
                <p className="text-muted italic">Kanban Board coming soon...</p>
            </div>

            {/* Placeholder for the Board */}
            <div className="h-96 border-2 border-dashed border-border rounded-3xl flex items-center justify-center text-muted uppercase font-black tracking-widest bg-surface2/20">
                Visual Task Board Area
            </div>
        </div>
    );
}

Board.layout = (page) => <WorkspaceLayout children={page} />;
