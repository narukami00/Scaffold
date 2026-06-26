<?php

namespace App\Http\Controllers;

use App\Events\ThreadCreated;
use App\Models\Project;
use App\Models\Thread;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ThreadController extends Controller
{
    /**
     * Display a listing of the project's threads.
     */
    public function index(Request $request, Workspace $workspace, Project $project)
    {
        $query = $project->threads()
            ->with(['user'])
            ->withCount('replies')
            ->withExists(['replies as is_solved' => function ($q) {
                $q->where('is_definitive', true);
            }]);

        // Tag Filtering (tags is cast to array in Thread model)
        if ($request->filled('tag')) {
            $query->whereJsonContains('tags', $request->tag);
        }

        // Status Filtering (Solved vs Unsolved based on is_definitive reply check)
        if ($request->filled('status')) {
            if ($request->status === 'solved') {
                $query->whereHas('replies', function ($q) {
                    $q->where('is_definitive', true);
                });
            } elseif ($request->status === 'unsolved') {
                $query->whereDoesntHave('replies', function ($q) {
                    $q->where('is_definitive', true);
                });
            }
        }

        $threads = $query->orderBy('is_pinned', 'desc')
            ->latest()
            ->get();

        return Inertia::render('Project/Threads/Index', [
            'workspace' => $workspace,
            'project' => $project,
            'threads' => $threads,
            'filters' => $request->only(['tag', 'status']),
        ]);
    }

    /**
     * Store a newly created thread.
     */
    public function store(Request $request, Workspace $workspace, Project $project)
    {
        $request->validate([
            'title' => 'nullable|string|max:255',
            'body' => 'required|string',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:30',
        ]);

        $thread = $project->threads()->create([
            'user_id' => $request->user()->id,
            'title' => $request->title,
            'body' => $request->body,
            'tags' => $request->tags ?? [],
        ]);

        $thread->load('user');

        ThreadCreated::dispatch($thread);

        return redirect()->route('workspaces.projects.threads.show', [$workspace->slug, $project->slug, $thread->id]);
    }

    /**
     * Display the specified thread.
     */
    public function show(Workspace $workspace, Project $project, Thread $thread)
    {
        $thread->load([
            'user',
            'reactions.user',
            'replies.user',
            'replies.reactions.user',
        ]);

        return Inertia::render('Project/Threads/Show', [
            'workspace' => $workspace,
            'project' => $project,
            'thread' => $thread,
        ]);
    }

    /**
     * Update the specified thread.
     */
    public function update(Request $request, Workspace $workspace, Project $project, Thread $thread)
    {
        if ($thread->user_id !== $request->user()->id) {
            abort(403);
        }

        $request->validate([
            'title' => 'nullable|string|max:255',
            'body' => 'required|string',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:30',
        ]);

        $thread->update([
            'title' => $request->title,
            'body' => $request->body,
            'tags' => $request->tags ?? [],
        ]);

        return back();
    }

    /**
     * Remove the specified thread.
     */
    public function destroy(Request $request, Workspace $workspace, Project $project, Thread $thread)
    {
        // Only author or workspace owner can delete
        if ($thread->user_id !== $request->user()->id && (int)$workspace->owner_id !== (int)$request->user()->id) {
            abort(403);
        }

        $thread->delete();

        return redirect()->route('workspaces.projects.threads.index', [$workspace->slug, $project->slug]);
    }

    /**
     * Toggle pin status.
     */
    public function pin(Request $request, Workspace $workspace, Project $project, Thread $thread)
    {
        // Only workspace owner can pin
        if ((int)$workspace->owner_id !== (int)$request->user()->id) {
            abort(403);
        }

        $thread->update([
            'is_pinned' => !$thread->is_pinned,
        ]);

        return back();
    }
}
