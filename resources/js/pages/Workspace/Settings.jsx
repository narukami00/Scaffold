import AppLayout from "@/layouts/AppLayout";
import { Head, useForm, Link, router } from "@inertiajs/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useState } from "react";

export default function Settings({ workspace }) {
    const updateForm = useForm({
        name: workspace.name,
    });
    const deleteForm = useForm({});
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const submitUpdate = (e) => {
        e.preventDefault();
        updateForm.patch(`/workspaces/${workspace.slug}`);
    };

    const submitDelete = () => {
        deleteForm.delete(`/workspaces/${workspace.slug}`, {
            onSuccess: () => router.visit("/workspaces"),
        });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-12">
            <Head title={`Settings - ${workspace.name}`} />

            {/* Breadcrumb / Back button */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/workspaces/${workspace.slug}`}
                    className="text-muted hover:text-white transition-colors"
                >
                    ← Back to Dashboard
                </Link>
            </div>

            <div className="space-y-2">
                <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter">
                    Workspace Settings
                </h1>
                <p className="text-muted italic">Configure your environment.</p>
            </div>

            {/* Update Name Section */}
            <section className="bg-surface border border-border p-8 rounded-3xl space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-white">
                        General Settings
                    </h3>
                    <p className="text-sm text-muted">
                        Change your workspace display name.
                    </p>
                </div>

                <form onSubmit={submitUpdate} className="space-y-4 max-w-md">
                    <Input
                        label="WORKSPACE NAME"
                        value={updateForm.data.name}
                        onChange={(e) =>
                            updateForm.setData("name", e.target.value)
                        }
                        error={updateForm.errors.name}
                    />
                    <Button
                        loading={updateForm.processing}
                        className="w-auto px-8"
                    >
                        Save Changes
                    </Button>
                </form>
            </section>

            {/* Danger Zone */}
            <section className="bg-accent-red/5 border border-accent-red/20 p-8 rounded-3xl space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
                    <h3 className="text-xl font-bold text-accent-red">
                        Danger Zone
                    </h3>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-muted">
                        Once you delete a workspace, there is no going back. Please be certain.
                    </p>
                    {confirmingDelete ? (
                        <div className="space-y-4 rounded-2xl border border-accent-red/25 bg-accent-red/10 p-5">
                            <p className="text-sm text-white">
                                Delete <span className="font-bold">{workspace.name}</span>? This permanently removes the workspace.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    type="button"
                                    onClick={submitDelete}
                                    loading={deleteForm.processing}
                                    disabled={deleteForm.processing}
                                    className="w-auto px-8 bg-accent-red hover:bg-accent-red/80 border-accent-red/20"
                                >
                                    Confirm Delete
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setConfirmingDelete(false)}
                                    disabled={deleteForm.processing}
                                    className="w-auto px-8 bg-surface hover:bg-surface2 border-border"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            type="button"
                            onClick={() => setConfirmingDelete(true)}
                            className="w-auto px-8 bg-accent-red hover:bg-accent-red/80 border-accent-red/20"
                        >
                            Delete Workspace
                        </Button>
                    )}
                </div>
            </section>
        </div>
    );
}

Settings.layout = (page) => <AppLayout children={page} />;
