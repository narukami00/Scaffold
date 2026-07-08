<?php

namespace App\Console\Commands;

use App\Models\GitHubIssue;
use App\Services\GitHubIssueService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncOutboundGitHubIssues extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'github:sync-outbound';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync pending local task updates to GitHub Issues';

    /**
     * Execute the console command.
     */
    public function handle(GitHubIssueService $issueService)
    {
        $this->info("Starting outbound GitHub Issues synchronization...");

        $pending = GitHubIssue::where('needs_sync', true)->with('task.project.githubRepository')->get();

        if ($pending->isEmpty()) {
            $this->info("No pending issue updates found.");
            return 0;
        }

        $this->info("Found {$pending->count()} pending updates to process.");
        $successCount = 0;
        $failedCount = 0;

        foreach ($pending as $githubIssue) {
            $task = $githubIssue->task;

            if (!$task) {
                $this->warn("Orphaned GitHubIssue mapping found (Task ID: {$githubIssue->task_id}). Deleting mapping.");
                $githubIssue->delete();
                continue;
            }

            $repo = $task->project->githubRepository ?? null;
            if (!$repo) {
                $this->warn("Project for task #{$task->id} does not have a linked GitHub repository. Skipping.");
                $githubIssue->update(['needs_sync' => false]);
                continue;
            }

            if (is_null($githubIssue->github_issue_id)) {
                $this->info("Creating GitHub issue for task #{$task->id}...");
                $result = $issueService->createIssue($task);
                if ($result) {
                    $successCount++;
                } else {
                    $failedCount++;
                }
            } else {
                $this->info("Updating GitHub issue #{$githubIssue->issue_number} for task #{$task->id}...");
                $result = $issueService->updateIssue($task);
                if ($result) {
                    $successCount++;
                } else {
                    $failedCount++;
                }
            }
        }

        $this->info("Outbound sync completed. Success: {$successCount}, Failed: {$failedCount}");
        return 0;
    }
}
