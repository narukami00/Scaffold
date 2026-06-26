<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use App\Models\Wiki;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WikiTest extends TestCase
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

    public function test_workspace_member_can_create_a_wiki_page(): void
    {
        $response = $this
            ->actingAs($this->user)
            ->post(route("workspaces.projects.wiki.store", [
                "workspace" => $this->workspace->slug,
                "project" => $this->project->slug,
            ]), [
                "title" => "Developer Onboarding",
                "content" => "# Onboarding Guidelines\nWelcome to Scaffold!",
            ]);

        $wiki = Wiki::first();
        $this->assertNotNull($wiki);
        $this->assertEquals("Developer Onboarding", $wiki->title);
        $this->assertStringContainsString("Welcome to Scaffold", $wiki->content);

        $response->assertRedirect(route("workspaces.projects.wiki.show", [
            "workspace" => $this->workspace->slug,
            "project" => $this->project->slug,
            "wiki" => $wiki->slug,
        ]));
    }

    public function test_workspace_member_can_update_a_wiki_page(): void
    {
        $wiki = $this->project->wikis()->create([
            "user_id" => $this->user->id,
            "title" => "Old Title",
            "content" => "Old content",
        ]);

        $response = $this
            ->actingAs($this->user)
            ->patch(route("workspaces.projects.wiki.update", [
                "workspace" => $this->workspace->slug,
                "project" => $this->project->slug,
                "wiki" => $wiki->slug,
            ]), [
                "title" => "Updated Title",
                "content" => "New refreshed content",
            ]);

        $wiki->refresh();
        $this->assertEquals("Updated Title", $wiki->title);
        $this->assertEquals("New refreshed content", $wiki->content);

        $response->assertRedirect(route("workspaces.projects.wiki.show", [
            "workspace" => $this->workspace->slug,
            "project" => $this->project->slug,
            "wiki" => $wiki->slug,
        ]));
    }

    public function test_workspace_member_can_delete_a_wiki_page(): void
    {
        $wiki = $this->project->wikis()->create([
            "user_id" => $this->user->id,
            "title" => "Trash Page",
            "content" => "To be deleted",
        ]);

        $response = $this
            ->actingAs($this->user)
            ->delete(route("workspaces.projects.wiki.destroy", [
                "workspace" => $this->workspace->slug,
                "project" => $this->project->slug,
                "wiki" => $wiki->slug,
            ]));

        $this->assertDatabaseMissing("wikis", ["id" => $wiki->id]);
        $response->assertRedirect(route("workspaces.projects.wiki.index", [
            "workspace" => $this->workspace->slug,
            "project" => $this->project->slug,
        ]));
    }
}
