<?php

namespace App\Jobs;

use App\Events\GitHubActivityUpdated;
use App\Models\GitHubRepository;
use App\Models\GitHubIssue;
use App\Models\GitHubPullRequest;
use App\Models\GitHubBranch;
use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessGitHubWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $eventType;
    protected $payload;
    protected $deliveryId;

    public function __construct(string $eventType, array $payload, ?string $deliveryId = null)
    {
        $this->eventType = $eventType;
        $this->payload = $payload;
        $this->deliveryId = $deliveryId;
    }

    public function handle()
    {
        Log::info("Processing GitHub webhook event: {$this->eventType} (Delivery: {$this->deliveryId})");

        $repoId = $this->payload['repository']['id'] ?? null;
        if (!$repoId) {
            Log::warning("GitHub webhook payload is missing repository ID.");
            return;
        }

        $repositories = GitHubRepository::where('github_repo_id', $repoId)->get();
        if ($repositories->isEmpty()) {
            Log::info("No local project linked to GitHub repository ID: {$repoId}. Ignoring event.");
            return;
        }

        foreach ($repositories as $repository) {
            switch ($this->eventType) {
                case 'push':
                    $this->handlePush($repository);
                    break;
                case 'pull_request':
                    $this->handlePullRequest($repository);
                    break;
                case 'issues':
                    $this->handleIssues($repository);
                    break;
                case 'create':
                case 'delete':
                    $this->handleBranchEvent($repository);
                    break;
                default:
                    Log::info("Ignoring unhandled GitHub event type: {$this->eventType}");
                    continue 2;
            }

            GitHubActivityUpdated::dispatch($repository->project_id, $this->eventType);
        }
    }

    protected function handlePush(GitHubRepository $repository)
    {
        $commits = $this->payload['commits'] ?? [];
        Log::info("Processing push with " . count($commits) . " commits.");

        $ref = $this->payload['ref'] ?? '';
        if (str_starts_with($ref, 'refs/heads/')) {
            $branchName = substr($ref, strlen('refs/heads/'));
            GitHubBranch::updateOrCreate(
                ['github_repo_id' => $repository->id, 'name' => $branchName],
                ['last_commit_sha' => $this->payload['after'] ?? ''],
            );
        }

        foreach ($commits as $commit) {
            $message = $commit['message'] ?? '';
            $hash = $commit['id'] ?? '';
            $authorName = $commit['author']['name'] ?? 'Unknown';

            // Find referenced issue/task numbers
            preg_match_all('/#(\d+)/', $message, $matches);
            if (empty($matches[1])) {
                continue;
            }

            preg_match_all(
                '/(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/i',
                $message,
                $closingMatches,
            );
            $closingIssueNumbers = array_map('intval', $closingMatches[1] ?? []);

            foreach ($matches[1] as $issueNumber) {
                $isClose = in_array((int) $issueNumber, $closingIssueNumbers, true);
                // Find local task via mapped GitHub issue
                $githubIssue = GitHubIssue::where('github_repo_id', $repository->id)
                    ->where('issue_number', $issueNumber)
                    ->first();

                if ($githubIssue && $task = $githubIssue->task) {
                    $commentSignature = "`{$hash}`";
                    $exists = $task->comments()->where('body', 'like', "%{$commentSignature}%")->exists();

                    if (!$exists) {
                        $statusUpdated = false;

                        if ($isClose && $task->status !== 'done') {
                            $task->status = 'done';
                            $task->save();
                            $statusUpdated = true;

                            // Update last synced hash to prevent loop
                            $githubIssue->update([
                                'last_synced_hash' => $this->calculateContentHash($task),
                                'synced_at' => now(),
                            ]);
                        }

                        // Add comment to task
                        $commentText = "Commit `{$hash}` by **{$authorName}**:\n> {$message}";
                        if ($statusUpdated) {
                            $commentText = "⚡ **Task closed via commit** `{$hash}` by **{$authorName}**:\n> {$message}";
                        }

                        $comment = $task->comments()->create([
                            'user_id' => $repository->project->workspace->owner_id, // Default to owner
                            'body' => $commentText,
                        ]);

                        // Broadcast updates
                        broadcast(new \App\Events\CommentPosted($comment))->toOthers();
                        if ($statusUpdated) {
                            broadcast(new \App\Events\TaskUpdated($task))->toOthers();
                        }
                    }
                }
            }
        }
    }

    protected function handlePullRequest(GitHubRepository $repository)
    {
        $action = $this->payload['action'] ?? '';
        $pr = $this->payload['pull_request'] ?? [];
        $prNumber = $pr['number'] ?? null;

        if (!$prNumber || !in_array($action, [
            'opened',
            'closed',
            'reopened',
            'synchronize',
            'edited',
            'ready_for_review',
            'converted_to_draft',
        ], true)) {
            return;
        }

        $title = $pr['title'] ?? '';
        $body = $pr['body'] ?? '';
        $state = $pr['state'] ?? 'open';
        $isMerged = $pr['merged'] ?? false;
        $isDraft = $pr['draft'] ?? false;
        $htmlUrl = $pr['html_url'] ?? '';
        $headBranch = $pr['head']['ref'] ?? '';
        $baseBranch = $pr['base']['ref'] ?? '';

        // Find referenced issue number in title/body
        $existingPullRequest = GitHubPullRequest::where('github_repo_id', $repository->id)
            ->where('pr_number', $prNumber)
            ->first();
        $taskId = $existingPullRequest?->task_id;
        preg_match('/(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/i', $title . "\n" . $body, $matches);
        if (!empty($matches[1])) {
            $issueNumber = (int)$matches[1];
            $githubIssue = GitHubIssue::where('github_repo_id', $repository->id)
                ->where('issue_number', $issueNumber)
                ->first();
            if ($githubIssue) {
                $taskId = $githubIssue->task_id;
            }
        }

        // Upsert PR mapping
        $pullRequest = GitHubPullRequest::updateOrCreate(
            [
                'github_repo_id' => $repository->id,
                'pr_number' => $prNumber,
            ],
            [
                'task_id' => $taskId,
                'title' => $title,
                'state' => $isMerged ? 'merged' : $state,
                'head_branch' => $headBranch,
                'base_branch' => $baseBranch,
                'html_url' => $htmlUrl,
                'is_draft' => $isDraft,
            ]
        );

        // If PR is merged and linked to a task, close the task
        if ($isMerged && $taskId) {
            $task = Task::find($taskId);
            if ($task && $task->status !== 'done') {
                $task->status = 'done';
                $task->save();

                // Update hash to prevent loop
                $githubIssue = GitHubIssue::where('task_id', $taskId)->first();
                if ($githubIssue) {
                    $githubIssue->update([
                        'last_synced_hash' => $this->calculateContentHash($task),
                        'synced_at' => now(),
                    ]);
                }

                $comment = $task->comments()->create([
                    'user_id' => $repository->project->workspace->owner_id,
                    'body' => "🔀 **Pull Request #{$prNumber} merged**:\n> {$title}",
                ]);

                broadcast(new \App\Events\CommentPosted($comment))->toOthers();
                broadcast(new \App\Events\TaskUpdated($task))->toOthers();
            }
        }
    }

    protected function handleIssues(GitHubRepository $repository)
    {
        $action = $this->payload['action'] ?? '';
        $issue = $this->payload['issue'] ?? [];
        $issueNumber = $issue['number'] ?? null;

        if (!$issueNumber || !in_array($action, ['edited', 'closed', 'reopened'])) {
            return;
        }

        $githubIssue = GitHubIssue::where('github_repo_id', $repository->id)
            ->where('issue_number', $issueNumber)
            ->first();

        if (!$githubIssue || !$task = $githubIssue->task) {
            return; // One-directional issue creation
        }

        $title = $issue['title'] ?? '';
        $body = $issue['body'] ?? '';
        $state = $issue['state'] ?? 'open';

        // Check content hash to avoid sync loops
        $incomingHash = md5($title . $body . ($state === 'closed' ? 'closed' : 'open'));
        if ($githubIssue->last_synced_hash === $incomingHash) {
            Log::info("Ignoring echo update from GitHub issue #{$issueNumber}");
            return;
        }

        if ($action === 'edited') {
            $task->title = $title;
            // Clean markdown footer watermark from body if present
            $task->description = preg_replace('/\n\n---\n\*Synced from \[DevSpace\].*$/s', '', $body);
            $task->save();
        } elseif ($action === 'closed') {
            $task->status = 'done';
            $task->save();
        } elseif ($action === 'reopened') {
            $task->status = 'backlog';
            $task->save();
        }

        // Save new synced state hash
        $githubIssue->update([
            'last_synced_hash' => $incomingHash,
            'synced_at' => now(),
        ]);

        broadcast(new \App\Events\TaskUpdated($task))->toOthers();
    }

    protected function handleBranchEvent(GitHubRepository $repository)
    {
        $refType = $this->payload['ref_type'] ?? '';
        $ref = $this->payload['ref'] ?? '';

        if ($refType !== 'branch') {
            return;
        }

        if ($this->eventType === 'create') {
            GitHubBranch::updateOrCreate(
                [
                    'github_repo_id' => $repository->id,
                    'name' => $ref,
                ],
                [
                    // GitHub's create payload only includes the source branch
                    // name, not its SHA. The next push/API refresh fills this.
                    'last_commit_sha' => '',
                ]
            );
        } elseif ($this->eventType === 'delete') {
            GitHubBranch::where('github_repo_id', $repository->id)
                ->where('name', $ref)
                ->delete();
        }
    }

    protected function calculateContentHash(Task $task): string
    {
        return md5($task->title . $task->description . ($task->status === 'done' ? 'closed' : 'open'));
    }
}
