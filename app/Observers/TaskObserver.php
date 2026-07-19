<?php

namespace App\Observers;

use App\Jobs\SyncOutboundGitHubIssueJob;
use App\Models\GitHubIssue;
use App\Models\Task;

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

                // Immediate outbound sync for pending updates / first create
                SyncOutboundGitHubIssueJob::dispatch($githubIssue->id);
            }
        } else {
            // On creation, check request parameter
            if (request()->input('sync_to_github')) {
                $githubIssue = GitHubIssue::create([
                    'task_id' => $task->id,
                    'github_repo_id' => $repo->id,
                    'needs_sync' => true,
                    'needs_sync_since' => now(),
                ]);

                SyncOutboundGitHubIssueJob::dispatch($githubIssue->id);
            }
        }
    }
}
