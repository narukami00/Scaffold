import AppLayout from '@/layouts/AppLayout';
import { Head } from '@inertiajs/react';

export default function Index() {
    return (
        <AppLayout>
            <Head title="Workspaces" />
            
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="space-y-2">
                    <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter">
                        Your Workspaces
                    </h1>
                    <p className="text-lg text-muted">Select a workspace to start building.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Workspace cards placeholder */}
                    <div className="h-40 bg-surface2 border border-border/50 rounded-2xl flex items-center justify-center border-dashed border-2">
                        <span className="text-muted text-sm italic">You don't have any workspaces yet.</span>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
