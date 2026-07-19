import React, { useState, useEffect, useMemo } from 'react';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { ChevronLeft, MessageSquare, Clock, User, Pin, CheckCircle2, Pencil, Trash2, X, Save } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import CommentTree from '@/components/threads/CommentTree';
import ProjectHeader from '@/components/project/ProjectHeader';
import SafeMarkdown from '@/components/ui/SafeMarkdown';

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

export default function ThreadShow({ workspace, project, thread: initialThread }) {
    const { auth } = usePage().props;
    const currentUserId = auth?.user?.id;
    
    const [thread, setThread] = useState(initialThread);
    const [isReactionOpen, setIsReactionOpen] = useState(false);
    const [isEditingThread, setIsEditingThread] = useState(false);

    const groupedReactions = useMemo(() => {
        if (!thread.reactions) return {};
        return thread.reactions.reduce((acc, rx) => {
            acc[rx.emoji] = acc[rx.emoji] || [];
            acc[rx.emoji].push(rx);
            return acc;
        }, {});
    }, [thread.reactions]);

    const safeFormatDistance = (dateStr) => {
        try {
            if (!dateStr) return 'recently';
            const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
            const date = new Date(normalized);
            if (isNaN(date.getTime())) return 'recently';
            return formatDistanceToNow(date, { addSuffix: true });
        } catch (e) {
            return 'recently';
        }
    };

    const { data, setData, post, processing, reset } = useForm({
        body: '',
        parent_id: null,
    });
    const threadEdit = useForm({
        title: initialThread.title || '',
        body: initialThread.body || '',
        tags: initialThread.tags || [],
    });

    const submitReply = (e) => {
        e.preventDefault();
        post(`/workspaces/${workspace.slug}/projects/${project.slug}/threads/${thread.id}/replies`, {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const toggleThreadPin = () => {
        router.post(`/workspaces/${workspace.slug}/projects/${project.slug}/threads/${thread.id}/pin`, {}, {
            preserveScroll: true,
        });
    };

    const updateThread = (event) => {
        event.preventDefault();
        threadEdit.patch(`/workspaces/${workspace.slug}/projects/${project.slug}/threads/${thread.id}`, {
            preserveScroll: true,
            onSuccess: () => setIsEditingThread(false),
        });
    };

    const deleteThread = () => {
        if (!window.confirm('Delete this entire thread and all of its replies? This cannot be undone.')) return;
        router.delete(`/workspaces/${workspace.slug}/projects/${project.slug}/threads/${thread.id}`);
    };

    const toggleReaction = (reactable_type, reactable_id, emoji) => {
        router.post(`/workspaces/${workspace.slug}/projects/${project.slug}/reactions/toggle`, {
            reactable_type,
            reactable_id,
            emoji
        }, { preserveScroll: true });
    };

    useEffect(() => {
        const channel = window.Echo.private(`project.${project.id}`);
        const presenceChannel = window.Echo.join(`presence-thread.${thread.id}`);

        channel
            .listen('.ThreadReplyCreated', (e) => {
                if (e.reply.thread_id === thread.id) {
                    setThread(prev => {
                        const exists = prev.replies.some(r => r.id === e.reply.id);
                        if (exists) return prev;
                        return { ...prev, replies: [...prev.replies, e.reply] }
                    });
                }
            })
            .listen('.ThreadUpdated', (e) => {
                if (Number(e.thread.id) === Number(thread.id)) {
                    setThread(prev => ({ ...prev, ...e.thread }));
                }
            })
            .listen('.ThreadDeleted', (e) => {
                if (Number(e.threadId) === Number(thread.id)) {
                    router.visit(`/workspaces/${workspace.slug}/projects/${project.slug}/threads`);
                }
            })
            .listen('.ThreadReplyUpdated', (e) => {
                if (Number(e.reply.thread_id) === Number(thread.id)) {
                    setThread(prev => ({
                        ...prev,
                        replies: prev.replies.map(reply =>
                            Number(reply.id) === Number(e.reply.id) ? e.reply : reply
                        ),
                    }));
                }
            })
            .listen('.ThreadReplyDeleted', (e) => {
                if (Number(e.reply.thread_id) === Number(thread.id)) {
                    setThread(prev => ({
                        ...prev,
                        replies: prev.replies.map(reply =>
                            Number(reply.id) === Number(e.reply.id) ? e.reply : reply
                        ),
                    }));
                }
            })
            .listen('.ReactionToggled', (e) => {
                if (e.reaction.reactable_type === 'App\\Models\\Thread' && e.reaction.reactable_id === thread.id) {
                    setThread(prev => {
                        let newReactions = [...prev.reactions];
                        if (e.action === 'added') {
                            newReactions.push(e.reaction);
                        } else {
                            newReactions = newReactions.filter(r => r.id !== e.reaction.id);
                        }
                        return { ...prev, reactions: newReactions };
                    });
                } else if (e.reaction.reactable_type === 'App\\Models\\ThreadReply') {
                    setThread(prev => {
                        const newReplies = prev.replies.map(reply => {
                            if (reply.id === e.reaction.reactable_id) {
                                let newRx = [...(reply.reactions || [])];
                                if (e.action === 'added') newRx.push(e.reaction);
                                else newRx = newRx.filter(r => r.id !== e.reaction.id);
                                return { ...reply, reactions: newRx };
                            }
                            return reply;
                        });
                        return { ...prev, replies: newReplies };
                    });
                }
            })
            .listen('.ReplyMarkedDefinitive', (e) => {
                setThread(prev => {
                    const newReplies = prev.replies.map(reply => {
                        if (reply.id === e.reply.id) {
                            return { ...reply, is_definitive: e.reply.is_definitive };
                        } else {
                            return { ...reply, is_definitive: false };
                        }
                    });
                    newReplies.sort((a,b) => (b.is_definitive ? 1 : 0) - (a.is_definitive ? 1 : 0));
                    return { ...prev, replies: newReplies };
                });
            });

        return () => {
            channel.stopListening('.ThreadReplyCreated');
            channel.stopListening('.ThreadUpdated');
            channel.stopListening('.ThreadDeleted');
            channel.stopListening('.ThreadReplyUpdated');
            channel.stopListening('.ThreadReplyDeleted');
            channel.stopListening('.ReactionToggled');
            channel.stopListening('.ReplyMarkedDefinitive');
            window.Echo.leave(`project.${project.id}`);
            window.Echo.leave(`presence-thread.${thread.id}`);
        };
    }, [project.id, thread.id]);

    useEffect(() => {
        setThread(initialThread);
        threadEdit.setData({
            title: initialThread.title || '',
            body: initialThread.body || '',
            tags: initialThread.tags || [],
        });
    }, [initialThread]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <Head title={`${thread.title || 'Discussion'} — ${project.name}`} />

            <ProjectHeader workspace={workspace} project={project} activeTab="threads" />

            <Link href={`/workspaces/${workspace.slug}/projects/${project.slug}/threads`}
                className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest transition-colors mb-2"
                style={{ color: C.brown }}
                onMouseEnter={e => e.currentTarget.style.color = "#a06b43"}
                onMouseLeave={e => e.currentTarget.style.color = C.brown}>
                <ChevronLeft className="w-4 h-4" />
                Back to Discussions
            </Link>

            {/* Main Thread Body */}
            <div className="rounded-2xl border shadow-sm overflow-hidden"
                style={{ background: C.card, borderColor: C.border }}>
                <div className="p-6 md:p-8">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <Link
                                href={`/workspaces/${workspace.slug}/members/${thread.user_id}`}
                                className="hover:scale-105 active:scale-95 transition-all shrink-0"
                            >
                                <img 
                                    src={thread.user?.avatar_path || thread.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(thread.user?.name || 'U')}&background=random`} 
                                    className="w-12 h-12 rounded-full object-cover border border-black/5"
                                    style={{ background: C.brown }}
                                    alt={thread.user?.name} 
                                />
                            </Link>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="font-display font-black text-xl md:text-2xl leading-tight"
                                        style={{ color: C.navy, letterSpacing: "0.02em" }}>
                                        {thread.title || 'Discussion'}
                                    </h1>
                                    {thread.is_pinned && <Pin className="w-4 h-4 text-amber-600 fill-amber-500/20" />}
                                    {thread.replies?.some(r => r.is_definitive) && (
                                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                                            <CheckCircle2 size={10} />
                                            Solved
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs mt-1" style={{ color: C.muted }}>
                                    <Link 
                                        href={`/workspaces/${workspace.slug}/members/${thread.user_id}`}
                                        className="flex items-center gap-1 font-bold hover:underline" 
                                        style={{ color: C.navy }}
                                    >
                                        <User className="w-3.5 h-3.5" />
                                        {thread.user?.name}
                                    </Link>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {safeFormatDistance(thread.created_at)}
                                    </span>
                                    {thread.edited_at && (
                                        <span className="rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider" style={{ borderColor: C.border, color: C.brown }}>
                                            Edited
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {Number(currentUserId) === Number(thread.user_id) && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditingThread(true)}
                                    title="Edit thread"
                                    className="rounded-xl border p-2 transition hover:bg-black/5"
                                    style={{ borderColor: C.border, color: C.brown }}
                                >
                                    <Pencil size={15} />
                                </button>
                            )}
                            {(Number(currentUserId) === Number(thread.user_id) || Number(currentUserId) === Number(workspace.owner_id)) && (
                                <button
                                    type="button"
                                    onClick={deleteThread}
                                    title="Delete thread"
                                    className="rounded-xl border p-2 text-red-700 transition hover:bg-red-50"
                                    style={{ borderColor: "rgba(185,28,28,0.2)" }}
                                >
                                    <Trash2 size={15} />
                                </button>
                            )}
                            {Number(currentUserId) === Number(workspace.owner_id) && (
                                <button onClick={toggleThreadPin} title="Pin Thread"
                                    className={`p-2 rounded-xl transition-all border ${
                                        thread.is_pinned
                                        ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-700 border-transparent hover:border-slate-300 bg-transparent'
                                    }`}>
                                    <Pin className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    {isEditingThread ? (
                        <form onSubmit={updateThread} className="mb-8 space-y-3 rounded-2xl border p-4" style={{ borderColor: C.border }}>
                            <input
                                value={threadEdit.data.title}
                                onChange={(event) => threadEdit.setData('title', event.target.value)}
                                placeholder="Discussion title"
                                className="w-full rounded-xl border bg-white/50 px-4 py-2 text-sm font-bold outline-none focus:border-[#8b5e3c]"
                                style={{ borderColor: C.border, color: C.navy }}
                            />
                            <input
                                value={(threadEdit.data.tags || []).join(', ')}
                                onChange={(event) => threadEdit.setData(
                                    'tags',
                                    event.target.value
                                        .split(',')
                                        .map(tag => tag.trim())
                                        .filter(Boolean),
                                )}
                                placeholder="Tags, separated by commas"
                                className="w-full rounded-xl border bg-white/50 px-4 py-2 text-xs font-semibold outline-none focus:border-[#8b5e3c]"
                                style={{ borderColor: C.border, color: C.navy }}
                            />
                            <MarkdownEditor
                                value={threadEdit.data.body}
                                onChange={(value) => threadEdit.setData('body', value)}
                                uploadUrl={`/workspaces/${workspace.slug}/media/upload`}
                                placeholder="Update your discussion..."
                            />
                            {threadEdit.errors.body && <p className="text-xs font-bold text-red-700">{threadEdit.errors.body}</p>}
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsEditingThread(false)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold" style={{ color: C.muted }}>
                                    <X size={14} /> Cancel
                                </button>
                                <button type="submit" disabled={threadEdit.processing || !threadEdit.data.body.trim()} className="flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: C.brown, color: "#f3e4c9" }}>
                                    <Save size={14} /> Save changes
                                </button>
                            </div>
                        </form>
                    ) : (
                        <SafeMarkdown className="prose prose-sm max-w-none mb-8 text-slate-800 leading-relaxed font-normal">
                            {thread.body}
                        </SafeMarkdown>
                    )}

                    {thread.tags?.length > 0 && !isEditingThread && (
                        <div className="mb-5 flex flex-wrap gap-2">
                            {thread.tags.map(tag => (
                                <span key={tag} className="rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider" style={{ borderColor: C.border, color: C.brown, background: "rgba(139,94,60,0.06)" }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Reactions & Info */}
                    <div className="flex items-center gap-2 border-t pt-4" style={{ borderColor: C.border }}>
                        {Object.entries(groupedReactions).map(([emoji, reactions]) => (
                            <button
                                key={emoji}
                                onClick={() => toggleReaction('App\\Models\\Thread', thread.id, emoji)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                                    reactions.some(rx => rx.user_id === currentUserId) 
                                    ? 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20' 
                                    : 'bg-black/[0.03] text-slate-500 border-black/5 hover:bg-black/[0.06] hover:text-slate-800'
                                }`}
                            >
                                <span>{emoji}</span>
                                <span>{reactions.length}</span>
                            </button>
                        ))}
                        {/* Thread Quick Reaction Add */}
                        <div className="group relative">
                            <button 
                                type="button"
                                onClick={() => setIsReactionOpen(v => !v)}
                                className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed text-slate-400 hover:text-[#8b5e3c] hover:border-[#8b5e3c]/50 transition-colors ml-1 bg-transparent"
                                style={{ borderColor: C.border }}>
                                +
                            </button>
                            <div className={`absolute bottom-full left-0 mb-1.5 gap-1 p-1 rounded-xl shadow-2xl z-50 ${isReactionOpen ? 'flex' : 'hidden md:group-hover:flex'}`}
                                style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                                {['👍','👎','❤️','🚀','👀','🎉'].map(emoji => (
                                    <button 
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                            toggleReaction('App\\Models\\Thread', thread.id, emoji);
                                            setIsReactionOpen(false);
                                        }}
                                        className="hover:bg-black/10 p-1.5 rounded text-base leading-none transition-all hover:scale-110 active:scale-95"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="ml-auto flex items-center gap-1.5 text-xs font-bold" style={{ color: C.brown }}>
                            <MessageSquare className="w-4 h-4" />
                            {thread.replies?.length || 0} Replies
                        </div>
                    </div>
                </div>

                {/* Top Level Reply Composer */}
                <div className="px-6 py-5 md:px-8 border-t"
                    style={{ background: "rgba(139,94,60,0.03)", borderColor: C.border }}>
                    <form onSubmit={submitReply}>
                        <MarkdownEditor 
                            value={data.body}
                            onChange={val => setData('body', val)}
                            uploadUrl={`/workspaces/${workspace.slug}/media/upload`}
                            placeholder="Add a comment to this thread..."
                        />
                        <div className="flex justify-end gap-2 mt-3">
                            {data.body.trim() && (
                                <button
                                    type="button"
                                    onClick={() => reset()}
                                    disabled={processing}
                                    className="px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-[#8b5e3c] transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={processing || !data.body.trim()}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                                style={{ background: C.brown, color: "#f3e4c9" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#a06b43"}
                                onMouseLeave={e => e.currentTarget.style.background = C.brown}
                            >
                                {processing ? 'Posting...' : 'Comment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Recursive Reply Tree */}
            {thread.replies && thread.replies.length > 0 && (
                <div className="pl-4 md:pl-8 ml-2 md:ml-4"
                    style={{ borderLeft: `1px solid ${C.border}` }}>
                    <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2"
                        style={{ color: C.muted }}>
                        Discussion <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(139,94,60,0.1)", color: C.navy }}>{thread.replies.length}</span>
                    </h3>
                    <CommentTree 
                        replies={thread.replies} 
                        workspace={workspace} 
                        project={project}
                        currentUserId={currentUserId}
                        onReactionToggle={toggleReaction}
                        threadUserId={thread.user_id}
                    />
                </div>
            )}
        </div>
    );
}

ThreadShow.layout = page => <WorkspaceLayout children={page} />;
