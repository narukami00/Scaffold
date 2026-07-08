<?php

namespace App\Observers;

use App\Models\Task;
use App\Models\GitHubIssue;

class TaskObserver
{
    public function saved(Task $task)
    {
        $repo = $task->project->githubRepository;
        if (!$repo) {
            return;
        }

        $githubIssue = $task->githubIssue;

        if ($githubIssue) {
            // Check if content actually changed from last sync to avoid unnecessary flags
            $currentHash = md5($task->title . $task->description . ($task->status === 'done' ? 'closed' : 'open'));
            if ($githubIssue->last_synced_hash !== $currentHash) {
                $githubIssue->update([
                    'needs_sync' => true,
                    'needs_sync_since' => $githubIssue->needs_sync_since ?? now(),
                ]);
            }
        } else {
            // On creation, check request parameter
            if (request()->input('sync_to_github')) {
                GitHubIssue::create([
                    'task_id' => $task->id,
                    'github_repo_id' => $repo->id,
                    'needs_sync' => true,
                    'needs_sync_since' => now(),
                ]);
            }
        }
    }
}
