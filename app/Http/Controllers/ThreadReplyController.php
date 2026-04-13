<?php

namespace App\Http\Controllers;

use App\Events\ReplyMarkedDefinitive;
use App\Events\ThreadReplyCreated;
use App\Models\Project;
use App\Models\Thread;
use App\Models\ThreadReply;
use App\Models\Workspace;
use Illuminate\Http\Request;

class ThreadReplyController extends Controller
{
    /**
     * Store a newly created reply.
     */
    public function store(Request $request, Workspace $workspace, Project $project, Thread $thread)
    {
        $request->validate([
            'body' => 'required|string',
            'parent_id' => 'nullable|exists:thread_replies,id',
        ]);

        $reply = $thread->replies()->create([
            'user_id' => request()->user()->id,
            'parent_id' => $request->parent_id,
            'body' => $request->body,
        ]);

        $reply->load('user', 'reactions.user');

        ThreadReplyCreated::dispatch($reply);

        // TODO: Notifier::send(...) logic here for @mentions or task author

        return back();
    }

    /**
     * Mark or unmark a reply as definitive.
     */
    public function markDefinitive(Request $request, Workspace $workspace, Project $project, Thread $thread, ThreadReply $reply)
    {
        // Only workspace owner can mark definitive answers
        if ((int)$workspace->owner_id !== (int)$request->user()->id) {
            abort(403);
        }

        // If making this definitive, we might want to un-definitive other replies, or allow multiple.
        // Stack overflow allows only 1 accepted answer per thread, let's enforce that.
        if (!$reply->is_definitive) {
            $thread->replies()->update(['is_definitive' => false]);
            $reply->is_definitive = true;
        } else {
            $reply->is_definitive = false;
        }

        $reply->save();

        ReplyMarkedDefinitive::dispatch($reply);

        return back();
    }

    /**
     * Delete reply.
     */
    public function destroy(Request $request, Workspace $workspace, Project $project, Thread $thread, ThreadReply $reply)
    {
        if ($reply->user_id !== $request->user()->id && (int)$workspace->owner_id !== (int)$request->user()->id) {
            abort(403);
        }

        // Deleting a reply deletes its children automatically via Eloquent event (if defined) or cascading standard DB depending on setup.
        // We removed cascade from DB, so manual cascading in model.
        // For now, since it is standard delete, we will manually recursively delete or just delete this single record.
        // Recursive Delete hack:
        $this->deleteRecursive($reply);

        return back();
    }

    private function deleteRecursive($reply) {
        foreach($reply->children as $child) {
            $this->deleteRecursive($child);
        }
        $reply->delete();
    }
}
