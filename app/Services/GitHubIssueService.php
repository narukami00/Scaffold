<?php

namespace App\Services;

use App\Models\Task;
use App\Models\GitHubIssue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GitHubIssueService
{
    protected $tokenService;

    public function __construct(GitHubTokenService $tokenService)
    {
        $this->tokenService = $tokenService;
    }

    /**
     * Create an issue on GitHub for a local task.
     */
    public function createIssue(Task $task): ?GitHubIssue
    {
        $repo = $task->project->githubRepository;
        if (!$repo) {
            return null;
        }

        try {
            $token = $this->tokenService->getInstallationToken($repo->installation->github_installation_id);

            $watermark = "\n\n---\n*Synced from [DevSpace]({$repo->html_url}) · Task #{$task->id}*";
            $response = Http::withHeaders([
                'Authorization' => "token {$token}",
                'Accept' => 'application/vnd.github+json',
                'X-GitHub-Api-Version' => '2022-11-28',
                'User-Agent' => 'DevSpace-App',
            ])->post("https://api.github.com/repos/{$repo->full_name}/issues", [
                'title' => $task->title,
                'body' => ($task->description ?? '') . $watermark,
            ]);

            if ($response->failed()) {
                Log::error("Failed to create GitHub issue for task #{$task->id}: " . $response->body());
                return null;
            }

            $data = $response->json();
            
            $incomingHash = $this->calculateContentHash($task);

            return GitHubIssue::updateOrCreate(
                ['task_id' => $task->id],
                [
                    'github_repo_id' => $repo->id,
                    'github_issue_id' => $data['id'],
                    'issue_number' => $data['number'],
                    'html_url' => $data['html_url'],
                    'last_synced_hash' => $incomingHash,
                    'needs_sync' => false,
                    'synced_at' => now(),
                ]
            );

        } catch (\Exception $e) {
            Log::error("Exception in createIssue for task #{$task->id}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Update an existing issue on GitHub to match the local task.
     */
    public function updateIssue(Task $task): bool
    {
        $repo = $task->project->githubRepository;
        $githubIssue = $task->githubIssue;

        if (!$repo || !$githubIssue || !$githubIssue->issue_number) {
            return false;
        }

        try {
            $token = $this->tokenService->getInstallationToken($repo->installation->github_installation_id);

            $watermark = "\n\n---\n*Synced from [DevSpace]({$repo->html_url}) · Task #{$task->id}*";
            $state = ($task->status === 'done') ? 'closed' : 'open';

            $response = Http::withHeaders([
                'Authorization' => "token {$token}",
                'Accept' => 'application/vnd.github+json',
                'X-GitHub-Api-Version' => '2022-11-28',
                'User-Agent' => 'DevSpace-App',
            ])->patch("https://api.github.com/repos/{$repo->full_name}/issues/{$githubIssue->issue_number}", [
                'title' => $task->title,
                'body' => ($task->description ?? '') . $watermark,
                'state' => $state,
            ]);

            if ($response->failed()) {
                Log::error("Failed to update GitHub issue #{$githubIssue->issue_number} for task #{$task->id}: " . $response->body());
                return false;
            }

            $githubIssue->update([
                'last_synced_hash' => $this->calculateContentHash($task),
                'needs_sync' => false,
                'synced_at' => now(),
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error("Exception in updateIssue for task #{$task->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Compute content hash for echo detection and dirty checking.
     */
    public function calculateContentHash(Task $task): string
    {
        return md5($task->title . $task->description . ($task->status === 'done' ? 'closed' : 'open'));
    }
}
