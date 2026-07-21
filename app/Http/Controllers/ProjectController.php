<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Models\Project;
use App\Models\Workspace;
use App\Services\ProjectDeletionService;
use App\Services\ResourceLockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use RuntimeException;

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
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        if ($project->workspace_id !== $workspace->id) {
            abort(404);
        }

        // Load project tasks and workspace members
        $workspace->loadMissing(["owner", "members", "githubInstallations"]);

        $project->load([
            "labels",
            "tasks.assignee",
            "tasks.dependencies",
            "githubRepository",
        ]);

        $tasks = $project->tasks;
        $allMembers = collect([$workspace->owner])
            ->merge($workspace->members)
            ->filter()
            ->unique("id");

        // 1. Task counts by status
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

        // 2. Member stats: tasks assigned to each member
        $activeMembers = [];
        $inactiveMembers = [];

        // Track stats for each workspace member
        $memberData = [];
        foreach ($allMembers as $member) {
            $wsMember = $workspace->members->firstWhere('id', $member->id);
            $memberColor = $wsMember?->pivot?->color ?? $member->pivot?->color ?? '#3b82f6';
            $memberData[$member->id] = [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'color' => $memberColor,
                'avatar_path' => $member->avatar_path,
                'tasks' => [],
                'status_breakdown' => [
                    'backlog' => 0,
                    'in_progress' => 0,
                    'in_review' => 0,
                    'done' => 0,
                ],
            ];
        }

        // Handle tasks assigned to no one
        $unassignedData = [
            'id' => null,
            'name' => 'Unassigned',
            'email' => '',
            'color' => '#6b7280',
            'tasks' => [],
            'status_breakdown' => [
                'backlog' => 0,
                'in_progress' => 0,
                'in_review' => 0,
                'done' => 0,
            ],
        ];

        $overdueTasks = [];
        $dueSoonTasks = [];
        $now = now()->startOfDay();

        // Checklist statistics
        $totalChecklistItems = 0;
        $completedChecklistItems = 0;

        foreach ($tasks as $task) {
            // Count status & priority
            if (isset($statusCounts[$task->status])) {
                $statusCounts[$task->status]++;
            }
            if (isset($priorityCounts[$task->priority])) {
                $priorityCounts[$task->priority]++;
            }

            // Checklist aggregation
            if (is_array($task->checklist) && count($task->checklist) > 0) {
                foreach ($task->checklist as $item) {
                    $totalChecklistItems++;
                    if (!empty($item['completed'])) {
                        $completedChecklistItems++;
                    }
                }
            }

            $taskData = [
                'id' => $task->id,
                'title' => $task->title,
                'status' => $task->status,
                'priority' => $task->priority,
                'due_date' => $task->due_date ? $task->due_date->format('Y-m-d') : null,
            ];

            // Assignee workload
            if ($task->assignee_id) {
                if (isset($memberData[$task->assignee_id])) {
                    $memberData[$task->assignee_id]['tasks'][] = $taskData;
                    if (isset($memberData[$task->assignee_id]['status_breakdown'][$task->status])) {
                        $memberData[$task->assignee_id]['status_breakdown'][$task->status]++;
                    }
                }
            } else {
                $unassignedData['tasks'][] = $taskData;
                if (isset($unassignedData['status_breakdown'][$task->status])) {
                    $unassignedData['status_breakdown'][$task->status]++;
                }
            }

            // Overdue and Due soon checks
            if ($task->status !== 'done' && $task->due_date) {
                $dueDate = $task->due_date->startOfDay();
                if ($dueDate->lt($now)) {
                    $overdueTasks[] = $taskData;
                } elseif ($dueDate->diffInDays($now) <= 3) {
                    $dueSoonTasks[] = $taskData;
                }
            }
        }

        // Categorize active vs inactive members
        foreach ($memberData as $mId => $mData) {
            if (count($mData['tasks']) > 0) {
                $activeMembers[] = $mData;
            } else {
                $inactiveMembers[] = $mData;
            }
        }

        // Sort active members by number of tasks
        usort($activeMembers, function($a, $b) {
            return count($b['tasks']) - count($a['tasks']);
        });

        // Add unassigned to active members if it has tasks
        if (count($unassignedData['tasks']) > 0) {
            $activeMembers[] = $unassignedData;
        }

        $stats = [
            'total_tasks' => $tasks->count(),
            'status_counts' => $statusCounts,
            'priority_counts' => $priorityCounts,
            'active_members' => $activeMembers,
            'inactive_members' => $inactiveMembers,
            'overdue_tasks' => array_slice($overdueTasks, 0, 5),
            'due_soon_tasks' => array_slice($dueSoonTasks, 0, 5),
            'checklist' => [
                'total' => $totalChecklistItems,
                'completed' => $completedChecklistItems,
            ],
        ];

        return Inertia::render("Project/Show", [
            "workspace" => $workspace,
            "project" => $project,
            "stats" => $stats,
        ]);
    }

    /**
     * The Kanban Board tab.
     */
    /**
     * The Kanban Board tab.
     */
    public function board(
        Workspace $workspace,
        Project $project,
        ResourceLockService $locks,
    ) {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        // Load everything the board needs for editing and optimistic updates.
        $workspace->loadMissing(["owner", "members", "githubInstallations"]);
        $project->load([
            "workspace",
            "labels",
            "wikis",
            "tasks.assignee",
            "tasks.dependencies",
            "tasks.labels",
            "tasks.comments.user",
            "tasks.githubIssue",
            "tasks.githubPullRequests",
            "githubRepository",
        ]);

        $members = collect([$workspace->owner])
            ->merge($workspace->members)
            ->filter()
            ->unique("id")
            ->values()
            ->map(function ($member) use ($workspace) {
                $wsMember = $workspace->members->firstWhere('id', $member->id);
                return [
                    "id" => $member->id,
                    "name" => $member->name,
                    "email" => $member->email,
                    "color" => $wsMember?->pivot?->color ?? $member->pivot?->color ?? '#3b82f6',
                ];
            });

        $taskLocks = $locks->holdersFor(
            'task',
            $project->tasks->pluck('id')->all(),
        );

        return Inertia::render("Project/Board", [
            "workspace" => $workspace,
            "project" => $project,
            "members" => $members,
            "taskLocks" => $taskLocks,
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

    /**
     * Permanently delete a project and all of its tasks.
     */
    public function destroy(
        Request $request,
        Workspace $workspace,
        Project $project,
        ProjectDeletionService $deletionService,
    )
    {
        abort_unless(
            (int) $workspace->owner_id === (int) $request->user()->id,
            403,
        );

        abort_unless(
            (int) $project->workspace_id === (int) $workspace->id,
            404,
        );

        try {
            $deletionService->delete($project);
        } catch (RuntimeException $exception) {
            return back()->withErrors([
                'delete_project' => $exception->getMessage(),
            ]);
        }

        return redirect()
            ->route("workspaces.show", $workspace->slug)
            ->with("success", "Project deleted permanently.");
    }

    /**
     * Update project details (rename).
     */
    public function update(Request $request, Workspace $workspace, Project $project)
    {
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        if ($project->workspace_id !== $workspace->id) {
            abort(404);
        }

        $validated = $request->validate([
            "name" => "required|string|max:255",
        ]);

        $project->update([
            "name" => $validated["name"],
        ]);

        return back();
    }

    /**
     * Get settings configuration data (labels and githubRepository).
     */
    public function settingsData(Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        if ($project->workspace_id !== $workspace->id) {
            abort(404);
        }

        $project->load(['labels', 'githubRepository.installation']);
        $workspace->load('githubInstallations');

        return response()->json([
            'labels' => $project->labels,
            'github_repository' => $project->githubRepository,
            'github_installations' => $workspace->githubInstallations,
        ]);
    }
}
