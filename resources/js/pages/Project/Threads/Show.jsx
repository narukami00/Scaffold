import React, { useState, useEffect, useMemo } from 'react';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { ChevronLeft, MessageSquare, Clock, User, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import CommentTree from '@/components/threads/CommentTree';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';

// Main Thread Component
export default function ThreadShow({ workspace, project, thread: initialThread }) {
    const { auth } = usePage().props;
    const currentUserId = auth?.user?.id;
    
    // Maintain reactive thread state to support realtime updates
    const [thread, setThread] = useState(initialThread);

    // Group thread reactions
    const groupedReactions = useMemo(() => {
        if (!thread.reactions) return {};
        return thread.reactions.reduce((acc, rx) => {
            acc[rx.emoji] = acc[rx.emoji] || [];
            acc[rx.emoji].push(rx);
            return acc;
        }, {});
    }, [thread.reactions]);

    // Top-level composer
    const { data, setData, post, processing, reset } = useForm({
        body: '',
        parent_id: null,
    });

    const submitReply = (e) => {
        e.preventDefault();
        post(route('workspaces.projects.threads.replies.store', [workspace.slug, project.id, thread.id]), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const toggleThreadPin = () => {
        post(route('workspaces.projects.threads.pin', [workspace.slug, project.id, thread.id]), {
            preserveScroll: true,
        });
    };

    const toggleReaction = (reactable_type, reactable_id, emoji) => {
        router.post(route('workspaces.projects.reactions.toggle', [workspace.slug, project.id]), {
            reactable_type,
            reactable_id,
            emoji
        }, { preserveScroll: true });
    };

    // ----- Websocket Live Updates -----
    useEffect(() => {
        const channel = window.Echo.private(`project.${project.id}`);
        const presenceChannel = window.Echo.join(`presence-thread.${thread.id}`);

        channel
            .listen('.ThreadReplyCreated', (e) => {
                // If it belongs to this thread, append it
                if (e.reply.thread_id === thread.id) {
                    setThread(prev => {
                        const exists = prev.replies.some(r => r.id === e.reply.id);
                        if (exists) return prev;
                        return { ...prev, replies: [...prev.replies, e.reply] }
                    });
                }
            })
            .listen('.ReactionToggled', (e) => {
                // Determine if it affects Thread or Reply
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
                        // Ensure only one is definitive
                        if (reply.id === e.reply.id) {
                            return { ...reply, is_definitive: e.reply.is_definitive };
                        } else {
                            return { ...reply, is_definitive: false };
                        }
                    });
                    // Sort replies to bring definitive to top
                    newReplies.sort((a,b) => (b.is_definitive ? 1 : 0) - (a.is_definitive ? 1 : 0));
                    return { ...prev, replies: newReplies };
                });
            });

        return () => {
            channel.stopListening('.ThreadReplyCreated');
            channel.stopListening('.ReactionToggled');
            channel.stopListening('.ReplyMarkedDefinitive');
            window.Echo.leave(`project.${project.id}`);
            window.Echo.leave(`presence-thread.${thread.id}`);
        };
    }, [project.id, thread.id]);

    // Derived sync with initial props if Inertia makes a page reload
    useEffect(() => {
        setThread(initialThread);
    }, [initialThread]);


    return (
        <div className="flex min-h-[70vh] h-full flex-col lg:min-h-0">
            <Head title={`${thread.title || 'Thread'} | ${project.name}`} />

            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full">
                
                {/* Top Nav */}
                <Link href={route('workspaces.projects.threads.index', [workspace.slug, project.id])} className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-white transition-colors mb-6">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Threads
                </Link>

                {/* Main Thread Body */}
                <div className="bg-[#111113] border border-white/5 shadow-2xl rounded-2xl overflow-hidden mb-8">
                    <div className="p-6 md:p-8">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <img 
                                    src={thread.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(thread.user?.name || 'U')}&background=random`} 
                                    className="w-12 h-12 rounded-full border-2 border-white/10"
                                    alt={thread.user?.name} 
                                />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                                            {thread.title || 'Discussion'}
                                        </h1>
                                        {thread.is_pinned && <Pin className="w-4 h-4 text-amber-500 fill-amber-500/20" />}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                                        <span className="flex items-center gap-1 font-medium text-indigo-300">
                                            <User className="w-3.5 h-3.5" />
                                            {thread.user?.name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Actions */}
                            {currentUserId === workspace.owner_id && (
                                <button onClick={toggleThreadPin} title="Pin Thread" className={`p-2 rounded-lg transition-colors ${thread.is_pinned ? 'bg-amber-500/20 text-amber-500' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}>
                                    <Pin className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="prose prose-invert prose-blue max-w-none mb-8 text-zinc-300 leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {thread.body}
                            </ReactMarkdown>
                        </div>

                        {/* Reactions & Info */}
                        <div className="flex items-center gap-2 border-t border-white/10 pt-4">
                            {Object.entries(groupedReactions).map(([emoji, reactions]) => (
                                <button
                                    key={emoji}
                                    onClick={() => toggleReaction('App\\Models\\Thread', thread.id, emoji)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                                        reactions.some(rx => rx.user_id === currentUserId) 
                                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                                        : 'bg-zinc-800 text-zinc-400 border-white/5 hover:bg-zinc-700'
                                    }`}
                                >
                                    <span>{emoji}</span>
                                    <span>{reactions.length}</span>
                                </button>
                            ))}
                            {/* Thread Quick Reaction Add */}
                            <div className="group relative">
                                <button className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-white/20 text-zinc-500 hover:text-zinc-300 hover:border-white/40 transition-colors bg-zinc-900 ml-1">
                                    +
                                </button>
                                <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex gap-1 bg-zinc-800 p-1.5 rounded-xl border border-white/10 shadow-2xl z-50">
                                    {['👍','👎','❤️','🚀','👀','🎉'].map(emoji => (
                                        <button 
                                            key={emoji}
                                            onClick={() => toggleReaction('App\\Models\\Thread', thread.id, emoji)}
                                            className="hover:bg-zinc-700 p-1.5 rounded-lg text-lg leading-none transition-transform hover:scale-110 active:scale-95"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                                <MessageSquare className="w-4 h-4" />
                                {thread.replies?.length || 0} Replies
                            </div>
                        </div>
                    </div>

                    {/* Top Level Reply Composer */}
                    <div className="px-6 py-4 md:px-8 bg-black/40 border-t border-white/5">
                        <form onSubmit={submitReply}>
                            <MarkdownEditor 
                                value={data.body}
                                onChange={val => setData('body', val)}
                                uploadUrl={route('workspaces.media.upload', workspace.slug)}
                                placeholder="Add a comment to this thread..."
                            />
                            <div className="flex justify-end mt-3">
                                <button
                                    type="submit"
                                    disabled={processing || !data.body.trim()}
                                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-bold rounded-lg shadow-xl shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-[0.98]"
                                >
                                    {processing ? 'Posting...' : 'Comment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Recursive Reply Tree */}
                {thread.replies && thread.replies.length > 0 && (
                    <div className="pl-4 md:pl-8 border-l border-white/10 ml-2 md:ml-4 pb-20">
                        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                            Discussion <span className="bg-white/10 px-2 py-0.5 rounded-full text-white">{thread.replies.length}</span>
                        </h3>
                        <CommentTree 
                            replies={thread.replies} 
                            workspace={workspace} 
                            project={project}
                            currentUserId={currentUserId}
                            onReactionToggle={toggleReaction}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

ThreadShow.layout = page => <WorkspaceLayout children={page} />;
