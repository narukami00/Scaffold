import React, { useState } from 'react';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { MessageSquare, Pin, Clock, User, PlusCircle, Check, CheckCircle2, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import ProjectHeader from '@/components/project/ProjectHeader';

// ── Palette tokens ────────────────────────────────────────────────────────────
const C = {
    bg:      "#ede0c8",
    card:    "#f3e4c9",
    navy:    "#0a2947",
    brown:   "#8b5e3c",
    sage:    "#d3d4c0",
    border:  "rgba(139,94,60,0.18)",
    muted:   "rgba(10,41,71,0.45)",
    faint:   "rgba(10,41,71,0.25)",
};

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
        <div className="space-y-6 max-w-4xl mx-auto">
            <Head title={`Threads — ${project.name}`} />

            <ProjectHeader workspace={workspace} project={project} activeTab="threads" />

            {/* Composer */}
            <div className="rounded-2xl p-5 shadow-sm transition-all"
                style={{ background: C.card, border: `1px solid ${C.border}` }}>
                {!isComposing ? (
                    <div 
                        className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                        onClick={() => setIsComposing(true)}
                    >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "rgba(139,94,60,0.12)", border: `1px solid ${C.border}` }}>
                            <PlusCircle className="w-5 h-5" style={{ color: C.brown }} />
                        </div>
                        <div className="text-sm font-semibold" style={{ color: C.muted }}>Start a new thread or announcement...</div>
                    </div>
                ) : (
                    <form onSubmit={submitThread} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: C.brown }}>
                                Thread Title
                            </label>
                            <input
                                type="text"
                                placeholder="Thread title (optional)"
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                className="w-full bg-transparent border-b pb-2 text-base font-bold outline-none transition-colors"
                                style={{ color: C.navy, borderColor: C.border }}
                                onFocus={e => e.currentTarget.style.borderColor = C.brown}
                                onBlur={e => e.currentTarget.style.borderColor = C.border}
                            />
                            {errors.title && <span className="text-xs text-red-700 mt-1 block">{errors.title}</span>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: C.brown }}>
                                Discussion Body
                            </label>
                            <MarkdownEditor 
                                value={data.body}
                                onChange={val => setData('body', val)}
                                uploadUrl={`/workspaces/${workspace.slug}/media/upload`}
                                placeholder="What's on your mind? (Markdown & Image Drop supported)"
                            />
                            {errors.body && <span className="text-xs text-red-700 block">{errors.body}</span>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: C.brown }}>
                                Tags
                            </label>
                            <input
                                type="text"
                                placeholder="Tags (comma-separated: e.g. bug, setup, auth)"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                className="w-full bg-transparent border-b pb-2 text-xs outline-none transition-colors placeholder:text-slate-400 font-medium"
                                style={{ color: C.navy, borderColor: C.border }}
                                onFocus={e => e.currentTarget.style.borderColor = C.brown}
                                onBlur={e => e.currentTarget.style.borderColor = C.border}
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => { reset(); setTagInput(''); setIsComposing(false); }}
                                className="px-4 py-2 text-sm font-semibold transition-colors"
                                style={{ color: C.muted }}
                                onMouseEnter={e => e.currentTarget.style.color = C.navy}
                                onMouseLeave={e => e.currentTarget.style.color = C.muted}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing || !data.body.trim()}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                                style={{ background: C.brown, color: "#f3e4c9" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#a06b43"}
                                onMouseLeave={e => e.currentTarget.style.background = C.brown}
                            >
                                {processing ? 'Posting...' : 'Post Thread'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Filters Section */}
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl"
                style={{ background: "rgba(139,94,60,0.06)", border: `1px solid ${C.border}` }}>
                {/* Status filter buttons */}
                <div className="flex rounded-xl p-1 border"
                    style={{ background: "rgba(243,228,201,0.5)", borderColor: C.border }}>
                    <button
                        onClick={() => handleStatusFilter('solved')}
                        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        style={{
                            background: filters.status === 'solved' ? C.brown : 'transparent',
                            color: filters.status === 'solved' ? '#f3e4c9' : C.muted
                        }}
                    >
                        Solved Only
                    </button>
                    <button
                        onClick={() => handleStatusFilter('unsolved')}
                        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        style={{
                            background: filters.status === 'unsolved' ? C.brown : 'transparent',
                            color: filters.status === 'unsolved' ? '#f3e4c9' : C.muted
                        }}
                    >
                        Unsolved Only
                    </button>
                </div>

                {/* Tag filter badges */}
                {allUniqueTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 border-l pl-4"
                        style={{ borderColor: C.border }}>
                        <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1 mr-1"
                            style={{ color: C.muted }}>
                            <Tag size={10} /> Filter:
                        </span>
                        {allUniqueTags.map(tag => {
                            const isSelected = filters.tag === tag;
                            return (
                                <button
                                    key={tag}
                                    onClick={() => handleTagFilter(tag)}
                                    className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all"
                                    style={{
                                        background: isSelected ? C.brown : "rgba(243,228,201,0.5)",
                                        color: isSelected ? '#f3e4c9' : C.muted,
                                        borderColor: isSelected ? C.brown : C.border
                                    }}
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
                    <div className="text-center py-16 px-4 border border-dashed rounded-2xl relative overflow-hidden"
                        style={{ borderColor: C.border, background: "rgba(243,228,201,0.5)" }}>
                        <MessageSquare className="w-12 h-12 mx-auto mb-4" style={{ color: C.muted }} />
                        <h3 className="font-bold text-lg" style={{ color: C.navy }}>No threads match these filters</h3>
                        <p className="text-sm mt-1" style={{ color: C.muted }}>Clear your filter queries to view all discussions.</p>
                    </div>
                ) : (
                    threads.map(thread => (
                        <Link 
                            href={`/workspaces/${workspace.slug}/projects/${project.slug}/threads/${thread.id}`} 
                            key={thread.id} 
                            className="block rounded-2xl border transition-all overflow-hidden relative group"
                            style={{ background: C.card, borderColor: C.border, boxShadow: "0 2px 10px rgba(139,94,60,0.06)" }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = "rgba(139,94,60,0.4)";
                                e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = C.border;
                                e.currentTarget.style.transform = "none";
                            }}
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1 transition-colors bg-transparent group-hover:bg-[#8b5e3c]" />
                            <div className="p-5 flex gap-4 items-start">
                                <img 
                                    src={thread.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(thread.user?.name || 'U')}&background=random`} 
                                    className="w-10 h-10 rounded-full shrink-0"
                                    style={{ background: C.brown }}
                                    alt={thread.user?.name} 
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {thread.is_pinned && (
                                            <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500/20" />
                                        )}
                                        <h3 className="font-bold truncate flex-1" style={{ color: C.navy }}>
                                            {thread.title || "Status Update"}
                                        </h3>
                                        
                                        {/* Status Badge */}
                                        {thread.is_solved && (
                                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                <CheckCircle2 size={10} />
                                                Solved
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-sm line-clamp-2 leading-relaxed text-slate-700">
                                        {thread.body}
                                    </div>

                                    {/* Display Thread Tags */}
                                    {Array.isArray(thread.tags) && thread.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2.5">
                                            {thread.tags.map(tag => (
                                                <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border"
                                                    style={{ color: C.brown, background: "rgba(139,94,60,0.06)", borderColor: C.border }}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: C.muted }}>
                                        <span className="flex items-center gap-1.5 font-semibold" style={{ color: C.navy }}>
                                            <User className="w-3.5 h-3.5" />
                                            {thread.user?.name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {safeFormatDistance(thread.created_at)}
                                        </span>
                                        <span className="flex items-center gap-1.5 ml-auto font-semibold" style={{ color: C.brown }}>
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
    );
}

ThreadIndex.layout = page => <WorkspaceLayout children={page} />;
