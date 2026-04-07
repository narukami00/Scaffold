<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\Workspace;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    /**
     * Store a new task.
     */
    public function store(
        StoreTaskRequest $request,
        Workspace $workspace,
        Project $project,
    ) {
        // Simple security: You must be the owner (for now)
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        $project->tasks()->create([
            "title" => $request->title,
            "status" => $request->status,
            "x_pos" => $request->x_pos ?? 0,
            "y_pos" => $request->y_pos ?? 0,
            "position" => $project
                ->tasks()
                ->where("status", $request->status)
                ->count(),
        ]);

        return back();
    }

    /**
     * Update a task's details or position.
     */
    public function update(
        UpdateTaskRequest $request,
        Workspace $workspace,
        Project $project,
        Task $task,
    ) {
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        // Update basic task data (including priority and assignee)
        $task->update($request->validated());

        // Guard against circular dependencies before syncing
        if ($request->has("dependencies") && !empty($request->dependencies)) {
            $cycleDepId = $this->findCyclicDependency(
                $task->id,
                $request->dependencies,
            );
            if ($cycleDepId !== null) {
                $depTitle = Task::find($cycleDepId)?->title ?? "#$cycleDepId";
                return back()->withErrors([
                    "dependencies" => "Circular dependency detected: \"{$depTitle}\" already depends on this task (directly or transitively). Linking them would create a deadlock.",
                ]);
            }
        }

        // Sync multiple dependencies if provided
        if ($request->has("dependencies")) {
            $task->dependencies()->sync($request->dependencies);
        }

        return back();
    }

    /**
     * Delete a task immediately.
     */
    public function destroy(Workspace $workspace, Project $project, Task $task)
    {
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        $task->delete();

        return back();
    }

    /**
     * Returns the first dependency ID in $proposedDepIds that would introduce
     * a cycle, or null if the proposed set is safe.
     */
    private function findCyclicDependency(
        int $taskId,
        array $proposedDepIds,
    ): ?int {
        foreach ($proposedDepIds as $depId) {
            if ($this->canReachTask((int) $depId, $taskId)) {
                return (int) $depId;
            }
        }
        return null;
    }

    /**
     * BFS through the task_dependencies table starting from $startId.
     * Returns true if $targetId is reachable by following "depends_on_id" links,
     * meaning $startId is a downstream descendant of $targetId in the graph.
     */
    private function canReachTask(int $startId, int $targetId): bool
    {
        $visited = [];
        $queue = [$startId];

        while (!empty($queue)) {
            $currentId = (int) array_shift($queue);

            if ($currentId === $targetId) {
                return true;
            }

            if (isset($visited[$currentId])) {
                continue;
            }
            $visited[$currentId] = true;

            $parentIds = DB::table("task_dependencies")
                ->where("task_id", $currentId)
                ->pluck("depends_on_id")
                ->map(fn($id) => (int) $id)
                ->toArray();

            foreach ($parentIds as $parentId) {
                if (!isset($visited[$parentId])) {
                    $queue[] = $parentId;
                }
            }
        }

        return false;
    }
}
