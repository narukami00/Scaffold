<?php

namespace Tests\Feature;

use App\Models\GitHubInstallation;
use App\Models\GitHubIssue;
use App\Models\GitHubRepository;
use App\Models\Label;
use App\Models\Media;
use App\Models\Notification;
use App\Models\Project;
use App\Models\Reaction;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\TaskComment;
use App\Models\Thread;
use App\Models\ThreadReply;
use App\Models\User;
use App\Models\Wiki;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProjectDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_workspace_owner_can_delete_project_and_all_local_project_data(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $workspace = $this->workspaceOwnedBy($owner, 'Owner Workspace');
        $project = Project::create([
            'workspace_id' => $workspace->id,
            'name' => 'Disposable Project',
        ]);
        $otherProject = Project::create([
            'workspace_id' => $workspace->id,
            'name' => 'Keep Project',
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'title' => 'Delete me',
            'status' => 'backlog',
            'priority' => 'medium',
        ]);
        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $owner->id,
            'body' => 'Task comment',
        ]);
        $attachment = TaskAttachment::create([
            'task_id' => $task->id,
            'user_id' => $owner->id,
            'file_path' => 'attachments/project-file.txt',
            'file_name' => 'project-file.txt',
            'file_type' => 'text/plain',
            'file_size' => 4,
        ]);
        Storage::disk('public')->put($attachment->file_path, 'test');

        $thread = Thread::create([
            'project_id' => $project->id,
            'user_id' => $owner->id,
            'title' => 'Project discussion',
            'body' => 'Delete this discussion.',
        ]);
        $reply = ThreadReply::create([
            'thread_id' => $thread->id,
            'user_id' => $owner->id,
            'body' => 'Delete this reply.',
        ]);

        foreach ([
            [Task::class, $task->id],
            [TaskComment::class, $comment->id],
            [Thread::class, $thread->id],
            [ThreadReply::class, $reply->id],
        ] as [$type, $id]) {
            Reaction::create([
                'user_id' => $owner->id,
                'reactable_type' => $type,
                'reactable_id' => $id,
                'emoji' => '👍',
            ]);
        }

        $media = Media::create([
            'user_id' => $owner->id,
            'project_id' => $project->id,
            'file_path' => "workspaces/{$workspace->id}/media/project.png",
            'file_name' => 'project.png',
            'file_type' => 'image/png',
            'file_size' => 4,
        ]);
        Storage::disk('public')->put($media->file_path, 'test');

        $legacyReplyMedia = Media::create([
            'user_id' => $owner->id,
            'mediable_type' => ThreadReply::class,
            'mediable_id' => $reply->id,
            'file_path' => "workspaces/{$workspace->id}/media/legacy.png",
            'file_name' => 'legacy.png',
            'file_type' => 'image/png',
            'file_size' => 4,
        ]);
        Storage::disk('public')->put($legacyReplyMedia->file_path, 'test');

        $wiki = Wiki::create([
            'project_id' => $project->id,
            'user_id' => $owner->id,
            'title' => 'Project Wiki',
            'content' => 'Delete this wiki.',
        ]);
        $label = Label::create([
            'project_id' => $project->id,
            'name' => 'Delete label',
            'color' => '#ff0000',
        ]);

        $installation = GitHubInstallation::create([
            'workspace_id' => $workspace->id,
            'github_installation_id' => 987654,
            'account_login' => 'demo',
            'account_type' => 'User',
        ]);
        $repository = GitHubRepository::create([
            'project_id' => $project->id,
            'github_installation_id' => $installation->id,
            'github_repo_id' => 123456,
            'full_name' => 'demo/project',
            'default_branch' => 'main',
            'html_url' => 'https://github.com/demo/project',
        ]);
        $issue = GitHubIssue::create([
            'task_id' => $task->id,
            'github_repo_id' => $repository->id,
            'github_issue_id' => 111,
            'issue_number' => 1,
            'html_url' => 'https://github.com/demo/project/issues/1',
        ]);

        Notification::create([
            'user_id' => $owner->id,
            'type' => 'github.issue.created',
            'notifiable_type' => GitHubIssue::class,
            'notifiable_id' => $issue->id,
            'data' => ['message' => 'Created'],
        ]);
        Notification::create([
            'user_id' => $owner->id,
            'type' => 'github.task.closed_by_commit',
            'notifiable_type' => Task::class,
            'notifiable_id' => $task->id,
            'data' => ['message' => 'Closed'],
        ]);

        $response = $this
            ->actingAs($owner)
            ->delete(route('workspaces.projects.destroy', [
                $workspace->slug,
                $project->slug,
            ]));

        $response->assertRedirect(route('workspaces.show', $workspace->slug));

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseHas('projects', ['id' => $otherProject->id]);
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
        $this->assertDatabaseMissing('task_comments', ['id' => $comment->id]);
        $this->assertDatabaseMissing('task_attachments', ['id' => $attachment->id]);
        $this->assertDatabaseMissing('threads', ['id' => $thread->id]);
        $this->assertDatabaseMissing('thread_replies', ['id' => $reply->id]);
        $this->assertDatabaseMissing('media', ['id' => $media->id]);
        $this->assertDatabaseMissing('media', ['id' => $legacyReplyMedia->id]);
        $this->assertDatabaseMissing('wikis', ['id' => $wiki->id]);
        $this->assertDatabaseMissing('labels', ['id' => $label->id]);
        $this->assertDatabaseMissing('github_repositories', ['id' => $repository->id]);
        $this->assertDatabaseMissing('github_issues', ['id' => $issue->id]);
        $this->assertDatabaseMissing('notifications', [
            'notifiable_type' => GitHubIssue::class,
            'notifiable_id' => $issue->id,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'notifiable_type' => Task::class,
            'notifiable_id' => $task->id,
        ]);
        $this->assertDatabaseCount('reactions', 0);
        $this->assertDatabaseHas('github_installations', ['id' => $installation->id]);
        Storage::disk('public')->assertMissing($attachment->file_path);
        Storage::disk('public')->assertMissing($media->file_path);
        Storage::disk('public')->assertMissing($legacyReplyMedia->file_path);
    }

    public function test_workspace_member_cannot_delete_project(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $workspace = $this->workspaceOwnedBy($owner, 'Shared Workspace');
        $workspace->members()->attach($member->id, ['role' => 'member']);
        $project = Project::create([
            'workspace_id' => $workspace->id,
            'name' => 'Protected Project',
        ]);

        $this->actingAs($member)
            ->delete(route('workspaces.projects.destroy', [
                $workspace->slug,
                $project->slug,
            ]))
            ->assertForbidden();

        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    public function test_project_cannot_be_deleted_through_another_workspace(): void
    {
        $owner = User::factory()->create();
        $workspaceA = $this->workspaceOwnedBy($owner, 'Workspace A');
        $workspaceB = $this->workspaceOwnedBy($owner, 'Workspace B');
        $project = Project::create([
            'workspace_id' => $workspaceB->id,
            'name' => 'Wrong Workspace Project',
        ]);

        $this->actingAs($owner)
            ->delete(route('workspaces.projects.destroy', [
                $workspaceA->slug,
                $project->slug,
            ]))
            ->assertNotFound();

        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    public function test_authenticated_outsider_cannot_delete_project(): void
    {
        $owner = User::factory()->create();
        $outsider = User::factory()->create();
        $workspace = $this->workspaceOwnedBy($owner, 'Owner Only Workspace');
        $project = Project::create([
            'workspace_id' => $workspace->id,
            'name' => 'Owner Only Project',
        ]);

        $this->actingAs($outsider)
            ->delete(route('workspaces.projects.destroy', [
                $workspace->slug,
                $project->slug,
            ]))
            ->assertForbidden();

        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    public function test_guest_cannot_delete_project(): void
    {
        $owner = User::factory()->create();
        $workspace = $this->workspaceOwnedBy($owner, 'Private Workspace');
        $project = Project::create([
            'workspace_id' => $workspace->id,
            'name' => 'Private Project',
        ]);

        $this->delete(route('workspaces.projects.destroy', [
            $workspace->slug,
            $project->slug,
        ]))->assertRedirect(route('login'));

        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    private function workspaceOwnedBy(User $owner, string $name): Workspace
    {
        $workspace = Workspace::create([
            'name' => $name,
            'owner_id' => $owner->id,
        ]);
        $workspace->members()->attach($owner->id, ['role' => 'owner']);

        return $workspace;
    }
}
