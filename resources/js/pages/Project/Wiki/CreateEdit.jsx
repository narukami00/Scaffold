import { useEffect, useRef, useState } from "react";
import { useForm, usePage } from "@inertiajs/react";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import { Head, Link } from "@inertiajs/react";
import ProjectHeader from "@/components/project/ProjectHeader";
import MarkdownEditor from "@/components/ui/MarkdownEditor";
import axios from "axios";
import { Save, ArrowLeft, Lock } from "lucide-react";

// ── Palette tokens ────────────────────────────────────────────────────────────
const C = {
    bg:      "#ede0c8",
    card:    "#f3e4c9",
    navy:    "#0a2947",
    brown:   "#8b5e3c",
    sage:    "#d3d4c0",
    border:  "rgba(139,94,60,0.18)",
    muted:   "rgba(10,41,71,0.68)",
    faint:   "rgba(10,41,71,0.25)",
};

export default function CreateEdit({ workspace, project, wiki = null, isEdit = false }) {
    const { auth } = usePage().props;
    const { data, setData, post, patch, processing, errors } = useForm({
        title: wiki ? wiki.title : "",
        content: wiki ? wiki.content : "",
    });

    const [editorId, setEditorId] = useState(auth?.user?.id ?? null);
    const [presence, setPresence] = useState([]);
    const channelRef = useRef(null);

    const isEditor = !isEdit || editorId === auth?.user?.id;
    const editorName =
        presence.find((user) => user.id === editorId)?.name || "Another member";

    useEffect(() => {
        if (!isEdit || !wiki?.id || !window.Echo) return;

        const channel = window.Echo.join(`wiki.${wiki.id}`);
        channelRef.current = channel;

        channel
            .here((users) => {
                setPresence(users);
                const sorted = [...users].sort(
                    (a, b) => a.joined_at - b.joined_at,
                );
                setEditorId(sorted[0]?.id ?? null);
            })
            .joining((user) => {
                setPresence((prev) => [...prev, user]);
            })
            .leaving((user) => {
                setPresence((prev) => {
                    const filtered = prev.filter((u) => u.id !== user.id);
                    setEditorId((current) => {
                        if (current === user.id && filtered.length > 0) {
                            const next = [...filtered].sort(
                                (a, b) => a.joined_at - b.joined_at,
                            )[0];
                            return next.id;
                        }
                        if (current === user.id) return null;
                        return current;
                    });
                    return filtered;
                });
            });

        return () => {
            window.Echo.leave(`wiki.${wiki.id}`);
        };
    }, [isEdit, wiki?.id]);

    useEffect(() => {
        if (!isEdit || !wiki?.id || !isEditor) return;

        const lockUrl = `/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${wiki.slug}/lock`;
        const unlockUrl = `/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${wiki.slug}/unlock`;

        axios
            .post(lockUrl, null, {
                headers: { "X-Requested-With": "XMLHttpRequest" },
            })
            .catch((error) => {
                console.error("Failed to lock wiki for editing", error);
            });

        return () => {
            axios
                .post(unlockUrl, null, {
                    headers: { "X-Requested-With": "XMLHttpRequest" },
                })
                .catch(() => {});
        };
    }, [isEdit, wiki?.id, wiki?.slug, isEditor, workspace.slug, project.slug]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isEditor) return;

        if (isEdit) {
            patch(`/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${wiki.slug}`);
        } else {
            post(`/workspaces/${workspace.slug}/projects/${project.slug}/wiki`);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Head title={isEdit ? `${project.name} - Edit Wiki` : `${project.name} - New Wiki`} />
            <ProjectHeader workspace={workspace} project={project} activeTab="wiki" />

            <div className="rounded-2xl border p-6"
                style={{ background: C.card, borderColor: C.border }}>
                <div className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: C.border }}>
                    <div className="flex items-center gap-3">
                        <Link
                            href={
                                wiki
                                    ? `/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${wiki.slug}`
                                    : `/workspaces/${workspace.slug}/projects/${project.slug}/wiki`
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-xl border transition-all"
                            style={{ borderColor: C.border, color: C.muted, background: "rgba(139,94,60,0.03)" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = C.brown; e.currentTarget.style.color = C.brown; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
                        >
                            <ArrowLeft size={14} />
                        </Link>
                        <div>
                            <h2 className="font-display font-black text-lg" style={{ color: C.navy }}>
                                {isEdit ? "Edit Wiki Page" : "Create Wiki Page"}
                            </h2>
                            {isEdit && !isEditor && (
                                <p className="mt-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800">
                                    <Lock size={10} />
                                    {editorName} is editing — read only
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: C.brown }}>
                            Page Title
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Database Architecture Guide"
                            value={data.title}
                            onChange={(e) => setData("title", e.target.value)}
                            disabled={!isEditor || processing}
                            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                            style={{
                                background: "rgba(139,94,60,0.04)",
                                borderColor: C.border,
                                color: C.navy,
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = C.brown}
                            onBlur={e => e.currentTarget.style.borderColor = C.border}
                            required
                        />
                        {errors.title && (
                            <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                                {errors.title}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: C.brown }}>
                            Markdown Content
                        </label>
                        <MarkdownEditor
                            value={data.content}
                            onChange={(val) => setData("content", val)}
                            placeholder="Write your wiki documentation here in Markdown format..."
                            uploadUrl={`/workspaces/${workspace.slug}/media/upload`}
                            projectId={project.id}
                            disabled={!isEditor || processing}
                        />
                        {errors.content && (
                            <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                                {errors.content}
                            </p>
                        )}
                        {errors.wiki && (
                            <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                                {errors.wiki}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4" style={{ borderColor: C.border }}>
                        <Link
                            href={
                                wiki
                                    ? `/workspaces/${workspace.slug}/projects/${project.slug}/wiki/${wiki.slug}`
                                    : `/workspaces/${workspace.slug}/projects/${project.slug}/wiki`
                            }
                            className="rounded-xl border px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors"
                            style={{ borderColor: C.border, color: C.muted }}
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={!isEditor || processing}
                            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ background: C.brown, color: "#f3e4c9" }}
                            onMouseEnter={e => { if (isEditor) e.currentTarget.style.background = "#a06b43"; }}
                            onMouseLeave={e => { if (isEditor) e.currentTarget.style.background = C.brown; }}
                        >
                            <Save size={14} />
                            {processing ? "Saving…" : isEdit ? "Save Changes" : "Create Page"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

CreateEdit.layout = (page) => <WorkspaceLayout children={page} />;
