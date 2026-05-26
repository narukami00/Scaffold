<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel("App.Models.User.{id}", function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel("project.{projectId}", function ($user, $projectId) {
    $project = \App\Models\Project::find($projectId);
    if (!$project) {
        return false;
    }

    $workspace = $project->workspace;

    if ((int) $workspace->owner_id === (int) $user->id) {
        return [
            "id" => $user->id,
            "name" => $user->name,
            "color" => "#f59e0b",
        ];
    }

    $member = $workspace->members()->find($user->id);
    if (!$member) {
        return false;
    }

    return [
        "id" => $user->id,
        "name" => $user->name,
        "color" => $member->pivot->color ?? "#3b82f6",
    ];
});

Broadcast::channel("task.{taskId}", function ($user, $taskId) {
    // Walk task → project → workspace to validate membership
    $task = \App\Models\Task::find($taskId);
    if (!$task) {
        return false;
    }

    $workspace = $task->project->workspace;

    // Workspace owner always has access
    if ((int) $workspace->owner_id === (int) $user->id) {
        return [
            "id" => $user->id,
            "name" => $user->name,
            "color" => "#f59e0b",
            "joined_at" => now()->timestamp,
        ];
    }

    // Regular members: must exist in this workspace's members pivot
    $member = $workspace->members()->find($user->id);
    if (!$member) {
        return false;
    }

    return [
        "id" => $user->id,
        "name" => $user->name,
        "color" => $member->pivot->color ?? "#6366f1",
        "joined_at" => now()->timestamp,
    ];
});

Broadcast::channel("presence-thread.{threadId}", function ($user, $threadId) {
    // Walk thread → project → workspace to validate membership
    $thread = \App\Models\Thread::find($threadId);
    if (!$thread) {
        return false;
    }

    $workspace = $thread->project->workspace;

    // Workspace owner always has access
    if ((int) $workspace->owner_id === (int) $user->id) {
        return [
            "id" => $user->id,
            "name" => $user->name,
            "color" => "#f59e0b",
            "joined_at" => now()->timestamp,
        ];
    }

    // Regular members: must exist in this workspace's members pivot
    $member = $workspace->members()->find($user->id);
    if (!$member) {
        return false;
    }

    return [
        "id" => $user->id,
        "name" => $user->name,
        "color" => $member->pivot->color ?? "#14b8a6",
        "joined_at" => now()->timestamp,
    ];
});
