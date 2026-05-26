<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TaskAttachmentController extends Controller
{
    /**
     * Store a new attachment.
     */
    public function store(Request $request, Workspace $workspace, Project $project, Task $task)
    {
        // Security: Ensure user belongs to the workspace
        if (!$request->user()->workspaces()->where("workspaces.id", $workspace->id)->exists()) {
            abort(403);
        }

        $request->validate([
            "file" => "required|image|max:10240", // 10MB max
        ]);

        $file = $request->file("file");
        $path = $file->store("tasks/" . $task->id, "public");

        $attachment = $task->attachments()->create([
            "user_id" => $request->user()->id,
            "file_path" => $path,
            "file_name" => $file->getClientOriginalName(),
            "file_type" => $file->getClientMimeType(),
            "file_size" => $file->getSize(),
        ]);

        return response()->json([
            "attachment" => $attachment->load("user"),
            "url" => asset("storage/" . $path),
        ]);
    }

    /**
     * Remove an attachment.
     */
    public function destroy(Request $request, Workspace $workspace, Project $project, Task $task, TaskAttachment $attachment)
    {
        // Security check
        if (!$request->user()->workspaces()->where("workspaces.id", $workspace->id)->exists()) {
            abort(403);
        }

        // Only owner of attachment or workspace owner can delete
        if ($attachment->user_id !== $request->user()->id && $workspace->owner_id !== $request->user()->id) {
            abort(403);
        }

        Storage::disk("public")->delete($attachment->file_path);
        $attachment->delete();

        return response()->json(["success" => true]);
    }
}
