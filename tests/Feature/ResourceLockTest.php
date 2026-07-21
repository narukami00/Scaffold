<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ResourceLockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use App\Events\TaskUnlocked;
use Tests\TestCase;

class ResourceLockTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_update_is_rejected_when_locked_by_another_member(): void
    {
        [$workspace, $project, $owner, $member] = $this->workspaceWithMember();

        $task = Task::create([
            'project_id' => $project->id,
            'title' => 'Locked task',
            'status' => 'backlog',
            'priority' => 'medium',
        ]);

        app(ResourceLockService::class)->acquire('task', $task->id, $owner->id);

        $response = $this->actingAs($member)->patchJson(
            "/workspaces/{$workspace->slug}/projects/{$project->slug}/tasks/{$task->id}",
            ['title' => 'Attempted change'],
        );

        $response->assertStatus(423);
        $this->assertSame('Locked task', $task->fresh()->title);
    }

    public function test_task_lock_endpoint_rejects_conflicting_holder(): void
    {
        [$workspace, $project, $owner, $member] = $this->workspaceWithMember();

        $task = Task::create([
            'project_id' => $project->id,
            'title' => 'Shared task',
            'status' => 'backlog',
            'priority' => 'medium',
        ]);

        app(ResourceLockService::class)->acquire('task', $task->id, $owner->id);

        $response = $this->actingAs($member)->postJson(
            "/workspaces/{$workspace->slug}/projects/{$project->slug}/tasks/{$task->id}/lock",
        );

        $response->assertStatus(409);
    }

    public function test_task_unlock_does_not_broadcast_when_caller_is_not_lock_holder(): void
    {
        Event::fake([TaskUnlocked::class]);

        [$workspace, $project, $owner, $member] = $this->workspaceWithMember();

        $task = Task::create([
            'project_id' => $project->id,
            'title' => 'Shared task',
            'status' => 'backlog',
            'priority' => 'medium',
        ]);

        app(ResourceLockService::class)->acquire('task', $task->id, $owner->id);

        $this->actingAs($member)->postJson(
            "/workspaces/{$workspace->slug}/projects/{$project->slug}/tasks/{$task->id}/unlock",
        )->assertOk();

        Event::assertNotDispatched(TaskUnlocked::class);
        $this->assertSame($owner->id, app(ResourceLockService::class)->holder('task', $task->id));
    }

    public function test_wiki_update_is_rejected_when_locked_by_another_member(): void
    {
        [$workspace, $project, $owner, $member] = $this->workspaceWithMember();

        $wiki = $project->wikis()->create([
            'user_id' => $owner->id,
            'title' => 'Architecture',
            'content' => 'Original content',
        ]);

        app(ResourceLockService::class)->acquire('wiki', $wiki->id, $owner->id);

        $response = $this->actingAs($member)->patch(
            "/workspaces/{$workspace->slug}/projects/{$project->slug}/wiki/{$wiki->slug}",
            [
                'title' => 'Architecture',
                'content' => 'Changed content',
            ],
        );

        $response->assertSessionHasErrors('wiki');
        $this->assertSame('Original content', $wiki->fresh()->content);
    }

    public function test_board_includes_active_task_locks_from_server(): void
    {
        [$workspace, $project, $owner, $member] = $this->workspaceWithMember();

        $task = Task::create([
            'project_id' => $project->id,
            'title' => 'Locked task',
            'status' => 'backlog',
            'priority' => 'medium',
        ]);

        app(ResourceLockService::class)->acquire('task', $task->id, $owner->id);

        $response = $this->actingAs($member)->get(
            "/workspaces/{$workspace->slug}/projects/{$project->slug}/board",
        );

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Project/Board')
            ->where('taskLocks', [
                (string) $task->id => $owner->id,
            ]));
    }

    private function workspaceWithMember(): array
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $workspace = Workspace::create([
            'owner_id' => $owner->id,
            'name' => 'Lock Test Workspace',
        ]);

        $workspace->members()->attach($member->id, [
            'role' => 'member',
            'joined_at' => now(),
            'color' => '#3b82f6',
        ]);

        $project = Project::create([
            'workspace_id' => $workspace->id,
            'name' => 'Lock Test Project',
        ]);

        return [$workspace, $project, $owner, $member];
    }
}
