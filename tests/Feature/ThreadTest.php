<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Thread;
use App\Models\ThreadReply;
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

    public function test_author_can_edit_thread_and_edited_timestamp_is_recorded(): void
    {
        $thread = $this->project->threads()->create([
            "user_id" => $this->user->id,
            "title" => "Original",
            "body" => "Original body",
        ]);

        $this->actingAs($this->user)->patch(route(
            "workspaces.projects.threads.update",
            [$this->workspace->slug, $this->project->slug, $thread->id],
        ), [
            "title" => "Updated",
            "body" => "Updated body",
            "tags" => [],
        ])->assertRedirect();

        $thread->refresh();
        $this->assertSame("Updated body", $thread->body);
        $this->assertNotNull($thread->edited_at);
    }

    public function test_reply_author_can_edit_reply(): void
    {
        $thread = $this->project->threads()->create([
            "user_id" => $this->user->id,
            "title" => "Thread",
            "body" => "Body",
        ]);
        $reply = $thread->replies()->create([
            "user_id" => $this->user->id,
            "body" => "Original reply",
        ]);

        $this->actingAs($this->user)->patch(route(
            "workspaces.projects.threads.replies.update",
            [$this->workspace->slug, $this->project->slug, $thread->id, $reply->id],
        ), ["body" => "Edited reply"])->assertRedirect();

        $reply->refresh();
        $this->assertSame("Edited reply", $reply->body);
        $this->assertNotNull($reply->edited_at);
    }

    public function test_deleting_reply_creates_tombstone_and_preserves_children(): void
    {
        $thread = $this->project->threads()->create([
            "user_id" => $this->user->id,
            "title" => "Thread",
            "body" => "Body",
        ]);
        $reply = $thread->replies()->create([
            "user_id" => $this->user->id,
            "body" => "Parent reply",
        ]);
        $child = $thread->replies()->create([
            "user_id" => $this->user->id,
            "parent_id" => $reply->id,
            "body" => "Child reply",
        ]);

        $this->actingAs($this->user)->delete(route(
            "workspaces.projects.threads.replies.destroy",
            [$this->workspace->slug, $this->project->slug, $thread->id, $reply->id],
        ))->assertRedirect();

        $this->assertDatabaseHas("thread_replies", [
            "id" => $reply->id,
            "is_deleted" => true,
            "body" => "[deleted]",
        ]);
        $this->assertDatabaseHas("thread_replies", [
            "id" => $child->id,
            "parent_id" => $reply->id,
            "body" => "Child reply",
        ]);
    }
}
