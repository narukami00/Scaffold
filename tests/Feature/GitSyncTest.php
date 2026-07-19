<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\GitHubInstallation;
use App\Models\GitHubIssue;
use App\Models\GitHubRepository;
use App\Jobs\ProcessGitHubWebhookJob;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GitSyncTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $workspace;
    protected $project;
    protected $task;
    protected $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->workspace = Workspace::create([
            "name" => "Workspace",
            "owner_id" => $this->user->id,
        ]);
        $this->workspace->members()->attach($this->user->id);

        $this->project = $this->workspace->projects()->create([
            "name" => "Git Project",
        ]);

        $this->task = $this->project->tasks()->create([
            "title" => "Implement Auth",
            "status" => "backlog",
            "priority" => "high",
        ]);

        $installation = GitHubInstallation::create([
            "workspace_id" => $this->workspace->id,
            "github_installation_id" => "123456",
            "account_login" => "devspace-org",
            "account_type" => "Organization",
        ]);

        $this->repository = GitHubRepository::create([
            "project_id" => $this->project->id,
            "github_installation_id" => $installation->id,
            "github_repo_id" => 999111,
            "full_name" => "devspace-org/laravel-app",
            "default_branch" => "main",
            "html_url" => "https://github.com/devspace-org/laravel-app",
        ]);

        GitHubIssue::create([
            "task_id" => $this->task->id,
            "github_repo_id" => $this->repository->id,
            "github_issue_id" => 88888,
            "issue_number" => 88,
            "html_url" => "https://github.com/devspace-org/laravel-app/issues/88",
        ]);
    }

    public function test_push_webhook_resolves_mapped_task_and_creates_comment(): void
    {
        $this->processPush("abcdef1234567890", "fix: auth deadlock closes #88");

        $this->task->refresh();
        $this->assertEquals("done", $this->task->status);

        $comment = $this->task->comments()->first();
        $this->assertNotNull($comment);
        $this->assertStringContainsString("abcdef1234567890", $comment->body);
        $this->assertStringContainsString("closed via commit", $comment->body);
    }

    public function test_push_webhook_references_task_without_closing(): void
    {
        $this->processPush("fedcba0987654321", "working on #88 updates");

        $this->task->refresh();
        $this->assertEquals("backlog", $this->task->status);

        $comment = $this->task->comments()->first();
        $this->assertNotNull($comment);
        $this->assertStringContainsString("fedcba0987654321", $comment->body);
        $this->assertStringNotContainsString("closed via commit", $comment->body);
    }

    public function test_duplicate_commits_are_not_processed_twice(): void
    {
        $this->processPush("abc123abc123", "fixes #88");
        $this->processPush("abc123abc123", "fixes #88");

        $this->assertEquals(1, $this->task->comments()->count());
    }

    public function test_push_updates_branch_head_sha(): void
    {
        $this->processPush("branchsha123", "routine maintenance", "feature/activity");

        $this->assertDatabaseHas("github_branches", [
            "github_repo_id" => $this->repository->id,
            "name" => "feature/activity",
            "last_commit_sha" => "branchsha123",
        ]);
    }

    private function processPush(string $hash, string $message, string $branch = "main"): void
    {
        $job = new ProcessGitHubWebhookJob("push", [
            "repository" => ["id" => 999111],
            "ref" => "refs/heads/{$branch}",
            "after" => $hash,
            "commits" => [[
                "id" => $hash,
                "message" => $message,
                "author" => ["name" => "Rafsan Riasat"],
            ]],
        ], "delivery-{$hash}");

        $job->handle();
    }
}
