<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Models\GitHubInstallation;
use App\Models\GitHubRepository;
use App\Models\GitHubIssue;
use App\Models\GitHubBranch;
use App\Models\GitHubPullRequest;
use App\Services\GitHubTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use App\Jobs\ProcessGitHubWebhookJob;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GitHubIntegrationTest extends TestCase
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
            "name" => "Workspace Alpha",
            "owner_id" => $this->user->id,
        ]);
        $this->workspace->members()->attach($this->user->id);

        $this->project = $this->workspace->projects()->create([
            "name" => "Project Beta",
        ]);

        $this->task = $this->project->tasks()->create([
            "title" => "Implement Auth Flow",
            "status" => "backlog",
            "priority" => "high",
        ]);

        // Mock GitHubTokenService
        $tokenServiceMock = \Mockery::mock(GitHubTokenService::class);
        $tokenServiceMock->shouldReceive('getInstallationToken')
            ->andReturn('mocked-github-access-token');
        $tokenServiceMock->shouldReceive('generateAppJwt')
            ->andReturn('mocked-jwt-token');
        $this->app->instance(GitHubTokenService::class, $tokenServiceMock);
    }

    public function test_github_app_installation_callback_redirects_with_success(): void
    {
        $this->actingAs($this->user);

        // Fake GitHub app details endpoint call
        Http::fake([
            'https://api.github.com/app/installations/123456' => Http::response([
                'id' => 123456,
                'account' => [
                    'login' => 'devspace-org',
                    'type' => 'Organization',
                    'avatar_url' => 'https://avatars.githubusercontent.com/u/123456?v=4',
                ]
            ], 200)
        ]);

        // Call the installation callback endpoint
        $response = $this->get(route('github.callback', [
            'installation_id' => '123456',
            'setup_action' => 'install',
            'state' => $this->workspace->slug,
        ]));

        $response->assertRedirect('/workspaces/' . $this->workspace->slug . '?tab=integrations');

        $this->assertDatabaseHas('github_installations', [
            'workspace_id' => $this->workspace->id,
            'github_installation_id' => '123456',
            'account_login' => 'devspace-org',
            'account_type' => 'Organization',
        ]);
    }

    public function test_list_repositories_returns_repositories_from_api(): void
    {
        $this->actingAs($this->user);

        // Add a mock installation
        $installation = GitHubInstallation::create([
            'workspace_id' => $this->workspace->id,
            'github_installation_id' => '123456',
            'account_login' => 'devspace-org',
            'account_type' => 'Organization',
        ]);

        Http::fake([
            'https://api.github.com/installation/repositories' => Http::response([
                'repositories' => [
                    [
                        'id' => 999111,
                        'name' => 'laravel-app',
                        'full_name' => 'devspace-org/laravel-app',
                        'private' => true,
                        'html_url' => 'https://github.com/devspace-org/laravel-app',
                        'default_branch' => 'main',
                    ]
                ]
            ], 200)
        ]);

        $response = $this->getJson("/workspaces/{$this->workspace->slug}/github/repositories");

        $response->assertStatus(200);
        $response->assertJsonFragment([
            'full_name' => 'devspace-org/laravel-app',
            'github_repo_id' => 999111,
        ]);
    }

    public function test_link_and_unlink_project_repository(): void
    {
        $this->actingAs($this->user);

        $installation = GitHubInstallation::create([
            'workspace_id' => $this->workspace->id,
            'github_installation_id' => '123456',
            'account_login' => 'devspace-org',
            'account_type' => 'Organization',
        ]);

        // Link repository
        $response = $this->postJson("/workspaces/{$this->workspace->slug}/projects/{$this->project->slug}/github/link", [
            'github_repo_id' => 999111,
            'github_installation_id' => $installation->id,
            'full_name' => 'devspace-org/laravel-app',
            'default_branch' => 'main',
            'html_url' => 'https://github.com/devspace-org/laravel-app',
        ]);

        $response->assertRedirect();
        
        $this->assertDatabaseHas('github_repositories', [
            'project_id' => $this->project->id,
            'github_repo_id' => '999111',
            'full_name' => 'devspace-org/laravel-app',
        ]);

        // Unlink repository
        $response = $this->postJson("/workspaces/{$this->workspace->slug}/projects/{$this->project->slug}/github/unlink");

        $response->assertRedirect();

        $this->assertDatabaseMissing('github_repositories', [
            'project_id' => $this->project->id,
        ]);
    }

    public function test_project_cannot_link_installation_from_another_workspace(): void
    {
        $otherOwner = User::factory()->create();
        $otherWorkspace = Workspace::create([
            'name' => 'Other Workspace',
            'owner_id' => $otherOwner->id,
        ]);
        $otherWorkspace->members()->attach($otherOwner->id);
        $foreignInstallation = GitHubInstallation::create([
            'workspace_id' => $otherWorkspace->id,
            'github_installation_id' => '654321',
            'account_login' => 'other-org',
            'account_type' => 'Organization',
        ]);

        $this->actingAs($this->user)->postJson(
            "/workspaces/{$this->workspace->slug}/projects/{$this->project->slug}/github/link",
            [
                'github_repo_id' => 999111,
                'github_installation_id' => $foreignInstallation->id,
                'full_name' => 'other-org/private-repo',
                'default_branch' => 'main',
                'html_url' => 'https://github.com/other-org/private-repo',
            ],
        )->assertUnprocessable();

        $this->assertDatabaseMissing('github_repositories', [
            'project_id' => $this->project->id,
        ]);
    }

    public function test_webhook_receives_payload_verifies_signature_and_dispatches_job(): void
    {
        Queue::fake();

        config(['services.github.webhook_secret' => 'webhook-sec-123']);

        $payload = [
            'action' => 'opened',
            'issue' => [
                'id' => 777,
                'number' => 42,
                'title' => 'Broken Login',
                'body' => 'Fix ASAP',
                'state' => 'open',
            ]
        ];

        $signature = 'sha256=' . hash_hmac('sha256', json_encode($payload), 'webhook-sec-123');

        $response = $this->withHeaders([
            'X-Hub-Signature-256' => $signature,
            'X-GitHub-Event' => 'issues',
            'X-GitHub-Delivery' => 'test-delivery-id-uuid-1',
        ])->postJson('/webhooks/github', $payload);

        $response->assertStatus(200);
        
        $this->assertDatabaseHas('github_webhook_deliveries', [
            'delivery_id' => 'test-delivery-id-uuid-1',
        ]);

        Queue::assertPushed(ProcessGitHubWebhookJob::class);
    }

    public function test_webhook_rejects_missing_github_headers(): void
    {
        config(['services.github.webhook_secret' => null]);

        $this->postJson('/webhooks/github', ['repository' => ['id' => 999111]])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Required GitHub webhook headers are missing.');
    }

    public function test_sync_outbound_command_syncs_modified_tasks(): void
    {
        $installation = GitHubInstallation::create([
            'workspace_id' => $this->workspace->id,
            'github_installation_id' => '123456',
            'account_login' => 'devspace-org',
            'account_type' => 'Organization',
        ]);

        $repo = GitHubRepository::create([
            'project_id' => $this->project->id,
            'github_installation_id' => $installation->id,
            'github_repo_id' => 999111,
            'full_name' => 'devspace-org/laravel-app',
            'default_branch' => 'main',
            'html_url' => 'https://github.com/devspace-org/laravel-app',
        ]);

        $githubIssue = GitHubIssue::create([
            'task_id' => $this->task->id,
            'github_repo_id' => $repo->id,
            'needs_sync' => true,
            'needs_sync_since' => now(),
        ]);

        Http::fake([
            'https://api.github.com/repos/devspace-org/laravel-app/issues' => Http::response([
                'id' => 88888,
                'number' => 88,
                'html_url' => 'https://github.com/devspace-org/laravel-app/issues/88',
            ], 201)
        ]);

        $this->artisan('github:sync-outbound')
            ->assertExitCode(0);

        $githubIssue->refresh();
        $this->assertFalse($githubIssue->needs_sync);
        $this->assertEquals(88, $githubIssue->issue_number);
        $this->assertEquals('https://github.com/devspace-org/laravel-app/issues/88', $githubIssue->html_url);
    }

    public function test_activity_feed_loads_branch_filtered_commits_issues_and_pull_requests(): void
    {
        $installation = GitHubInstallation::create([
            'workspace_id' => $this->workspace->id,
            'github_installation_id' => '123456',
            'account_login' => 'devspace-org',
            'account_type' => 'Organization',
        ]);
        GitHubRepository::create([
            'project_id' => $this->project->id,
            'github_installation_id' => $installation->id,
            'github_repo_id' => 999111,
            'full_name' => 'devspace-org/laravel-app',
            'default_branch' => 'main',
            'html_url' => 'https://github.com/devspace-org/laravel-app',
        ]);

        Http::fake([
            'https://api.github.com/repos/devspace-org/laravel-app/branches*' => Http::response([[
                'name' => 'feature/activity',
                'commit' => ['sha' => 'abc123'],
                'protected' => true,
            ]]),
            'https://api.github.com/repos/devspace-org/laravel-app/commits*' => Http::response([[
                'sha' => 'abc123',
                'html_url' => 'https://github.com/devspace-org/laravel-app/commit/abc123',
                'commit' => ['author' => [
                    'name' => 'Rafsan',
                    'email' => 'raf@example.com',
                    'date' => '2026-07-19T12:00:00Z',
                ], 'message' => 'Improve activity feed'],
                'author' => ['login' => 'rafsan', 'avatar_url' => 'https://avatars.example/1'],
            ]]),
            'https://api.github.com/repos/devspace-org/laravel-app/pulls*' => Http::response([[
                'number' => 7,
                'title' => 'Add analytics',
                'state' => 'open',
                'merged_at' => null,
                'draft' => false,
                'html_url' => 'https://github.com/devspace-org/laravel-app/pull/7',
                'head' => ['ref' => 'feature/activity'],
                'base' => ['ref' => 'main'],
                'user' => ['login' => 'rafsan', 'avatar_url' => null],
                'updated_at' => '2026-07-19T12:30:00Z',
            ]]),
            'https://api.github.com/repos/devspace-org/laravel-app/issues*' => Http::response([[
                'number' => 9,
                'title' => 'Activity filters',
                'state' => 'open',
                'html_url' => 'https://github.com/devspace-org/laravel-app/issues/9',
                'user' => ['login' => 'rafsan', 'avatar_url' => null],
                'labels' => [['name' => 'enhancement', 'color' => '8b5e3c']],
                'updated_at' => '2026-07-19T12:45:00Z',
            ]]),
        ]);

        $response = $this->actingAs($this->user)->get(route('projects.activity', [
            'workspace' => $this->workspace->slug,
            'project' => $this->project->slug,
            'branch' => 'feature/activity',
        ]));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Project/Git/Feed')
            ->where('filters.branch', 'feature/activity')
            ->has('commits', 1)
            ->has('branches', 1)
            ->has('pullRequests', 1)
            ->has('issues', 1)
            ->where('analytics.open_issues', 1)
            ->where('analytics.open_pull_requests', 1)
        );

        Http::assertSent(fn ($request) =>
            str_contains($request->url(), '/commits')
            && $request['sha'] === 'feature/activity'
        );
    }
}
