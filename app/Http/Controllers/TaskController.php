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
                        "attachments",
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

        $task->load(["assignee", "labels", "dependencies", "attachments.user"]);
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
                ->with(["assignee", "labels", "dependencies", "attachments.user"])
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
}
