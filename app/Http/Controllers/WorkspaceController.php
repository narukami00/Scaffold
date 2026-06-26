<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWorkspaceRequest;
use App\Http\Requests\UpdateWorkspaceRequest;
use App\Models\Workspace;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class WorkspaceController extends Controller
{
    /**
     * Display a listing of the user's workspaces.
     */
    public function index()
    {
        $workspaces = Workspace::whereHas('members', function ($query) {
            $query->where('users.id', Auth::id());
        })->latest()->get();

        return Inertia::render("Workspace/Index", [
            "workspaces" => $workspaces,
        ]);
    }

    /**
     * Store a newly created workspace in storage.
     */
    public function store(StoreWorkspaceRequest $request)
    {
        $workspace = Workspace::create([
            "name" => $request->name,
            "owner_id" => Auth::id(),
        ]);

        $workspace->members()->syncWithoutDetaching([
            Auth::id() => [
                "role" => "owner",
                "joined_at" => now(),
            ],
        ]);

        return redirect()->route("workspaces.index");
    }

    /**
     * Display the specified workspace.
     */
    public function show(Workspace $workspace)
    {
        // Security check: must be a member of the workspace
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403, "Unauthorized access to this workspace.");
        }

        // Load members, invitations and projects with tasks
        $workspace->load([
            "members",
            "invitations",
            "projects" => fn ($query) => $query->orderBy("name")->with("tasks"),
        ]);

        $projects = $workspace->projects;

        $statusCounts = [
            'backlog' => 0,
            'in_progress' => 0,
            'in_review' => 0,
            'done' => 0,
        ];
        
        $priorityCounts = [
            'urgent' => 0,
            'high' => 0,
            'medium' => 0,
            'low' => 0,
        ];

        $projectStats = [];
        $totalTasks = 0;

        foreach ($projects as $project) {
            $projStats = [
                'id' => $project->id,
                'name' => $project->name,
                'slug' => $project->slug,
                'backlog' => 0,
                'in_progress' => 0,
                'in_review' => 0,
                'done' => 0,
                'total' => $project->tasks->count(),
                'status' => 'New',
            ];

            foreach ($project->tasks as $task) {
                // Workspace-wide totals
                if (isset($statusCounts[$task->status])) {
                    $statusCounts[$task->status]++;
                }
                if (isset($priorityCounts[$task->priority])) {
                    $priorityCounts[$task->priority]++;
                }
                
                $totalTasks++;

                // Project-specific counts
                if (isset($projStats[$task->status])) {
                    $projStats[$task->status]++;
                }
            }

            // Determine Project Status
            if ($projStats['total'] === 0) {
                $projStats['status'] = 'New';
            } elseif ($projStats['backlog'] === $projStats['total']) {
                $projStats['status'] = 'Not Started';
            } elseif ($projStats['done'] === $projStats['total']) {
                $projStats['status'] = 'Completed';
            } else {
                $projStats['status'] = 'Ongoing';
            }

            $projectStats[] = $projStats;
        }

        $stats = [
            'total_tasks' => $totalTasks,
            'status_counts' => $statusCounts,
            'priority_counts' => $priorityCounts,
            'project_stats' => $projectStats,
        ];

        return Inertia::render("Workspace/Show", [
            "workspace" => $workspace,
            "stats" => $stats,
            "defaultTab" => request()->query("tab", "insights"),
        ]);
    }

    /**
     * Show the settings for the workspace.
     */
    public function edit(Workspace $workspace)
    {
        // Settings page is visible to all members (for identity updates)
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        return redirect()->route("workspaces.show", [
            $workspace->slug,
            "tab" => "settings",
        ]);
    }

    /**
     * Update the workspace name.
     */
    public function update(
        UpdateWorkspaceRequest $request,
        Workspace $workspace,
    ) {
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        $workspace->update([
            "name" => $request->name,
        ]);

        return redirect()->route("workspaces.show", [
            $workspace->slug,
            "tab" => "settings",
        ]);
    }

    /**
     * Delete the workspace.
     */
    public function destroy(Workspace $workspace)
    {
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        $workspace->delete();

        return redirect()->route("workspaces.index");
    }

    /**
     * Update the authenticated user's color in this workspace.
     */
    public function updateMemberColor(Request $request, Workspace $workspace)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        $request->validate([
            "color" => "required|string",
        ]);

        $workspace->members()->updateExistingPivot(Auth::id(), [
            "color" => $request->color,
        ]);

        return back();
    }
}
