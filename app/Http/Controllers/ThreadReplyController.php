<?php

namespace App\Http\Controllers;

use App\Events\ReplyMarkedDefinitive;
use App\Events\ThreadReplyCreated;
use App\Models\Project;
use App\Models\Thread;
use App\Models\ThreadReply;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ThreadReplyController extends Controller
{
    /**
     * Store a newly created reply.
     */
    public function store(Request $request, Workspace $workspace, Project $project, Thread $thread)
    {
        $request->validate([
            'body' => 'required|string',
            'parent_id' => [
                'nullable',
                Rule::exists('thread_replies', 'id')->where(function ($query) use ($thread) {
                    $query->where('thread_id', $thread->id);
                }),
            ],
        ]);

        $reply = $thread->replies()->create([
            'user_id' => $request->user()->id,
            'parent_id' => $request->parent_id,
            'body' => $request->body,
        ]);

        $reply->load('user', 'reactions.user');

        ThreadReplyCreated::dispatch($reply, $project->id);

        // TODO: Notifier::send(...) logic here for @mentions or task author

        return back();
    }

    /**
     * Mark or unmark a reply as definitive.
     */
    public function markDefinitive(Request $request, Workspace $workspace, Project $project, Thread $thread, ThreadReply $reply)
    {
        // Only workspace owner or thread author can mark definitive answers
        if ((int)$workspace->owner_id !== (int)$request->user()->id && (int)$thread->user_id !== (int)$request->user()->id) {
            abort(403);
        }

        DB::transaction(function () use ($thread, $reply) {
            if (!$reply->is_definitive) {
                $thread->replies()->update(['is_definitive' => false]);
                $reply->is_definitive = true;
            } else {
                $reply->is_definitive = false;
            }

            $reply->save();
        });

        ReplyMarkedDefinitive::dispatch($reply, $project->id);

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

        // Deleting a reply triggers the booted() event on ThreadReply which
        // automatically cascade deletes children, reactions, and media.
        $reply->delete();

        return back();
    }
}
