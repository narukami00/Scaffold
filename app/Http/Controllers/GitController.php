<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Workspace;
use App\Services\GitHubTokenService;
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
    public function index(Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        $commits = [];
        $branches = [];
        $pullRequests = [];
        $error = null;

        $githubRepo = $project->githubRepository;

        if ($githubRepo) {
            try {
                $token = $this->tokenService->getInstallationToken($githubRepo->installation->github_installation_id);

                // Fetch commits from GitHub REST API
                $response = Http::withHeaders([
                    'Authorization' => "token {$token}",
                    'Accept' => 'application/vnd.github+json',
                    'X-GitHub-Api-Version' => '2022-11-28',
                    'User-Agent' => 'DevSpace-App',
                ])->get("https://api.github.com/repos/{$githubRepo->full_name}/commits", [
                    'per_page' => 50,
                ]);

                if ($response->successful()) {
                    foreach ($response->json() as $c) {
                        $commits[] = [
                            'hash' => $c['sha'],
                            'author_name' => $c['commit']['author']['name'] ?? 'Unknown',
                            'author_email' => $c['commit']['author']['email'] ?? '',
                            'date' => $c['commit']['author']['date'] ?? '',
                            'message' => $c['commit']['message'] ?? '',
                            'short_hash' => substr($c['sha'], 0, 7),
                        ];
                    }
                } else {
                    $error = "Failed to fetch commits from GitHub API: " . $response->body();
                }

                // Load pull requests from DB
                $pullRequests = $githubRepo->pullRequests()->with('task')->latest()->get()->map(function ($pr) {
                    return [
                        'id' => $pr->id,
                        'pr_number' => $pr->pr_number,
                        'title' => $pr->title,
                        'state' => $pr->state,
                        'head_branch' => $pr->head_branch,
                        'base_branch' => $pr->base_branch,
                        'html_url' => $pr->html_url,
                        'is_draft' => $pr->is_draft,
                        'task' => $pr->task ? ['id' => $pr->task->id, 'title' => $pr->task->title] : null,
                    ];
                })->toArray();

                // Load branches from DB
                $branches = $githubRepo->branches()->get()->toArray();
                if (empty($branches)) {
                    $branchesResponse = Http::withHeaders([
                        'Authorization' => "token {$token}",
                        'Accept' => 'application/vnd.github+json',
                        'X-GitHub-Api-Version' => '2022-11-28',
                        'User-Agent' => 'DevSpace-App',
                    ])->get("https://api.github.com/repos/{$githubRepo->full_name}/branches");

                    if ($branchesResponse->successful()) {
                        foreach ($branchesResponse->json() as $b) {
                            $newBranch = \App\Models\GitHubBranch::create([
                                'github_repo_id' => $githubRepo->id,
                                'name' => $b['name'],
                                'last_commit_sha' => $b['commit']['sha'] ?? '',
                            ]);
                            $branches[] = $newBranch->toArray();
                        }
                    }
                }
            } catch (\Exception $e) {
                $error = "GitHub API connection error: " . $e->getMessage();
            }
        }

        return Inertia::render('Project/Git/Feed', [
            'workspace' => $workspace,
            'project' => $project,
            'commits' => $commits,
            'branches' => $branches,
            'pullRequests' => $pullRequests,
            'error' => $error,
            'githubLinked' => !is_null($githubRepo),
        ]);
    }
}
