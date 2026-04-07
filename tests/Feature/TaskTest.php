<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_workspace_owner_can_create_a_task_in_a_project(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::create([
            "name" => "Alpha Team",
            "owner_id" => $user->id,
        ]);
        $project = Project::create([
            "name" => "Launch Board",
            "workspace_id" => $workspace->id,
        ]);

        $response = $this
            ->actingAs($user)
            ->post(route("tasks.store", [$workspace->slug, $project->slug]), [
                "title" => "New Task",
                "status" => "backlog",
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas("tasks", [
            "project_id" => $project->id,
            "title" => "New Task",
            "status" => "backlog",
            "position" => 0,
        ]);
    }

    public function test_workspace_owner_can_update_task_metadata(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::create([
            "name" => "Alpha Team",
            "owner_id" => $user->id,
        ]);
        $project = Project::create([
            "name" => "Launch Board",
            "workspace_id" => $workspace->id,
        ]);
        $dependency = Task::create([
            "project_id" => $project->id,
            "title" => "Prep API",
            "status" => "backlog",
            "position" => 0,
        ]);
        $task = Task::create([
            "project_id" => $project->id,
            "title" => "Ship UI",
            "status" => "in_progress",
            "position" => 0,
        ]);

        $response = $this
            ->actingAs($user)
            ->patch(
                route("tasks.update", [$workspace->slug, $project->slug, $task->id]),
                [
                    "title" => "Ship polished UI",
                    "priority" => "urgent",
                    "due_date" => "2026-04-30",
                    "dependencies" => [$dependency->id],
                    "assignee_id" => $user->id,
                ],
            );

        $response->assertRedirect();
        $this->assertDatabaseHas("tasks", [
            "id" => $task->id,
            "title" => "Ship polished UI",
            "priority" => "urgent",
            "due_date" => "2026-04-30",
            "assignee_id" => $user->id,
        ]);
        $this->assertDatabaseHas("task_dependencies", [
            "task_id" => $task->id,
            "depends_on_id" => $dependency->id,
        ]);
    }

    public function test_workspace_owner_can_delete_a_task(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::create([
            "name" => "Alpha Team",
            "owner_id" => $user->id,
        ]);
        $project = Project::create([
            "name" => "Launch Board",
            "workspace_id" => $workspace->id,
        ]);
        $task = Task::create([
            "project_id" => $project->id,
            "title" => "Retire old flow",
            "status" => "done",
            "position" => 0,
        ]);

        $response = $this
            ->actingAs($user)
            ->delete(
                route("tasks.destroy", [$workspace->slug, $project->slug, $task->id]),
            );

        $response->assertRedirect();
        $this->assertDatabaseMissing("tasks", [
            "id" => $task->id,
        ]);
    }
}
