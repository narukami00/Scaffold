<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('project.{projectId}', function ($user, $projectId) {
    $project = \App\Models\Project::find($projectId);
    if (!$project) return false;

    $workspace = $project->workspace;

    if ((int) $workspace->owner_id === (int) $user->id) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'color' => '#f59e0b',
        ];
    }

    $member = $workspace->members()->find($user->id);

    if (!$member) return false;

    return [
        'id' => $user->id,
        'name' => $user->name,
        'color' => $member->pivot->color ?? '#3b82f6'
    ];
});
