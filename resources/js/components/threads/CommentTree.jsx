import React, { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { User, MessageSquare, CheckCircle, Reply } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import { useForm, usePage } from '@inertiajs/react';

// A single Reaction Pill
const ReactionBadge = ({ emoji, count, hasReacted, onToggle }) => {
    return (
        <button
            onClick={() => onToggle(emoji)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors border ${
                hasReacted 
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30' 
                : 'bg-zinc-800/50 text-zinc-400 border-white/5 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
        >
            <span>{emoji}</span>
            <span>{count}</span>
        </button>
    );
};

// Component for a Single Reply Node
const ReplyNode = ({ reply, allReplies, workspace, project, currentUserId, onReactionToggle }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const children = allReplies.filter(r => r.parent_id === reply.id);
    
    // Group reactions by emoji
    const groupedReactions = useMemo(() => {
        if (!reply.reactions) return {};
        return reply.reactions.reduce((acc, rx) => {
            acc[rx.emoji] = acc[rx.emoji] || [];
            acc[rx.emoji].push(rx);
            return acc;
        }, {});
    }, [reply.reactions]);

    const { data, setData, post, processing, reset } = useForm({
        body: '',
        parent_id: reply.id
    });

    const submitReply = (e) => {
        e.preventDefault();
        post(route('workspaces.projects.threads.replies.store', [workspace.slug, project.id, reply.thread_id]), {
            preserveScroll: true,
            onSuccess: () => {
                setIsReplying(false);
                reset();
            }
        });
    };

    const toggleDefinitive = () => {
        post(route('workspaces.projects.threads.replies.definitive', [workspace.slug, project.id, reply.thread_id, reply.id]), {
            preserveScroll: true,
        });
    };

    return (
        <div className={`flex relative mt-4 ${reply.is_definitive ? 'bg-indigo-500/5 -mx-4 px-4 py-3 border border-indigo-500/20 rounded-xl' : ''}`}>
            {/* Thread linking line */}
            <div className="flex flex-col items-center mr-3 mt-1 cursor-pointer group" onClick={() => setIsCollapsed(!isCollapsed)}>
                <img 
                    src={reply.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user?.name || 'U')}&background=random`} 
                    alt={reply.user?.name}
                    className="w-8 h-8 rounded-full bg-zinc-800 z-10 box-content border-[3px] border-surface" 
                />
                {!isCollapsed && children.length > 0 && (
                    <div className="w-[2px] bg-zinc-800 flex-1 my-1 group-hover:bg-zinc-600 transition-colors rounded-full" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="pl-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-zinc-200 text-sm">{reply.user?.name}</span>
                        <span className="text-xs text-zinc-500">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </span>
                        
                        {/* Definitive Marker */}
                        {reply.is_definitive && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-sm ml-2">
                                <CheckCircle className="w-3 h-3" />
                                Definitive Answer
                            </span>
                        )}
                        
                        {/* Owner Controls */}
                        {!reply.is_definitive && currentUserId === workspace.owner_id && (
                            <button onClick={toggleDefinitive} className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-500 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100">
                                Mark Definitive
                            </button>
                        )}
                        {reply.is_definitive && currentUserId === workspace.owner_id && (
                            <button onClick={toggleDefinitive} className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase text-indigo-400 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100">
                                Unmark Definitive
                            </button>
                        )}
                    </div>

                    {!isCollapsed && (
                        <div className="prose prose-sm prose-invert max-w-none text-zinc-300">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{reply.body}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Actions & Reactions Row */}
                {!isCollapsed && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 pl-1">
                        <button 
                            onClick={() => setIsReplying(!isReplying)}
                            className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <Reply className="w-3.5 h-3.5" />
                            Reply
                        </button>
                        
                        {/* Reactions List */}
                        <div className="flex items-center gap-1 ml-2">
                            {Object.entries(groupedReactions).map(([emoji, reactions]) => (
                                <ReactionBadge 
                                    key={emoji}
                                    emoji={emoji} 
                                    count={reactions.length}
                                    hasReacted={reactions.some(rx => rx.user_id === currentUserId)}
                                    onToggle={(e) => onReactionToggle('App\\Models\\ThreadReply', reply.id, e)}
                                />
                            ))}
                            {/* Simple Quick Add Reaction (we can expand this to emoji picker later) */}
                            <div className="group relative z-10 flex">
                                <button className="flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-white/20 text-zinc-500 hover:text-zinc-300 hover:border-white/40 transition-colors bg-zinc-900 ml-1">
                                    +
                                </button>
                                <div className="absolute top-full left-0 mt-1 hidden group-hover:flex gap-1 bg-zinc-800 p-1 rounded-lg border border-white/10 shadow-xl">
                                    {['👍','👎','❤️','🚀','👀','🎉'].map(emoji => (
                                        <button 
                                            key={emoji}
                                            onClick={() => onReactionToggle('App\\Models\\ThreadReply', reply.id, emoji)}
                                            className="hover:bg-zinc-700 p-1 rounded text-base leading-none transition-colors"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Composer for nested reply */}
                {!isCollapsed && isReplying && (
                    <form onSubmit={submitReply} className="mt-3 pl-1 mb-2">
                        <MarkdownEditor 
                            value={data.body}
                            onChange={val => setData('body', val)}
                            uploadUrl={route('workspaces.media.upload', workspace.slug)}
                            placeholder={`Reply to ${reply.user?.name}...`}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => { reset(); setIsReplying(false); }}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing || !data.body.trim()}
                                className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-bold rounded shadow disabled:opacity-50 transition-colors"
                            >
                                Post Reply
                            </button>
                        </div>
                    </form>
                )}

                {/* Recursive Children rendering */}
                {!isCollapsed && children.length > 0 && (
                    <div className="">
                        {children.map(child => (
                            <ReplyNode 
                                key={child.id} 
                                reply={child} 
                                allReplies={allReplies} 
                                workspace={workspace} 
                                project={project}
                                currentUserId={currentUserId}
                                onReactionToggle={onReactionToggle}
                            />
                        ))}
                    </div>
                )}

                {/* Show collapsed indicator */}
                {isCollapsed && children.length > 0 && (
                    <button onClick={() => setIsCollapsed(false)} className="text-xs text-indigo-400 font-semibold py-1 hover:underline ml-1">
                        Show {children.length} {children.length === 1 ? 'reply' : 'replies'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default function CommentTree({ replies, workspace, project, currentUserId, onReactionToggle }) {
    // Root replies are those without a parent
    const rootReplies = replies.filter(r => r.parent_id === null);

    return (
        <div className="space-y-2 mt-4">
            {rootReplies.map(reply => (
                <ReplyNode 
                    key={reply.id} 
                    reply={reply} 
                    allReplies={replies} 
                    workspace={workspace} 
                    project={project}
                    currentUserId={currentUserId}
                    onReactionToggle={onReactionToggle}
                />
            ))}
        </div>
    );
}
