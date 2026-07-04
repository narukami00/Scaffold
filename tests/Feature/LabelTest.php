<?php

namespace Tests\Feature;

use App\Models\Label;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LabelTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private User $member;
    private Workspace $workspace;
    private Project $project;
    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->member = User::factory()->create();

        $this->workspace = Workspace::create([
            "name" => "Design Studio",
            "owner_id" => $this->owner->id,
        ]);

        $this->workspace->members()->attach([
            $this->owner->id => ["role" => "owner"],
            $this->member->id => ["role" => "member"],
        ]);

        $this->project = Project::create([
            "name" => "Creative Redesign",
            "workspace_id" => $this->workspace->id,
        ]);

        $this->task = Task::create([
            "project_id" => $this->project->id,
            "title" => "Wireframe Landing Page",
            "status" => "backlog",
            "position" => 0,
        ]);
    }

    public function test_workspace_owner_can_create_a_label(): void
    {
        $response = $this
            ->actingAs($this->owner)
            ->post(
                route("projects.labels.store", [$this->workspace->slug, $this->project->slug]),
                [
                    "name" => "Cozy Feature",
                    "color" => "#8b9a7c",
                ]
            );

        $response->assertRedirect();
        $this->assertDatabaseHas("labels", [
            "project_id" => $this->project->id,
            "name" => "Cozy Feature",
            "color" => "#8b9a7c",
        ]);
    }

    public function test_workspace_member_cannot_create_a_label(): void
    {
        $response = $this
            ->actingAs($this->member)
            ->post(
                route("projects.labels.store", [$this->workspace->slug, $this->project->slug]),
                [
                    "name" => "Member Label",
                    "color" => "#d9745b",
                ]
            );

        $response->assertStatus(403);
        $this->assertDatabaseMissing("labels", [
            "name" => "Member Label",
        ]);
    }

    public function test_workspace_owner_can_update_a_label(): void
    {
        $label = Label::create([
            "project_id" => $this->project->id,
            "name" => "Old Label",
            "color" => "#ffffff",
        ]);

        $response = $this
            ->actingAs($this->owner)
            ->patch(
                route("projects.labels.update", [$this->workspace->slug, $this->project->slug, $label->id]),
                [
                    "name" => "Updated Label",
                    "color" => "#c8828f",
                ]
            );

        $response->assertRedirect();
        $this->assertDatabaseHas("labels", [
            "id" => $label->id,
            "name" => "Updated Label",
            "color" => "#c8828f",
        ]);
    }

    public function test_workspace_owner_can_delete_a_label(): void
    {
        $label = Label::create([
            "project_id" => $this->project->id,
            "name" => "Delete Me",
            "color" => "#ffffff",
        ]);

        $this->task->labels()->attach($label->id);

        $response = $this
            ->actingAs($this->owner)
            ->delete(
                route("projects.labels.destroy", [$this->workspace->slug, $this->project->slug, $label->id])
            );

        $response->assertRedirect();
        $this->assertDatabaseMissing("labels", [
            "id" => $label->id,
        ]);
        $this->assertDatabaseMissing("label_task", [
            "label_id" => $label->id,
            "task_id" => $this->task->id,
        ]);
    }

    public function test_workspace_member_can_sync_labels_to_a_task(): void
    {
        $label1 = Label::create([
            "project_id" => $this->project->id,
            "name" => "Label One",
            "color" => "#ffffff",
        ]);
        $label2 = Label::create([
            "project_id" => $this->project->id,
            "name" => "Label Two",
            "color" => "#000000",
        ]);

        $response = $this
            ->actingAs($this->member)
            ->post(
                route("tasks.labels.sync", [$this->workspace->slug, $this->project->slug, $this->task->id]),
                [
                    "label_ids" => [$label1->id, $label2->id],
                ]
            );

        $response->assertOk();
        $this->assertDatabaseHas("label_task", [
            "label_id" => $label1->id,
            "task_id" => $this->task->id,
        ]);
        $this->assertDatabaseHas("label_task", [
            "label_id" => $label2->id,
            "task_id" => $this->task->id,
        ]);
    }
}
