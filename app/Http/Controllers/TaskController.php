<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\Workspace;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use Illuminate\Support\Facades\Auth;

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

        $task->update($request->validated());

        return back();
    }
}
