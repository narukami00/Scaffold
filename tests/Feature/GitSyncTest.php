<?php

namespace Tests\Feature;

use App\Models\Project;
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
    }

    public function test_git_webhook_resolves_task_and_creates_comment(): void
    {
        // Hit the public webhook endpoint
        $response = $this->postJson(route("workspaces.projects.git.webhook", [
            "workspace" => $this->workspace->slug,
            "project" => $this->project->slug,
        ]), [
            "hash" => "abcdef1234567890",
            "message" => "fix: auth deadlock closes #{$this->task->id}",
            "author_name" => "Rafsan Riasat",
        ]);

        $response->assertStatus(200);
        $response->assertJson(["success" => true, "processed" => true]);

        // Assert task status changed to done
        $this->task->refresh();
        $this->assertEquals("done", $this->task->status);

        // Assert comment was added to the task
        $comment = $this->task->comments()->first();
        $this->assertNotNull($comment);
        $this->assertStringContainsString("abcdef1234567890", $comment->body);
        $this->assertStringContainsString("closed via commit", $comment->body);
    }

    public function test_git_webhook_references_task_without_closing(): void
    {
        // Hit the public webhook endpoint with a simple mention (no closing keywords)
        $response = $this->postJson(route("workspaces.projects.git.webhook", [
            "workspace" => $this->workspace->slug,
            "project" => $this->project->slug,
        ]), [
            "hash" => "fedcba0987654321",
            "message" => "working on #{$this->task->id} updates",
            "author_name" => "Rafsan Riasat",
        ]);

        $response->assertStatus(200);

        // Assert task status remained backlog
        $this->task->refresh();
        $this->assertEquals("backlog", $this->task->status);

        // Assert comment was added
        $comment = $this->task->comments()->first();
        $this->assertNotNull($comment);
        $this->assertStringContainsString("fedcba0987654321", $comment->body);
        $this->assertStringNotContainsString("closed via commit", $comment->body);
    }

    public function test_duplicate_commits_are_not_processed_twice(): void
    {
        // First run
        $this->postJson(route("workspaces.projects.git.webhook", [
            "workspace" => $this->workspace->slug,
            "project" => $this->project->slug,
        ]), [
            "hash" => "abc123abc123",
            "message" => "fix #{$this->task->id}",
            "author_name" => "Rafsan Riasat",
        ]);

        // Second run with same hash and message
        $response = $this->postJson(route("workspaces.projects.git.webhook", [
            "workspace" => $this->workspace->slug,
            "project" => $this->project->slug,
        ]), [
            "hash" => "abc123abc123",
            "message" => "fix #{$this->task->id}",
            "author_name" => "Rafsan Riasat",
        ]);

        $response->assertStatus(200);
        $response->assertJson(["success" => true, "processed" => false]);

        // Assert only one comment was created
        $this->assertEquals(1, $this->task->comments()->count());
    }
}
