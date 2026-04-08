<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Events\CommentPosted;

class TaskCommentController extends Controller
{
    /**
     * Store a new comment.
     */
    public function store(Request $request, Task $task)
    {
        // Security check: Must be a member of the workspace that owns this task
        if (!$task->project->workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        $request->validate([
            'body' => 'required|string',
        ]);

        $comment = $task->comments()->create([
            'user_id' => Auth::id(),
            'body' => $request->body,
        ]);

        // Load the author for the broadcast
        $comment->load('user');

        // Broadcast to all team members
        broadcast(new CommentPosted($comment))->toOthers();

        return back();
    }
}
