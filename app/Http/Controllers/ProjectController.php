<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Models\Project;
use App\Models\Workspace;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProjectController extends Controller
{
    /**
     * Store a new project inside a workspace.
     */
    public function store(StoreProjectRequest $request, Workspace $workspace)
    {
        // Security check: must be a member of the workspace
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        $workspace->projects()->create($request->validated());

        return back(); // Go back to the dashboard where we created it
    }

    /**
     * Display the project (Redirects to the Board tab by default).
     */
    public function show(Workspace $workspace, Project $project)
    {
        return redirect()->route("projects.board", [
            $workspace->slug,
            $project->slug,
        ]);
    }

    /**
     * The Kanban Board tab.
     */
    /**
     * The Kanban Board tab.
     */
    public function board(Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        // Load everything the board needs for editing and optimistic updates.
        $workspace->loadMissing(["owner", "members"]);
        $project->load([
            "workspace",
            "tasks.assignee",
            "tasks.dependencies",
            "tasks.labels",
            "tasks.comments.user",
        ]);

        $members = collect([$workspace->owner])
            ->merge($workspace->members)
            ->filter()
            ->unique("id")
            ->values()
            ->map(fn ($member) => [
                "id" => $member->id,
                "name" => $member->name,
                "email" => $member->email,
                "color" => $member->pivot?->color ?? '#3b82f6',
            ]);

        return Inertia::render("Project/Board", [
            "workspace" => $workspace,
            "project" => $project,
            "members" => $members,
        ]);
    }

    /**
     * The Documents tab.
     */
    public function docs(Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        return Inertia::render("Project/Docs", [
            "workspace" => $workspace,
            "project" => $project,
        ]);
    }

    /**
     * The Activity tab.
     */
    public function activity(Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        return Inertia::render("Project/Activity", [
            "workspace" => $workspace,
            "project" => $project,
        ]);
    }
}
