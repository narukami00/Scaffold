<?php

namespace App\Http\Controllers;

use App\Events\ReactionToggled;
use App\Models\Project;
use App\Models\Reaction;
use App\Models\Workspace;
use Illuminate\Http\Request;

class ReactionController extends Controller
{
    /**
     * Toggle a reaction on a model.
     */
    public function toggle(Request $request, Workspace $workspace, Project $project)
    {
        $isOwner = (int) $workspace->owner_id === (int) $request->user()->id;
        $isMember = $workspace->members()
            ->where('users.id', $request->user()->id)
            ->exists();
        abort_unless($isOwner || $isMember, 403);

        $request->validate([
            'reactable_type' => 'required|string',
            'reactable_id' => 'required|integer',
            'emoji' => 'required|string|max:10',
        ]);

        $userId = $request->user()->id;

        // Resolve model mapping cleanly to avoid arbitrary class instantiations
        $allowedModels = ['Thread', 'ThreadReply', 'TaskComment', 'Task'];
        $baseName = class_basename($request->reactable_type);

        if (!in_array($baseName, $allowedModels)) {
            abort(400, 'Invalid reactable type');
        }

        $modelClass = "App\\Models\\" . $baseName;

        if (!class_exists($modelClass)) {
            abort(400, 'Invalid reactable type');
        }

        $reactable = $modelClass::findOrFail($request->reactable_id);
        $reactableProjectId = match ($baseName) {
            'Thread' => $reactable->project_id,
            'ThreadReply' => $reactable->thread?->project_id,
            'Task' => $reactable->project_id,
            'TaskComment' => $reactable->task?->project_id,
        };
        abort_unless((int) $reactableProjectId === (int) $project->id, 404);
        if ($baseName === 'ThreadReply') {
            abort_if($reactable->is_deleted, 409, 'Deleted replies cannot receive reactions.');
        }

        $userReaction = Reaction::where('user_id', $userId)
            ->where('reactable_type', $modelClass)
            ->where('reactable_id', $request->reactable_id)
            ->first();

        if ($userReaction) {
            if ($userReaction->emoji === $request->emoji) {
                $oldReaction = clone $userReaction;
                $userReaction->delete();
                broadcast(new \App\Events\ReactionToggled($oldReaction, 'removed', $project->id))->toOthers();
            } else {
                $oldReaction = clone $userReaction;
                $userReaction->delete();
                broadcast(new \App\Events\ReactionToggled($oldReaction, 'removed', $project->id))->toOthers();

                $reaction = Reaction::create([
                    'user_id' => $userId,
                    'reactable_type' => $modelClass,
                    'reactable_id' => $request->reactable_id,
                    'emoji' => $request->emoji,
                ]);
                $reaction->load('user');
                broadcast(new \App\Events\ReactionToggled($reaction, 'added', $project->id))->toOthers();
            }
        } else {
            $reaction = Reaction::create([
                'user_id' => $userId,
                'reactable_type' => $modelClass,
                'reactable_id' => $request->reactable_id,
                'emoji' => $request->emoji,
            ]);
            $reaction->load('user');
            broadcast(new \App\Events\ReactionToggled($reaction, 'added', $project->id))->toOthers();
        }

        return back();
    }
}
