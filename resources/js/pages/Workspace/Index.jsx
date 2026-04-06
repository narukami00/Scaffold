import AppLayout from "@/layouts/AppLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function Index({ workspaces }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post("/workspaces", {
            onSuccess: () => reset(),
        });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-12">
            <Head title="Workspaces" />

            {/* Create Workspace Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border">
                <div className="space-y-2">
                    <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter">
                        Your Workspaces
                    </h1>
                    <p className="text-muted text-lg">
                        Build something great today.
                    </p>
                </div>

                <form
                    onSubmit={submit}
                    className="flex items-start gap-3 w-full md:w-auto"
                >
                    <div className="flex-1 md:w-64">
                        <Input
                            placeholder="Workspace Name..."
                            value={data.name}
                            onChange={(e) => setData("name", e.target.value)}
                            error={errors.name}
                        />
                    </div>
                    <Button
                        loading={processing}
                        className="w-auto px-6 whitespace-nowrap"
                    >
                        Create New
                    </Button>
                </form>
            </div>

            {/* Workspaces Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workspaces.map((workspace) => (
                    <Link
                        key={workspace.id}
                        href={`/workspaces/${workspace.slug}`}
                        className="group bg-surface hover:bg-surface2 border border-border hover:border-accent/50 p-6 rounded-2xl transition-all duration-300"
                    >
                        <div className="space-y-4">
                            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xl font-bold group-hover:scale-110 transition-transform">
                                {workspace.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white group-hover:text-accent transition-colors">
                                    {workspace.name}
                                </h3>
                                <p className="text-xs text-muted font-mono uppercase tracking-widest mt-1">
                                    {workspace.slug}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}

                {workspaces.length === 0 && (
                    <div className="col-span-full py-20 bg-surface2/30 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                        <div className="text-muted text-sm italic">
                            You don't have any workspaces yet.
                        </div>
                        <p className="text-muted/50 text-xs px-8">
                            Give your team a name above to get started!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

Index.layout = (page) => <AppLayout children={page} />;
