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
