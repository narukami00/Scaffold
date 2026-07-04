<?php

namespace App\Http\Controllers;

use App\Models\Label;
use App\Models\Project;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LabelController extends Controller
{
    /**
     * Store a new label for a project (Owner-only).
     */
    public function store(Request $request, Workspace $workspace, Project $project)
    {
        // Security check: Must be the workspace owner
        if ((int)$workspace->owner_id !== (int)$request->user()->id) {
            abort(403, "Only the workspace owner can manage labels.");
        }

        $validated = $request->validate([
            "name" => "required|string|max:100",
            "color" => "required|string|max:7", // Hex color e.g. #ff0000
        ]);

        $project->labels()->create($validated);

        return back()->with("success", "Label created successfully.");
    }

    /**
     * Update an existing label (Owner-only).
     */
    public function update(Request $request, Workspace $workspace, Project $project, Label $label)
    {
        // Security check: Must be the workspace owner
        if ((int)$workspace->owner_id !== (int)$request->user()->id) {
            abort(403, "Only the workspace owner can manage labels.");
        }

        if ($label->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            "name" => "required|string|max:100",
            "color" => "required|string|max:7",
        ]);

        $label->update($validated);

        // Real-time broadcast label update to sync color changes
        // Any tasks with this label will refresh on clients
        $tasks = $label->tasks()->with('labels')->get();
        foreach ($tasks as $task) {
            broadcast(new \App\Events\TaskUpdated($task))->toOthers();
        }

        return back()->with("success", "Label updated successfully.");
    }

    /**
     * Delete an existing label (Owner-only).
     */
    public function destroy(Request $request, Workspace $workspace, Project $project, Label $label)
    {
        // Security check: Must be the workspace owner
        if ((int)$workspace->owner_id !== (int)$request->user()->id) {
            abort(403, "Only the workspace owner can manage labels.");
        }

        if ($label->project_id !== $project->id) {
            abort(404);
        }

        // Keep track of tasks before deleting the label so we can broadcast updates
        $tasks = $label->tasks()->get();

        $label->delete(); // This automatically detaches from label_task pivot table on cascade

        // Broadcast updates to clients for all affected tasks
        foreach ($tasks as $task) {
            $task->load('labels');
            broadcast(new \App\Events\TaskUpdated($task))->toOthers();
        }

        return back()->with("success", "Label deleted successfully.");
    }
}
