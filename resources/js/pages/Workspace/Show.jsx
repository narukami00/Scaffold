import AppLayout from "@/layouts/AppLayout";
import { Head, Link } from "@inertiajs/react";

export default function Show({ workspace }) {
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <Head title={workspace.name} />

            {/* Header Area */}
            <div className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-display font-black text-white">
                        {workspace.name}
                    </h1>
                    <p className="text-muted text-sm mt-1">
                        Workspace Dashboard
                    </p>
                </div>

                {/* build this settings page next! */}
                <Link
                    href={`/workspaces/${workspace.slug}/settings`}
                    className="px-4 py-2 bg-surface hover:bg-surface2 border border-border rounded-lg text-sm text-white font-medium transition-colors"
                >
                    Workspace Settings
                </Link>
            </div>

            {/* Placeholder for future features */}
            <div className="py-24 bg-surface2/30 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="text-accent text-5xl hover:scale-110 transition-transform cursor-pointer">
                    🚀
                </div>
                <h3 className="text-2xl font-bold text-white">
                    Welcome to {workspace.name}
                </h3>
                <p className="text-muted max-w-md">
                    This is your workspace internal dashboard. In the next
                    future, this area will be filled with many features.
                </p>
            </div>
        </div>
    );
}

Show.layout = (page) => <AppLayout children={page} />;
