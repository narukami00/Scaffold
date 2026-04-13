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

        $existing = Reaction::where('user_id', $userId)
            ->where('reactable_type', $modelClass)
            ->where('reactable_id', $request->reactable_id)
            ->where('emoji', $request->emoji)
            ->first();

        if ($existing) {
            $existing->delete();
            ReactionToggled::dispatch($existing, 'removed', $project->id);
        } else {
            $reaction = Reaction::create([
                'user_id' => $userId,
                'reactable_type' => $modelClass,
                'reactable_id' => $request->reactable_id,
                'emoji' => $request->emoji,
            ]);
            $reaction->load('user');
            ReactionToggled::dispatch($reaction, 'added', $project->id);
        }

        return back();
    }
}
