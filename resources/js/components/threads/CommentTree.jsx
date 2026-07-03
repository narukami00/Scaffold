import React, { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { User, MessageSquare, CheckCircle, Reply } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import { useForm } from '@inertiajs/react';

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

// A single Reaction Pill
const ReactionBadge = ({ emoji, count, hasReacted, onToggle }) => {
    return (
        <button
            onClick={() => onToggle(emoji)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors border ${
                hasReacted 
                ? 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20 hover:bg-indigo-500/20' 
                : 'bg-black/[0.03] text-slate-500 border-black/5 hover:bg-black/[0.06] hover:text-slate-800'
            }`}
        >
            <span>{emoji}</span>
            <span>{count}</span>
        </button>
    );
};

// Component for a Single Reply Node
const ReplyNode = ({ reply, allReplies, workspace, project, currentUserId, onReactionToggle, threadUserId, depth = 0 }) => {
    const [isReactionOpen, setIsReactionOpen] = useState(false);
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
        post(`/workspaces/${workspace.slug}/projects/${project.slug}/threads/${reply.thread_id}/replies`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsReplying(false);
                reset();
            }
        });
    };

    const toggleDefinitive = () => {
        post(`/workspaces/${workspace.slug}/projects/${project.slug}/threads/${reply.thread_id}/replies/${reply.id}/definitive`, {
            preserveScroll: true,
        });
    };

    return (
        <div className={`flex relative mt-4 ${depth >= 2 ? '-ml-7 sm:ml-0' : ''} ${reply.is_definitive ? 'bg-emerald-500/[0.02] -mx-4 px-4 py-3 border border-emerald-500/20 rounded-xl' : ''}`}>
            {/* Thread linking line */}
            <div className="flex flex-col items-center mr-2 sm:mr-3 mt-1 cursor-pointer group" onClick={() => setIsCollapsed(!isCollapsed)}>
                <img 
                    src={reply.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user?.name || 'U')}&background=random`} 
                    alt={reply.user?.name}
                    className={`rounded-full z-10 box-content border-[3px] ${depth > 0 ? 'w-6 h-6' : 'w-8 h-8'}`} 
                    style={{ borderColor: C.card, background: C.brown }}
                />
                {!isCollapsed && children.length > 0 && (
                    <div className="w-[2px] bg-slate-300 flex-1 my-1 group-hover:bg-[#8b5e3c]/50 transition-colors rounded-full" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="pl-1">
                    <div className="flex items-center gap-2 mb-1 group">
                        <span className="font-semibold text-sm" style={{ color: C.navy }}>{reply.user?.name}</span>
                        <span className="text-xs" style={{ color: C.muted }}>
                            {safeFormatDistance(reply.created_at)}
                        </span>
                        
                        {/* Definitive Marker */}
                        {reply.is_definitive && (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded ml-2">
                                <CheckCircle className="w-2.5 h-2.5" />
                                Solution
                            </span>
                        )}
                        
                        {/* Solved Controls */}
                        {!reply.is_definitive && (currentUserId === workspace.owner_id || currentUserId === threadUserId) && (
                            <button 
                                onClick={toggleDefinitive} 
                                className="ml-auto flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                style={{ color: C.muted }}
                                onMouseEnter={e => e.currentTarget.style.color = "#2d6a4f"}
                                onMouseLeave={e => e.currentTarget.style.color = C.muted}
                            >
                                Mark Solved
                            </button>
                        )}
                        {reply.is_definitive && (currentUserId === workspace.owner_id || currentUserId === threadUserId) && (
                            <button 
                                onClick={toggleDefinitive} 
                                className="ml-auto flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 hover:text-slate-500 transition-all cursor-pointer"
                            >
                                Unmark Solved
                            </button>
                        )}
                    </div>

                    {!isCollapsed && (
                        <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-normal">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{reply.body}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Actions & Reactions Row */}
                {!isCollapsed && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 pl-1">
                        <button 
                            onClick={() => setIsReplying(!isReplying)}
                            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#8b5e3c] transition-colors"
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
                            {/* Simple Quick Add Reaction */}
                            <div className="group relative z-10 flex">
                                <button 
                                    type="button"
                                    onClick={() => setIsReactionOpen(v => !v)}
                                    className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed text-slate-400 hover:text-[#8b5e3c] hover:border-[#8b5e3c]/50 transition-colors ml-1 bg-transparent shrink-0"
                                    style={{ borderColor: C.border }}>
                                    +
                                </button>
                                <div className={`absolute top-full left-0 mt-1 gap-1 p-1 rounded-xl shadow-xl z-50 ${isReactionOpen ? 'flex' : 'hidden md:group-hover:flex'}`}
                                    style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                                    {['👍','👎','❤️','🚀','👀','🎉'].map(emoji => (
                                        <button 
                                            key={emoji}
                                            type="button"
                                            onClick={() => {
                                                onReactionToggle('App\\Models\\ThreadReply', reply.id, emoji);
                                                setIsReactionOpen(false);
                                            }}
                                            className="hover:bg-black/10 p-1.5 rounded text-base leading-none transition-colors"
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
                            uploadUrl={`/workspaces/${workspace.slug}/media/upload`}
                            placeholder={`Reply to ${reply.user?.name}...`}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => { reset(); setIsReplying(false); }}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-[#8b5e3c] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing || !data.body.trim()}
                                className="px-4 py-1.5 text-xs font-bold rounded-xl shadow transition-colors"
                                style={{ background: C.brown, color: "#f3e4c9" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#a06b43"}
                                onMouseLeave={e => e.currentTarget.style.background = C.brown}
                            >
                                Post Reply
                            </button>
                        </div>
                    </form>
                )}

                {/* Recursive Children rendering */}
                {!isCollapsed && children.length > 0 && (
                    <div className="mt-1">
                        {children.map(child => (
                            <ReplyNode 
                                key={child.id} 
                                reply={child} 
                                allReplies={allReplies} 
                                workspace={workspace} 
                                project={project}
                                currentUserId={currentUserId}
                                onReactionToggle={onReactionToggle}
                                threadUserId={threadUserId}
                                depth={depth + 1}
                            />
                        ))}
                    </div>
                )}

                {/* Show collapsed indicator */}
                {isCollapsed && children.length > 0 && (
                    <button onClick={() => setIsCollapsed(false)} className="text-xs text-indigo-700 font-semibold py-1 hover:underline ml-1">
                        Show {children.length} {children.length === 1 ? 'reply' : 'replies'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default function CommentTree({ replies, workspace, project, currentUserId, onReactionToggle, threadUserId }) {
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
                    threadUserId={threadUserId}
                />
            ))}
        </div>
    );
}
