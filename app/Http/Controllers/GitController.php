<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Workspace;
use App\Services\GitHubTokenService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class GitController extends Controller
{
    protected $tokenService;

    public function __construct(GitHubTokenService $tokenService)
    {
        $this->tokenService = $tokenService;
    }

    /**
     * Display the Git commit timeline feed from GitHub.
     */
    public function index(Request $request, Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        $commits = [];
        $branches = [];
        $pullRequests = [];
        $issues = [];
        $error = null;
        $selectedBranch = null;

        $githubRepo = $project->githubRepository;

        if ($githubRepo) {
            try {
                $token = $this->tokenService->getInstallationToken($githubRepo->installation->github_installation_id);
                $client = Http::withHeaders([
                    'Authorization' => "Bearer {$token}",
                    'Accept' => 'application/vnd.github+json',
                    'X-GitHub-Api-Version' => '2022-11-28',
                    'User-Agent' => 'DevSpace-App',
                ])->timeout(15);
                $baseUrl = "https://api.github.com/repos/{$githubRepo->full_name}";

                $branchesResponse = $client->get("{$baseUrl}/branches", ['per_page' => 100]);
                if ($branchesResponse->successful()) {
                    foreach ($branchesResponse->json() as $branch) {
                        $record = $githubRepo->branches()->updateOrCreate(
                            ['name' => $branch['name']],
                            ['last_commit_sha' => $branch['commit']['sha'] ?? null],
                        );
                        $branches[] = [
                            'id' => $record->id,
                            'name' => $branch['name'],
                            'last_commit_sha' => $branch['commit']['sha'] ?? null,
                            'protected' => (bool) ($branch['protected'] ?? false),
                            'is_default' => $branch['name'] === $githubRepo->default_branch,
                        ];
                    }
                } else {
                    $branches = $githubRepo->branches()->get()->map(fn ($branch) => [
                        'id' => $branch->id,
                        'name' => $branch->name,
                        'last_commit_sha' => $branch->last_commit_sha,
                        'protected' => false,
                        'is_default' => $branch->name === $githubRepo->default_branch,
                    ])->all();
                }

                $requestedBranch = $request->string('branch')->trim()->toString();
                $branchNames = collect($branches)->pluck('name');
                $selectedBranch = $branchNames->contains($requestedBranch)
                    ? $requestedBranch
                    : ($githubRepo->default_branch ?: $branchNames->first());

                $commitsResponse = $client->get("{$baseUrl}/commits", array_filter([
                    'sha' => $selectedBranch,
                    'per_page' => 50,
                ]));
                if ($commitsResponse->successful()) {
                    foreach ($commitsResponse->json() as $commit) {
                        $commits[] = [
                            'hash' => $commit['sha'],
                            'short_hash' => substr($commit['sha'], 0, 7),
                            'author_name' => $commit['commit']['author']['name'] ?? 'Unknown',
                            'author_email' => $commit['commit']['author']['email'] ?? '',
                            'author_login' => $commit['author']['login'] ?? null,
                            'author_avatar' => $commit['author']['avatar_url'] ?? null,
                            'date' => $commit['commit']['author']['date'] ?? '',
                            'message' => $commit['commit']['message'] ?? '',
                            'html_url' => $commit['html_url'] ?? null,
                            'branch' => $selectedBranch,
                        ];
                    }
                } else {
                    $error = 'GitHub could not load commits for the selected branch.';
                }

                $pullsResponse = $client->get("{$baseUrl}/pulls", [
                    'state' => 'all',
                    'sort' => 'updated',
                    'direction' => 'desc',
                    'per_page' => 50,
                ]);
                if ($pullsResponse->successful()) {
                    $pullRequests = collect($pullsResponse->json())->map(fn ($pr) => [
                        'pr_number' => $pr['number'],
                        'title' => $pr['title'] ?? 'Untitled pull request',
                        'state' => !empty($pr['merged_at']) ? 'merged' : ($pr['state'] ?? 'open'),
                        'head_branch' => $pr['head']['ref'] ?? '',
                        'base_branch' => $pr['base']['ref'] ?? '',
                        'html_url' => $pr['html_url'] ?? null,
                        'is_draft' => (bool) ($pr['draft'] ?? false),
                        'author_login' => $pr['user']['login'] ?? 'Unknown',
                        'author_avatar' => $pr['user']['avatar_url'] ?? null,
                        'updated_at' => $pr['updated_at'] ?? null,
                    ])->all();
                } else {
                    $pullRequests = $githubRepo->pullRequests()->with('task')->latest()->get()->map(fn ($pr) => [
                        'pr_number' => $pr->pr_number,
                        'title' => $pr->title,
                        'state' => $pr->state,
                        'head_branch' => $pr->head_branch,
                        'base_branch' => $pr->base_branch,
                        'html_url' => $pr->html_url,
                        'is_draft' => $pr->is_draft,
                        'author_login' => null,
                        'author_avatar' => null,
                        'updated_at' => $pr->updated_at?->toISOString(),
                    ])->all();
                }

                $issuesResponse = $client->get("{$baseUrl}/issues", [
                    'state' => 'all',
                    'sort' => 'updated',
                    'direction' => 'desc',
                    'per_page' => 50,
                ]);
                if ($issuesResponse->successful()) {
                    $issues = collect($issuesResponse->json())
                        ->reject(fn ($issue) => isset($issue['pull_request']))
                        ->map(fn ($issue) => [
                            'number' => $issue['number'],
                            'title' => $issue['title'] ?? 'Untitled issue',
                            'state' => $issue['state'] ?? 'open',
                            'html_url' => $issue['html_url'] ?? null,
                            'author_login' => $issue['user']['login'] ?? 'Unknown',
                            'author_avatar' => $issue['user']['avatar_url'] ?? null,
                            'labels' => collect($issue['labels'] ?? [])->map(fn ($label) => [
                                'name' => $label['name'] ?? '',
                                'color' => $label['color'] ?? '8b5e3c',
                            ])->all(),
                            'updated_at' => $issue['updated_at'] ?? null,
                        ])->all();
                }
            } catch (\Exception $e) {
                Log::warning('GitHub activity feed failed', [
                    'project_id' => $project->id,
                    'message' => $e->getMessage(),
                ]);
                $error = 'GitHub is temporarily unavailable. Existing project data is still safe.';
            }
        }

        $analytics = [
            'commits' => count($commits),
            'contributors' => collect($commits)
                ->map(fn ($commit) => $commit['author_login'] ?: $commit['author_email'])
                ->filter()
                ->unique()
                ->count(),
            'branches' => count($branches),
            'open_issues' => collect($issues)->where('state', 'open')->count(),
            'open_pull_requests' => collect($pullRequests)
                ->filter(fn ($pr) => $pr['state'] === 'open' && !$pr['is_draft'])
                ->count(),
            'draft_pull_requests' => collect($pullRequests)->where('is_draft', true)->count(),
            'merged_pull_requests' => collect($pullRequests)->where('state', 'merged')->count(),
        ];

        return Inertia::render('Project/Git/Feed', [
            'workspace' => $workspace,
            'project' => $project,
            'commits' => $commits,
            'branches' => $branches,
            'pullRequests' => $pullRequests,
            'issues' => $issues,
            'analytics' => $analytics,
            'filters' => ['branch' => $selectedBranch],
            'error' => $error,
            'githubLinked' => !is_null($githubRepo),
        ]);
    }
}
