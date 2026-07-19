<?php

namespace App\Http\Controllers;

use App\Events\ReplyMarkedDefinitive;
use App\Events\ThreadReplyCreated;
use App\Events\ThreadReplyDeleted;
use App\Events\ThreadReplyUpdated;
use App\Models\Project;
use App\Models\Thread;
use App\Models\ThreadReply;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ThreadReplyController extends Controller
{
    /**
     * Store a newly created reply.
     */
    public function store(Request $request, Workspace $workspace, Project $project, Thread $thread)
    {
        $this->ensureMember($request, $workspace);

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

    public function update(
        Request $request,
        Workspace $workspace,
        Project $project,
        Thread $thread,
        ThreadReply $reply,
    ) {
        $this->ensureMember($request, $workspace);
        abort_unless((int) $reply->thread_id === (int) $thread->id, 404);
        abort_if($reply->is_deleted, 409, 'Deleted replies cannot be edited.');
        abort_unless((int) $reply->user_id === (int) $request->user()->id, 403);

        $validated = $request->validate([
            'body' => 'required|string',
        ]);

        $reply->update([
            'body' => $validated['body'],
            'edited_at' => now(),
        ]);
        $reply->load('user', 'reactions.user');
        ThreadReplyUpdated::dispatch($reply, $project->id);

        return back();
    }

    /**
     * Mark or unmark a reply as definitive.
     */
    public function markDefinitive(Request $request, Workspace $workspace, Project $project, Thread $thread, ThreadReply $reply)
    {
        $this->ensureMember($request, $workspace);
        abort_unless((int) $reply->thread_id === (int) $thread->id, 404);
        abort_if($reply->is_deleted, 409, 'Deleted replies cannot be marked as a solution.');

        // Only workspace owner or thread author can mark definitive answers
        if ((int)$workspace->owner_id !== (int)$request->user()->id && (int)$thread->user_id !== (int)$request->user()->id) {
            abort(403);
        }

        if (!$reply->is_definitive) {
            $thread->replies()->update(['is_definitive' => false]);
            $reply->is_definitive = true;
        } else {
            $reply->is_definitive = false;
        }
        $reply->save();

        ReplyMarkedDefinitive::dispatch($reply, $project->id);

        return back();
    }

    /**
     * Delete reply.
     */
    public function destroy(Request $request, Workspace $workspace, Project $project, Thread $thread, ThreadReply $reply)
    {
        $this->ensureMember($request, $workspace);
        abort_unless((int) $reply->thread_id === (int) $thread->id, 404);

        if ($reply->user_id !== $request->user()->id && (int)$workspace->owner_id !== (int)$request->user()->id) {
            abort(403);
        }

        if (!$reply->is_deleted) {
            $reply->reactions()->delete();
            $reply->media()->delete();
            $reply->update([
                'body' => '[deleted]',
                'is_deleted' => true,
                'is_definitive' => false,
                'edited_at' => null,
            ]);
        }

        $reply->load('user', 'reactions.user');
        ThreadReplyDeleted::dispatch($reply, $project->id);

        return back();
    }

    private function ensureMember(Request $request, Workspace $workspace): void
    {
        $isOwner = (int) $workspace->owner_id === (int) $request->user()->id;
        $isMember = $workspace->members()
            ->where('users.id', $request->user()->id)
            ->exists();

        abort_unless($isOwner || $isMember, 403);
    }
}
