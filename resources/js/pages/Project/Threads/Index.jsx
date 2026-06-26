import React, { useState } from 'react';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { MessageSquare, Pin, Clock, User, PlusCircle, Check, CheckCircle2, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MarkdownEditor from '@/components/ui/MarkdownEditor';

export default function ThreadIndex({ workspace, project, threads, filters = {} }) {
    const [isComposing, setIsComposing] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const { data, setData, processing, reset, errors } = useForm({
        title: '',
        body: '',
    });

    const submitThread = (e) => {
        e.preventDefault();
        const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
        router.post(
            `/workspaces/${workspace.slug}/projects/${project.slug}/threads`,
            {
                title: data.title,
                body: data.body,
                tags: tags
            },
            {
                onSuccess: () => {
                    reset();
                    setTagInput('');
                    setIsComposing(false);
                }
            }
        );
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

    // Extract unique tags from threads list to build filters
    const allUniqueTags = Array.from(new Set(threads.flatMap(t => Array.isArray(t.tags) ? t.tags : [])));

    const handleTagFilter = (tag) => {
        const newParams = { ...filters };
        if (filters.tag === tag) {
            delete newParams.tag;
        } else {
            newParams.tag = tag;
        }
        router.get(window.location.pathname, newParams, { preserveState: true });
    };

    const handleStatusFilter = (status) => {
        const newParams = { ...filters };
        if (filters.status === status) {
            delete newParams.status;
        } else {
            newParams.status = status;
        }
        router.get(window.location.pathname, newParams, { preserveState: true });
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
                            <Link href={`/workspaces/${workspace.slug}/projects/${project.slug}/board`} className="px-3 py-1 text-xs font-bold uppercase tracking-widest rounded text-muted hover:text-white transition-colors">Board</Link>
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
                                uploadUrl={`/workspaces/${workspace.slug}/media/upload`}
                                placeholder="What's on your mind? (Markdown & Image Drop supported)"
                            />
                            {errors.body && <span className="text-xs text-red-500 block">{errors.body}</span>}

                            <div>
                                <input
                                    type="text"
                                    placeholder="Tags (comma-separated: e.g. bug, setup, auth)"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    className="w-full bg-transparent border-b border-white/5 pb-2 text-xs text-zinc-400 focus:border-indigo-500 focus:ring-0 outline-none transition-colors placeholder:text-zinc-600"
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => { reset(); setTagInput(''); setIsComposing(false); }}
                                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !data.body.trim()}
                                    className="px-6 py-2 bg-accent hover:scale-105 text-black text-sm font-black uppercase tracking-widest rounded-xl shadow flex items-center justify-center disabled:opacity-50 transition-all duration-300"
                                >
                                    {processing ? 'Posting...' : 'Post Thread'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Filters Section */}
                <div className="flex flex-wrap items-center gap-4 bg-surface2/30 rounded-2xl border border-border/40 p-4">
                    {/* Status filter buttons */}
                    <div className="flex bg-surface rounded-xl p-1 border border-border/50">
                        <button
                            onClick={() => handleStatusFilter('solved')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                filters.status === 'solved'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'text-muted hover:text-white'
                            }`}
                        >
                            Solved Only
                        </button>
                        <button
                            onClick={() => handleStatusFilter('unsolved')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                filters.status === 'unsolved'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'text-muted hover:text-white'
                            }`}
                        >
                            Unsolved Only
                        </button>
                    </div>

                    {/* Tag filter badges */}
                    {allUniqueTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 border-l border-border/50 pl-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1 mr-1">
                                <Tag size={10} /> Filter tags:
                            </span>
                            {allUniqueTags.map(tag => {
                                const isSelected = filters.tag === tag;
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => handleTagFilter(tag)}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                            isSelected
                                                ? 'bg-accent text-black border-accent/30'
                                                : 'bg-surface/50 text-muted border-border hover:text-white'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Thread List */}
                <div className="space-y-4">
                    {threads.length === 0 ? (
                        <div className="text-center py-16 px-4 bg-zinc-900/30 border border-dashed border-white/10 rounded-xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <h3 className="text-zinc-300 font-medium text-lg">No threads match these filters</h3>
                            <p className="text-zinc-500 text-sm mt-1">Clear your filter queries to view all discussions.</p>
                        </div>
                    ) : (
                        threads.map(thread => (
                            <Link 
                                href={`/workspaces/${workspace.slug}/projects/${project.slug}/threads/${thread.id}`} 
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
                                            
                                            {/* Status Badge */}
                                            {thread.is_solved && (
                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/5 px-2 py-0.5 rounded border border-emerald-400/10">
                                                    <CheckCircle2 size={10} />
                                                    Solved
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                                            {thread.body}
                                        </div>

                                        {/* Display Thread Tags */}
                                        {Array.isArray(thread.tags) && thread.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2.5">
                                                {thread.tags.map(tag => (
                                                    <span key={tag} className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-400/5 px-2 py-0.5 rounded border border-indigo-400/10">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                                            <span className="flex items-center gap-1.5 font-medium text-zinc-400">
                                                <User className="w-3.5 h-3.5" />
                                                {thread.user?.name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {safeFormatDistance(thread.created_at)}
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
