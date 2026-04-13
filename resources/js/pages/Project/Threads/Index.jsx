import React, { useState } from 'react';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { MessageSquare, Pin, Clock, User, PlusCircle, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MarkdownEditor from '@/components/ui/MarkdownEditor';

export default function ThreadIndex({ workspace, project, threads }) {
    const [isComposing, setIsComposing] = useState(false);
    const { data, setData, post, processing, reset, errors } = useForm({
        title: '',
        body: '',
    });

    const submitThread = (e) => {
        e.preventDefault();
        post(route('workspaces.projects.threads.store', [workspace.slug, project.id]), {
            onSuccess: () => {
                reset();
                setIsComposing(false);
            }
        });
    };

    return (
        <div className="flex min-h-[70vh] h-full flex-col space-y-4 sm:min-h-[75vh] sm:space-y-6 lg:min-h-0">
            <Head title={`Threads | ${project.name}`} />

            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 w-full">
                {/* Header Subtitle */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-display font-black uppercase tracking-tighter text-white sm:text-3xl flex items-center gap-4">
                        Project Threads
                        <div className="flex bg-surface2/50 rounded-lg p-1 border border-border mt-1">
                            <Link href={route('projects.board', [workspace.slug, project.slug])} className="px-3 py-1 text-xs font-bold uppercase tracking-widest rounded text-muted hover:text-white transition-colors">Board</Link>
                            <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest rounded bg-accent text-black shadow">Threads</span>
                        </div>
                    </h1>
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted mt-1">
                        Discuss architectural decisions, share updates, and collaborate globally.
                    </p>
                </div>

                {/* Composer */}
                <div className="bg-[#111113] border border-white/10 rounded-xl p-4 shadow-xl shadow-black/20">
                    {!isComposing ? (
                        <div 
                            className="flex items-center gap-3 cursor-text opacity-70 hover:opacity-100 transition-opacity"
                            onClick={() => setIsComposing(true)}
                        >
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                                <PlusCircle className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div className="text-sm text-zinc-500 flex-1">Start a new thread or announcement...</div>
                        </div>
                    ) : (
                        <form onSubmit={submitThread} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Thread title (optional)"
                                    value={data.title}
                                    onChange={e => setData('title', e.target.value)}
                                    className="w-full bg-transparent border-b border-white/5 pb-2 text-lg font-semibold text-zinc-200 focus:border-indigo-500 focus:ring-0 outline-none transition-colors"
                                />
                                {errors.title && <span className="text-xs text-red-500 mt-1 block">{errors.title}</span>}
                            </div>

                            <MarkdownEditor 
                                value={data.body}
                                onChange={val => setData('body', val)}
                                uploadUrl={route('workspaces.media.upload', workspace.slug)}
                                placeholder="What's on your mind? (Markdown & Image Drop supported)"
                            />
                            {errors.body && <span className="text-xs text-red-500 block">{errors.body}</span>}

                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => { reset(); setIsComposing(false); }}
                                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !data.body.trim()}
                                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-medium rounded-md shadow flex items-center justify-center disabled:opacity-50 transition-all duration-300"
                                >
                                    {processing ? 'Posting...' : 'Post Thread'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Thread List */}
                <div className="space-y-4">
                    {threads.length === 0 ? (
                        <div className="text-center py-16 px-4 bg-zinc-900/30 border border-dashed border-white/10 rounded-xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <h3 className="text-zinc-300 font-medium text-lg">No threads yet</h3>
                            <p className="text-zinc-500 text-sm mt-1">Start a discussion to get the team rolling.</p>
                        </div>
                    ) : (
                        threads.map(thread => (
                            <Link 
                                href={route('workspaces.projects.threads.show', [workspace.slug, project.id, thread.id])} 
                                key={thread.id} 
                                className="block rounded-xl border border-white/5 bg-[#111113] hover:bg-[#161619] transition-all hover:border-white/10 overflow-hidden relative group"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-indigo-500/50 transition-colors"></div>
                                <div className="p-5 flex gap-4 items-start">
                                    <img 
                                        src={thread.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(thread.user?.name || 'U')}&background=random`} 
                                        className="w-10 h-10 rounded-full bg-zinc-800"
                                        alt={thread.user?.name} 
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {thread.is_pinned && (
                                                <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                                            )}
                                            <h3 className="font-medium text-zinc-100 truncate flex-1">
                                                {thread.title || "Status Update"}
                                            </h3>
                                        </div>
                                        <div className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                                            {thread.body}
                                        </div>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                                            <span className="flex items-center gap-1.5 font-medium text-zinc-400">
                                                <User className="w-3.5 h-3.5" />
                                                {thread.user?.name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                                            </span>
                                            <span className="flex items-center gap-1.5 ml-auto font-medium text-zinc-400">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                {thread.replies_count} {thread.replies_count === 1 ? 'reply' : 'replies'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

ThreadIndex.layout = page => <WorkspaceLayout children={page} />;
