<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\Workspace;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Events\TaskUpdated;
use App\Events\TaskDeleted;
use App\Events\TaskLocked;
use App\Events\TaskUnlocked;

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
        if (!$workspace->members()->where("users.id", Auth::id())->exists()) {
            abort(403);
        }

        $task = $project->tasks()->create([
            "title" => $request->title,
            "status" => $request->status,
            "x_pos" => $request->x_pos ?? 0,
            "y_pos" => $request->y_pos ?? 0,
            "position" => $project
                ->tasks()
                ->where("status", $request->status)
                ->count(),
        ]);

        broadcast(new TaskUpdated($task))->toOthers();

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(
                [
                    "task" => $task->load([
                        "assignee",
                        "labels",
                        "dependencies",
                    ]),
                ],
                201,
            );
        }

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
        if (!$workspace->members()->where("users.id", Auth::id())->exists()) {
            abort(403);
        }

        // Gating validation: cannot change status to done if unresolved dependencies exist
        if ($request->status === 'done') {
            $depIds = $request->has('dependencies') ? $request->dependencies : $task->dependencies()->pluck('tasks.id')->toArray();
            $hasUnresolved = Task::whereIn('id', $depIds)->where('status', '!=', 'done')->exists();
            if ($hasUnresolved) {
                if ($request->expectsJson() || $request->ajax()) {
                    return response()->json([
                        'errors' => [
                            'status' => ['Cannot set task to Done because it has unresolved dependencies.']
                        ]
                    ], 422);
                }
                return back()->withErrors([
                    'status' => 'Cannot set task to Done because it has unresolved dependencies.'
                ]);
            }
        }

        $oldStatus = $task->status;

        $task->update($request->validated());

        if ($request->has("dependencies")) {
            // Guard against circular dependencies
            if (!empty($request->dependencies)) {
                $cycleDepId = $this->findCyclicDependency(
                    $task->id,
                    $request->dependencies,
                );
                if ($cycleDepId !== null) {
                    $depTitle =
                        Task::find($cycleDepId)?->title ?? "#$cycleDepId";
                    if ($request->expectsJson() || $request->ajax()) {
                        return response()->json(
                            [
                                "errors" => [
                                    "dependencies" => [
                                        "Circular dependency detected: \"{$depTitle}\" already depends on this task.",
                                    ],
                                ],
                            ],
                            422,
                        );
                    }
                    return back()->withErrors([
                        "dependencies" => "Circular dependency detected: \"{$depTitle}\" already depends on this task.",
                    ]);
                }
            }
            $task->dependencies()->sync($request->dependencies);
        }

        if ($request->has("labels")) {
            $task->labels()->sync($request->labels ?? []);
        }

        // Post-update cascade checks
        $newStatus = $task->status;

        // If status was changed from done to something else
        if ($oldStatus === 'done' && $newStatus !== 'done') {
            $this->cascadeDependencyRevert($task);
        }

        // Also check if task is now done but has unresolved dependencies (due to new dependency additions)
        if ($task->status === 'done') {
            $hasUnresolvedDeps = $task->dependencies()->where('status', '!=', 'done')->exists();
            if ($hasUnresolvedDeps) {
                $task->update(['status' => 'backlog']);
                $this->cascadeDependencyRevert($task);
            }
        }

        $task->load(["assignee", "labels", "dependencies"]);
        broadcast(new TaskUpdated($task))->toOthers();

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                "task" => $task,
            ]);
        }

        return back();
    }

    /**
     * Transfer edit control to another user.
     */
    public function transferControl(
        Request $request,
        Workspace $workspace,
        Project $project,
        Task $task,
    ) {
        if (!$workspace->members()->where("users.id", Auth::id())->exists()) {
            abort(403);
        }

        $request->validate([
            "newEditorId" => "required|exists:users,id",
        ]);

        broadcast(
            new \App\Events\TaskControlTransferred(
                $task,
                $request->newEditorId,
            ),
        )->toOthers();

        return response()->json(["success" => true]);
    }

    /**
     * Lock a task while a user is dragging it on the board/flow.
     */
    public function lock(Workspace $workspace, Project $project, Task $task)
    {
        if (!$workspace->members()->where("users.id", Auth::id())->exists()) {
            abort(403);
        }

        if ((int) $task->project_id !== (int) $project->id) {
            abort(404);
        }

        broadcast(new TaskLocked($task->id, $project->id, Auth::id()))->toOthers();

        return response()->json(["success" => true]);
    }

    /**
     * Unlock a task after drag ends.
     */
    public function unlock(Workspace $workspace, Project $project, Task $task)
    {
        if (!$workspace->members()->where("users.id", Auth::id())->exists()) {
            abort(403);
        }

        if ((int) $task->project_id !== (int) $project->id) {
            abort(404);
        }

        broadcast(new TaskUnlocked($task->id, $project->id))->toOthers();

        return response()->json(["success" => true]);
    }

    /**
     * Delete a task immediately.
     */
    public function destroy(Workspace $workspace, Project $project, Task $task)
    {
        if (!$workspace->members()->where("users.id", Auth::id())->exists()) {
            abort(403);
        }

        $taskId = $task->id;
        $projectId = $project->id;

        $dependentTaskIds = DB::table("task_dependencies")
            ->where("depends_on_id", $taskId)
            ->pluck("task_id");

        $task->delete();

        broadcast(new TaskDeleted($taskId, $projectId))->toOthers();

        if ($dependentTaskIds->isNotEmpty()) {
            $affectedTasks = Task::query()
                ->whereIn("id", $dependentTaskIds)
                ->with(["assignee", "labels", "dependencies"])
                ->get();

            foreach ($affectedTasks as $affected) {
                broadcast(new TaskUpdated($affected))->toOthers();
            }
        }

        if (request()->expectsJson() || request()->ajax()) {
            return response()->json([
                "taskId" => $taskId,
                "projectId" => $projectId,
            ]);
        }

        return back();
    }

    /**
     * Cycle detection logic...
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

    /**
     * Sync task labels (Workspace members can attach/detach).
     */
    public function syncLabels(Request $request, Workspace $workspace, Project $project, Task $task)
    {
        if (!$workspace->members()->where("users.id", Auth::id())->exists()) {
            abort(403);
        }

        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $request->validate([
            "label_ids" => "present|array",
            "label_ids.*" => "integer|exists:labels,id",
        ]);

        $task->labels()->sync($request->label_ids);

        // Load the labels on the task for the client
        $task->load(["assignee", "labels", "dependencies"]);

        // Broadcast TaskUpdated event so it reflects in real-time on all clients
        broadcast(new \App\Events\TaskUpdated($task))->toOthers();

        return response()->json([
            "success" => true,
            "task" => $task,
        ]);
    }

    /**
     * Recursively revert child tasks to backlog if their parent dependency is undone.
     */
    protected function cascadeDependencyRevert(Task $task)
    {
        // Find tasks that directly depend on this task and are done
        $childTasks = Task::whereHas('dependencies', function ($query) use ($task) {
            $query->where('depends_on_id', $task->id);
        })->where('status', 'done')->get();

        foreach ($childTasks as $childTask) {
            $childTask->update(['status' => 'backlog']);
            
            // Broadcast TaskUpdated event for each reverted child task
            $childTask->load(["assignee", "labels", "dependencies"]);
            broadcast(new \App\Events\TaskUpdated($childTask))->toOthers();

            // Recursively revert child's own child tasks
            $this->cascadeDependencyRevert($childTask);
        }
    }
}
