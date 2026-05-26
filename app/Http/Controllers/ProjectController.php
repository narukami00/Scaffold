<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Models\Project;
use App\Models\Workspace;
use Illuminate\Http\Request;
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
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        if ($project->workspace_id !== $workspace->id) {
            abort(404);
        }

        // Load project tasks and workspace members
        $project->load([
            "workspace.members",
            "tasks.assignee",
            "tasks.dependencies",
        ]);

        $tasks = $project->tasks;
        $members = $project->workspace->members;

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
        foreach ($members as $member) {
            $memberColor = $member->pivot?->color ?? '#3b82f6';
            $memberData[$member->id] = [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'color' => $memberColor,
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

    /**
     * Permanently delete a project and all of its tasks.
     */
    public function destroy(Workspace $workspace, Project $project)
    {
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        if ($project->workspace_id !== $workspace->id) {
            abort(404);
        }

        $project->delete();

        return redirect()->route("workspaces.show", $workspace->slug);
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
}
