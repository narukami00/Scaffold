<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Thread;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThreadTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $workspace;
    protected $project;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->workspace = Workspace::create([
            "name" => "Dev Workspace",
            "owner_id" => $this->user->id,
        ]);
        $this->workspace->members()->attach($this->user->id);

        $this->project = $this->workspace->projects()->create([
            "name" => "Test Project",
        ]);
    }

    public function test_workspace_member_can_view_thread_index(): void
    {
        $thread = $this->project->threads()->create([
            "user_id" => $this->user->id,
            "title" => "Thread 1",
            "body" => "Thread body text here.",
            "tags" => ["dev", "setup"],
        ]);

        $response = $this
            ->actingAs($this->user)
            ->get(route("workspaces.projects.threads.index", [
                "workspace" => $this->workspace->slug,
                "project" => $this->project->slug,
            ]));

        $response->assertStatus(200);
    }

    public function test_workspace_member_can_create_a_thread(): void
    {
        $response = $this
            ->actingAs($this->user)
            ->post(route("workspaces.projects.threads.store", [
                "workspace" => $this->workspace->slug,
                "project" => $this->project->slug,
            ]), [
                "title" => "New Discussion",
                "body" => "Detailed text body.",
                "tags" => ["frontend", "css"],
            ]);

        $thread = Thread::first();
        $this->assertNotNull($thread);
        $this->assertEquals("New Discussion", $thread->title);
        
        $response->assertRedirect(route("workspaces.projects.threads.show", [
            "workspace" => $this->workspace->slug,
            "project" => $this->project->slug,
            "thread" => $thread->id,
        ]));
    }

    public function test_workspace_member_can_view_thread_show(): void
    {
        $thread = $this->project->threads()->create([
            "user_id" => $this->user->id,
            "title" => "Thread 1",
            "body" => "Thread body text here.",
        ]);

        $response = $this
            ->actingAs($this->user)
            ->get(route("workspaces.projects.threads.show", [
                "workspace" => $this->workspace->slug,
                "project" => $this->project->slug,
                "thread" => $thread->id,
            ]));

        $response->assertStatus(200);
    }

    public function test_reacting_toggles_and_replaces_old_reaction(): void
    {
        $thread = $this->project->threads()->create([
            "user_id" => $this->user->id,
            "title" => "Thread 1",
            "body" => "Thread body text here.",
        ]);

        // 1. Add reaction 👍
        $this->actingAs($this->user)
            ->post(route("workspaces.projects.reactions.toggle", [
                "workspace" => $this->workspace->slug,
                "project" => $this->project->slug,
            ]), [
                "reactable_type" => "App\\Models\\Thread",
                "reactable_id" => $thread->id,
                "emoji" => "👍",
            ]);

        $this->assertDatabaseHas("reactions", [
            "user_id" => $this->user->id,
            "reactable_type" => "App\\Models\\Thread",
            "reactable_id" => $thread->id,
            "emoji" => "👍",
        ]);

        // 2. Change reaction to 🚀 (replaces 👍)
        $this->actingAs($this->user)
            ->post(route("workspaces.projects.reactions.toggle", [
                "workspace" => $this->workspace->slug,
                "project" => $this->project->slug,
            ]), [
                "reactable_type" => "App\\Models\\Thread",
                "reactable_id" => $thread->id,
                "emoji" => "🚀",
            ]);

        $this->assertDatabaseMissing("reactions", [
            "user_id" => $this->user->id,
            "reactable_type" => "App\\Models\\Thread",
            "reactable_id" => $thread->id,
            "emoji" => "👍",
        ]);

        $this->assertDatabaseHas("reactions", [
            "user_id" => $this->user->id,
            "reactable_type" => "App\\Models\\Thread",
            "reactable_id" => $thread->id,
            "emoji" => "🚀",
        ]);

        // 3. Remove reaction 🚀 by reacting with 🚀 again (toggle off)
        $this->actingAs($this->user)
            ->post(route("workspaces.projects.reactions.toggle", [
                "workspace" => $this->workspace->slug,
                "project" => $this->project->slug,
            ]), [
                "reactable_type" => "App\\Models\\Thread",
                "reactable_id" => $thread->id,
                "emoji" => "🚀",
            ]);

        $this->assertDatabaseMissing("reactions", [
            "user_id" => $this->user->id,
            "reactable_type" => "App\\Models\\Thread",
            "reactable_id" => $thread->id,
        ]);
    }
}
