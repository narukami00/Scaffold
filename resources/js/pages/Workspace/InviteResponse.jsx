import AppLayout from "@/layouts/AppLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Button from "@/components/ui/Button";

export default function InviteResponse({ invitation, workspace }) {
    const { post, processing } = useForm();

    const submit = (e) => {
        e.preventDefault();
        post(`/invitations/accept/${invitation.token}`);
    };

    return (
        <div className="max-w-xl mx-auto py-12 space-y-8">
            <Head title="Join Workspace" />

            <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto mb-6">
                    <svg
                        className="w-10 h-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                    </svg>
                </div>

                <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter">
                    You're Invited!
                </h1>
                <p className="text-muted text-lg">
                    You have been invited to join{" "}
                    <span className="text-white font-bold">
                        {workspace.name}
                    </span>{" "}
                    as a{" "}
                    <span className="text-accent underline decoration-accent/30">
                        {invitation.role}
                    </span>
                    .
                </p>
            </div>

            <section className="bg-surface border border-border p-8 rounded-3xl space-y-6">
                <div className="space-y-4">
                    <p className="text-sm text-muted text-center italic">
                        By joining, you will be able to see all projects and
                        collaborate with the team.
                    </p>

                    <form onSubmit={submit} className="flex flex-col gap-3">
                        <Button
                            loading={processing}
                            className="w-full h-14 text-lg"
                        >
                            Accept Invitation & Join Team
                        </Button>

                        <Link
                            href="/workspaces"
                            className="text-center text-sm text-muted hover:text-white transition-colors py-2"
                        >
                            Not now, take me to my dashboard
                        </Link>
                    </form>
                </div>
            </section>
        </div>
    );
}

InviteResponse.layout = (page) => <AppLayout children={page} />;
