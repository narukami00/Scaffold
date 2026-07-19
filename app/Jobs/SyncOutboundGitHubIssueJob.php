<?php

namespace App\Jobs;

use App\Events\TaskUpdated;
use App\Helpers\Notifier;
use App\Models\GitHubIssue;
use App\Models\Notification;
use App\Models\User;
use App\Services\GitHubIssueService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncOutboundGitHubIssueJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $githubIssueId)
    {
    }

    public function handle(GitHubIssueService $issueService): void
    {
        $githubIssue = GitHubIssue::with([
            'task.assignee',
            'task.project.workspace',
            'task.project.githubRepository',
        ])->find($this->githubIssueId);

        if (!$githubIssue) {
            return;
        }

        $task = $githubIssue->task;
        if (!$task) {
            $githubIssue->delete();
            return;
        }

        $repo = $task->project->githubRepository ?? null;
        if (!$repo) {
            $githubIssue->update(['needs_sync' => false]);
            return;
        }

        $wasCreate = is_null($githubIssue->github_issue_id);

        if ($wasCreate) {
            $result = $issueService->createIssue($task);
            $success = (bool) $result;
            if ($success) {
                $githubIssue = $result->fresh();
            }
        } else {
            $success = $issueService->updateIssue($task);
            if ($success) {
                $githubIssue = $githubIssue->fresh();
            }
        }

        $task->load(['assignee', 'labels', 'dependencies', 'githubIssue', 'githubPullRequests']);
        broadcast(new TaskUpdated($task));

        if ($success && $wasCreate && $githubIssue) {
            $this->clearSyncFailedNotifications($githubIssue);
            $this->notifyIssueCreated($task, $githubIssue);
        } elseif ($success) {
            $this->clearSyncFailedNotifications($githubIssue);
        } elseif (!$success) {
            $this->notifySyncFailed($task, $githubIssue, $wasCreate);
        }
    }

    protected function clearSyncFailedNotifications(?GitHubIssue $githubIssue): void
    {
        if (!$githubIssue) {
            return;
        }

        Notification::where('type', 'github.sync.failed')
            ->where('notifiable_type', GitHubIssue::class)
            ->where('notifiable_id', $githubIssue->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    protected function notifyIssueCreated($task, GitHubIssue $githubIssue): void
    {
        $recipient = $this->primaryRecipient($task);
        if (!$recipient) {
            return;
        }

        Notifier::send($recipient, 'github.issue.created', [
            'actor_name' => 'GitHub',
            'message' => "Issue #{$githubIssue->issue_number} was created for \"{$task->title}\".",
            'link' => $githubIssue->html_url,
            'issue_number' => $githubIssue->issue_number,
            'task_id' => $task->id,
        ], $githubIssue);
    }

    protected function notifySyncFailed($task, GitHubIssue $githubIssue, bool $wasCreate): void
    {
        $workspace = $task->project->workspace ?? null;
        $owner = $workspace?->owner;
        if (!$owner instanceof User) {
            return;
        }

        $existing = Notification::where('user_id', $owner->id)
            ->where('type', 'github.sync.failed')
            ->where('notifiable_type', GitHubIssue::class)
            ->where('notifiable_id', $githubIssue->id)
            ->whereNull('read_at')
            ->exists();

        if ($existing) {
            return;
        }

        $action = $wasCreate ? 'create' : 'update';
        Notifier::send($owner, 'github.sync.failed', [
            'actor_name' => 'GitHub',
            'message' => "Failed to {$action} the GitHub issue for \"{$task->title}\". Will retry shortly.",
            'link' => null,
            'task_id' => $task->id,
        ], $githubIssue);
    }

    protected function primaryRecipient($task): ?User
    {
        if ($task->assignee instanceof User) {
            return $task->assignee;
        }

        $owner = $task->project->workspace->owner ?? null;
        return $owner instanceof User ? $owner : null;
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('SyncOutboundGitHubIssueJob failed', [
            'github_issue_id' => $this->githubIssueId,
            'message' => $exception->getMessage(),
        ]);
    }
}
