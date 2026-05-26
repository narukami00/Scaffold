import AppLayout from "@/layouts/AppLayout";
import { Head, usePage, useForm, Link, router } from "@inertiajs/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useState } from "react";
import { Mail } from "lucide-react";

export default function Settings({ workspace }) {
    const { auth } = usePage().props;
    const isOwner = workspace.owner_id === auth.user.id;
    const currentMemberColor = workspace.members.find(
        (m) => m.id === auth.user.id,
    )?.pivot?.color;
    // 1. Form for Updating Workspace Name
    const updateForm = useForm({
        name: workspace.name,
    });

    // 2. Form for Sending Invitations
    const inviteForm = useForm({
        email: "",
        role: "member",
    });

    // 3. Form for Deletion
    const deleteForm = useForm({});
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [confirmingProjectId, setConfirmingProjectId] = useState(null);
    const [deletingProjectId, setDeletingProjectId] = useState(null);

    const submitUpdate = (e) => {
        e.preventDefault();
        updateForm.patch(`/workspaces/${workspace.slug}`);
    };

    const submitInvite = (e) => {
        e.preventDefault();
        inviteForm.post(`/workspaces/${workspace.slug}/invitations`, {
            onSuccess: () => inviteForm.reset(),
        });
    };

    const submitDelete = () => {
        deleteForm.delete(`/workspaces/${workspace.slug}`, {
            onSuccess: () => router.visit("/workspaces"),
        });
    };

    const submitProjectDelete = (project) => {
        setDeletingProjectId(project.id);
        router.delete(
            `/workspaces/${workspace.slug}/projects/${project.slug}`,
            {
                preserveScroll: true,
                onFinish: () => {
                    setDeletingProjectId(null);
                    setConfirmingProjectId(null);
                },
            },
        );
    };

    return (
        <div className="max-w-3xl mx-auto space-y-12">
            <Head title={`Settings - ${workspace.name}`} />

            {/* Breadcrumb */}
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
                <p className="text-muted italic">
                    Configure your team and environment.
                </p>
            </div>

            {/* SECTION 0: Your Identity */}
            <section className="bg-surface border border-border p-8 rounded-3xl space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-white">
                        Your Identity
                    </h3>
                    <p className="text-sm text-muted">
                        Pick your signature color for this workspace.
                    </p>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3">
                    {[
                        "#FF4D4D", "#FF8C42", "#FFD166", "#06D6A0", "#118AB2", "#7400B8",
                        "#5e60ce", "#4ea8de", "#48bfe3", "#56cfe1", "#64dfdf", "#72efdd",
                        "#80ffdb", "#ff006e", "#8338ec", "#3a86ff", "#fb5607", "#ffbe0b",
                        "#e0e1dd", "#778da9", "#415a77", "#1b263b", "#ef4444", "#3b82f6"
                    ].map((color) => {
                        const isSelected = currentMemberColor === color;
                        
                        return (
                            <button
                                key={color}
                                onClick={() => router.patch(`/workspaces/${workspace.slug}/preferences/color`, { color })}
                                className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${isSelected ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        );
                    })}
                </div>
            </section>

            {/* SECTION 1: General Settings */}
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

            {/* SECTION 2: Team Members & invitations */}
            <section className="bg-surface border border-border p-8 rounded-3xl space-y-8">
                <div>
                    <h3 className="text-xl font-bold text-white">
                        Team Members
                    </h3>
                    <p className="text-sm text-muted">
                        Manage who has access to this workspace.
                    </p>
                </div>

                {/* Member List */}
                <div className="space-y-4">
                    {workspace.members.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between p-4 bg-surface2/50 rounded-2xl border border-border"
                        >
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
                                    style={{ backgroundColor: member.pivot?.color || '#3b82f6' }}
                                >
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-white font-medium">
                                        {member.name}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {member.email}
                                    </p>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-border text-[10px] uppercase font-black tracking-widest text-muted">
                                {member.pivot?.role || "Owner"}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Pending Invitations */}
                {(workspace.invitations || []).filter(invite => invite.status !== 'accepted').length > 0 && (
                    <div className="space-y-4 pt-6">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted">
                            Pending & Recently Declined
                        </h4>
                        <div className="space-y-2">
                            {(workspace.invitations || [])
                                .filter(invite => invite.status !== 'accepted')
                                .map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex items-center justify-between p-3 bg-surface2/30 rounded-xl border border-border/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-muted">
                                                <Mail size={14} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-white font-medium">
                                                    {invite.email}
                                                </p>
                                                <p className="text-[10px] text-muted uppercase">
                                                    Role: {invite.role}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                invite.status === 'pending' 
                                                    ? 'bg-accent/10 text-accent border-accent/20' 
                                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                                {invite.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Invite Form */}
                <div className="pt-6 border-t border-border">
                    <div className="mb-6">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                            Invite New Member
                        </h4>
                        <p className="text-xs text-muted mt-1">
                            Team members will receive a notification instantly if they have a DevSpace account.
                        </p>
                    </div>
                    <form
                        onSubmit={submitInvite}
                        className="flex flex-wrap items-end gap-4"
                    >
                        <div className="flex-1 min-w-[200px]">
                            <Input
                                label="EMAIL ADDRESS"
                                placeholder="colleague@example.com"
                                value={inviteForm.data.email}
                                onChange={(e) =>
                                    inviteForm.setData("email", e.target.value)
                                }
                                error={inviteForm.errors.email}
                            />
                        </div>
                        <Button
                            loading={inviteForm.processing}
                            className="w-auto px-8 mb-0.5"
                        >
                            Send Invite
                        </Button>
                    </form>
                </div>
            </section>

            {/* SECTION 3: Danger Zone */}
            <section className="bg-accent-red/5 border border-accent-red/20 p-8 rounded-3xl space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
                    <h3 className="text-xl font-bold text-accent-red">
                        Danger Zone
                    </h3>
                </div>

                <div className="space-y-8">
                    {isOwner && (workspace.projects || []).length > 0 && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                    Delete a project
                                </h4>
                                <p className="text-xs text-muted mt-1">
                                    Permanently removes the project and every
                                    task inside it.
                                </p>
                            </div>
                            <div className="space-y-2">
                                {(workspace.projects || []).map((project) => (
                                    <div
                                        key={project.id}
                                        className="flex flex-col gap-3 rounded-2xl border border-accent-red/20 bg-surface2/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-white">
                                                {project.name}
                                            </p>
                                            <p className="text-[10px] font-mono text-muted">
                                                {project.slug}
                                            </p>
                                        </div>
                                        {confirmingProjectId === project.id ? (
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    onClick={() =>
                                                        submitProjectDelete(
                                                            project,
                                                        )
                                                    }
                                                    loading={
                                                        deletingProjectId ===
                                                        project.id
                                                    }
                                                    disabled={
                                                        deletingProjectId ===
                                                        project.id
                                                    }
                                                    className="w-auto px-5 bg-accent-red hover:bg-accent-red/80 border-accent-red/20 text-xs"
                                                >
                                                    Confirm
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmingProjectId(
                                                            null,
                                                        )
                                                    }
                                                    disabled={
                                                        deletingProjectId ===
                                                        project.id
                                                    }
                                                    className="w-auto px-5 bg-surface hover:bg-surface2 border-border text-xs"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    setConfirmingProjectId(
                                                        project.id,
                                                    )
                                                }
                                                className="w-auto px-5 bg-accent-red/10 hover:bg-accent-red border-accent-red/30 text-accent-red text-xs"
                                            >
                                                Delete project
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 border-t border-accent-red/20 pt-6">
                    <p className="text-sm text-muted">
                        Once you delete a workspace, there is no going back.
                        Please be certain.
                    </p>
                    {isOwner && (confirmingDelete ? (
                        <div className="space-y-4 rounded-2xl border border-accent-red/25 bg-accent-red/10 p-5">
                            <p className="text-sm text-white">
                                Delete{" "}
                                <span className="font-bold">
                                    {workspace.name}
                                </span>
                                ? This permanently removes the workspace.
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
                    ))}
                    {!isOwner && (
                        <p className="text-xs text-muted italic">
                            Only the workspace owner can delete projects or the
                            workspace.
                        </p>
                    )}
                    </div>
                </div>
            </section>
        </div>
    );
}

Settings.layout = (page) => <AppLayout children={page} />;
