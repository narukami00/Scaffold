<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Wiki;
use App\Models\Workspace;
use App\Events\WikiCreated;
use App\Events\WikiUpdated;
use App\Events\WikiDeleted;
use App\Events\WikiLocked;
use App\Events\WikiUnlocked;
use App\Services\ResourceLockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class WikiController extends Controller
{
    /**
     * Display a listing of the project's wiki pages.
     */
    public function index(Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        $workspace->loadMissing(['owner', 'members']);

        $wikis = $project->wikis()->orderBy('title')->get();
        $firstWiki = $wikis->first();

        // If a wiki page exists, redirect to show it, otherwise render empty index view
        if ($firstWiki) {
            return redirect()->route('workspaces.projects.wiki.show', [
                'workspace' => $workspace->slug,
                'project' => $project->slug,
                'wiki' => $firstWiki->slug,
            ]);
        }

        return Inertia::render('Project/Wiki/Index', [
            'workspace' => $workspace,
            'project' => $project,
            'wikis' => $wikis,
            'currentWiki' => null,
        ]);
    }

    /**
     * Show a specific wiki page.
     */
    public function show(Workspace $workspace, Project $project, Wiki $wiki)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        if ($wiki->project_id !== $project->id) {
            abort(404);
        }

        $workspace->loadMissing(['owner', 'members']);

        $wikis = $project->wikis()->orderBy('title')->get();

        return Inertia::render('Project/Wiki/Index', [
            'workspace' => $workspace,
            'project' => $project,
            'wikis' => $wikis,
            'currentWiki' => $wiki,
        ]);
    }

    /**
     * Show the form for creating a new wiki page.
     */
    public function create(Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        return Inertia::render('Project/Wiki/CreateEdit', [
            'workspace' => $workspace,
            'project' => $project,
            'wiki' => null,
            'isEdit' => false,
        ]);
    }

    /**
     * Store a newly created wiki page in database.
     */
    public function store(Request $request, Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
        ]);

        $wiki = $project->wikis()->create([
            'user_id' => Auth::id(),
            'title' => $validated['title'],
            'content' => $validated['content'],
        ]);

        broadcast(new WikiCreated($wiki))->toOthers();

        return redirect()->route('workspaces.projects.wiki.show', [
            'workspace' => $workspace->slug,
            'project' => $project->slug,
            'wiki' => $wiki->slug,
        ]);
    }

    /**
     * Show the form for editing the specified wiki page.
     */
    public function edit(Workspace $workspace, Project $project, Wiki $wiki)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        if ($wiki->project_id !== $project->id) {
            abort(404);
        }

        $workspace->loadMissing(['owner', 'members']);

        return Inertia::render('Project/Wiki/CreateEdit', [
            'workspace' => $workspace,
            'project' => $project,
            'wiki' => $wiki,
            'isEdit' => true,
        ]);
    }

    /**
     * Update the specified wiki page in database.
     */
    public function update(
        Request $request,
        Workspace $workspace,
        Project $project,
        Wiki $wiki,
        ResourceLockService $locks,
    ) {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        if ($wiki->project_id !== $project->id) {
            abort(404);
        }

        if ($locks->isLockedByOther('wiki', $wiki->id, (int) Auth::id())) {
            return back()->withErrors([
                'wiki' => 'This wiki page is being edited by another member.',
            ]);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
        ]);

        // If the title changed, we also regenerate the slug manually
        $wiki->update([
            'title' => $validated['title'],
            'content' => $validated['content'],
        ]);

        broadcast(new WikiUpdated($wiki->fresh()))->toOthers();

        return redirect()->route('workspaces.projects.wiki.show', [
            'workspace' => $workspace->slug,
            'project' => $project->slug,
            'wiki' => $wiki->slug,
        ]);
    }

    /**
     * Remove the specified wiki page from database.
     */
    public function lock(
        Workspace $workspace,
        Project $project,
        Wiki $wiki,
        ResourceLockService $locks,
    ) {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        if ((int) $wiki->project_id !== (int) $project->id) {
            abort(404);
        }

        $userId = (int) Auth::id();

        if (!$locks->acquire('wiki', $wiki->id, $userId)) {
            $holder = $locks->holder('wiki', $wiki->id);

            return response()->json([
                'message' => 'This wiki page is locked by another member.',
                'userId' => $holder,
            ], 409);
        }

        broadcast(new WikiLocked($wiki->id, $project->id, $userId));

        return response()->json(['success' => true]);
    }

    public function unlock(
        Workspace $workspace,
        Project $project,
        Wiki $wiki,
        ResourceLockService $locks,
    ) {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        if ((int) $wiki->project_id !== (int) $project->id) {
            abort(404);
        }

        if ($locks->release('wiki', $wiki->id, (int) Auth::id())) {
            broadcast(new WikiUnlocked($wiki->id, $project->id));
        }

        return response()->json(['success' => true]);
    }

    public function destroy(
        Workspace $workspace,
        Project $project,
        Wiki $wiki,
        ResourceLockService $locks,
    ) {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        if ($wiki->project_id !== $project->id) {
            abort(404);
        }

        if ($locks->isLockedByOther('wiki', $wiki->id, (int) Auth::id())) {
            return back()->withErrors([
                'wiki' => 'This wiki page is being edited by another member.',
            ]);
        }

        $locks->forceRelease('wiki', $wiki->id);

        $wikiId = $wiki->id;
        $slug = $wiki->slug;
        $wiki->delete();

        broadcast(new WikiDeleted($wikiId, $project->id, $slug))->toOthers();

        return redirect()->route('workspaces.projects.wiki.index', [
            'workspace' => $workspace->slug,
            'project' => $project->slug,
        ]);
    }
}
