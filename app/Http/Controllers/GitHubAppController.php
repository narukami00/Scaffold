<?php

namespace App\Http\Controllers;

use App\Models\GitHubInstallation;
use App\Models\GitHubRepository;
use App\Models\Project;
use App\Models\Workspace;
use App\Services\GitHubTokenService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GitHubAppController extends Controller
{
    protected $tokenService;

    public function __construct(GitHubTokenService $tokenService)
    {
        $this->tokenService = $tokenService;
    }

    /**
     * Store the active workspace slug in session and redirect to the GitHub App installation/configuration page.
     */
    public function connect(Workspace $workspace)
    {
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        session(['github_active_workspace' => $workspace->slug]);

        $githubAppSlug = config('services.github.app_slug', 'devspace-scaffold');
        return redirect("https://github.com/apps/{$githubAppSlug}/installations/new?state={$workspace->slug}");
    }

    /**
     * Handle the redirect from GitHub App installation.
     */
    public function callback(Request $request)
    {
        $installationId = $request->query('installation_id');
        $setupAction = $request->query('setup_action');
        $workspaceSlug = $request->query('state') ?: session('github_active_workspace');

        if (!$installationId || !$workspaceSlug) {
            return redirect()->route('workspaces.index')->withErrors(['github' => 'Invalid callback parameters from GitHub.']);
        }

        $workspace = Workspace::where('slug', $workspaceSlug)->first();
        if (!$workspace) {
            return redirect()->route('workspaces.index')->withErrors(['github' => 'Workspace not found.']);
        }

        // Verify membership
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        try {
            // Get installation details using App JWT
            $jwt = $this->tokenService->generateAppJwt();

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$jwt}",
                'Accept' => 'application/vnd.github+json',
                'X-GitHub-Api-Version' => '2022-11-28',
                'User-Agent' => 'DevSpace-App',
            ])->get("https://api.github.com/app/installations/{$installationId}");

            if ($response->failed()) {
                Log::error("Failed to fetch GitHub installation details: " . $response->body());
                return redirect()->route('workspaces.show', $workspace)->withErrors(['github' => 'Failed to fetch installation details from GitHub.']);
            }

            $details = $response->json();
            $account = $details['account'] ?? [];

            // Store installation record mapping to workspace
            GitHubInstallation::updateOrCreate(
                ['github_installation_id' => $installationId],
                [
                    'workspace_id' => $workspace->id,
                    'account_login' => $account['login'] ?? 'Unknown',
                    'account_type' => $account['type'] ?? 'User',
                    'avatar_url' => $account['avatar_url'] ?? null,
                ]
            );

            // Redirect back to integrations tab
            return redirect("/workspaces/{$workspace->slug}?tab=integrations")->with('success', 'GitHub App successfully linked to your workspace.');

        } catch (\Exception $e) {
            Log::error("GitHub callback exception: " . $e->getMessage());
            return redirect()->route('workspaces.show', $workspace)->withErrors(['github' => $e->getMessage()]);
        }
    }

    /**
     * Discover and sync all GitHub App installations to the workspace.
     * This handles the case where the GitHub callback was skipped
     * (e.g., app was already installed from a previous session).
     */
    public function syncInstallations(Workspace $workspace): array
    {
        $errors = [];

        try {
            $jwt = $this->tokenService->generateAppJwt();

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$jwt}",
                'Accept' => 'application/vnd.github+json',
                'X-GitHub-Api-Version' => '2022-11-28',
                'User-Agent' => 'DevSpace-App',
            ])->get("https://api.github.com/app/installations");

            if ($response->failed()) {
                $errors[] = "Failed to list GitHub App installations: HTTP {$response->status()} - " . $response->body();
                Log::error("syncInstallations API error: {$response->status()} " . $response->body());
                return $errors;
            }

            $installations = $response->json();

            if (!is_array($installations)) {
                $errors[] = "Unexpected response format from GitHub API.";
                Log::error("syncInstallations unexpected response: " . json_encode($installations));
                return $errors;
            }

            $synced = 0;
            foreach ($installations as $inst) {
                $account = $inst['account'] ?? [];

                GitHubInstallation::updateOrCreate(
                    ['github_installation_id' => $inst['id']],
                    [
                        'workspace_id' => $workspace->id,
                        'account_login' => $account['login'] ?? 'Unknown',
                        'account_type' => $account['type'] ?? 'User',
                        'avatar_url' => $account['avatar_url'] ?? null,
                    ]
                );
                $synced++;
            }

            Log::info("syncInstallations: synced {$synced} installation(s) for workspace {$workspace->id}");

        } catch (\Exception $e) {
            $errors[] = "Sync error: " . $e->getMessage();
            Log::error("syncInstallations exception: " . $e->getMessage());
        }

        return $errors;
    }

    /**
     * List all repositories available for linking in the workspace.
     */
    public function listRepositories(Workspace $workspace)
    {
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        $installations = $workspace->githubInstallations;

        // Auto-discover installations if none are saved locally
        if ($installations->isEmpty()) {
            $syncErrors = $this->syncInstallations($workspace);
            $workspace->load('githubInstallations');
            $installations = $workspace->githubInstallations;

            if ($installations->isEmpty()) {
                return response()->json([
                    'repositories' => [],
                    'error' => !empty($syncErrors)
                        ? 'Auto-sync failed: ' . implode('; ', $syncErrors)
                        : 'No GitHub App installations found. Please install the GitHub App first via the link below.',
                ]);
            }
        }

        $repositories = [];
        $errors = [];

        foreach ($installations as $installation) {
            try {
                $token = $this->tokenService->getInstallationToken($installation->github_installation_id);

                $response = Http::withHeaders([
                    'Authorization' => "token {$token}",
                    'Accept' => 'application/vnd.github+json',
                    'X-GitHub-Api-Version' => '2022-11-28',
                    'User-Agent' => 'DevSpace-App',
                ])->get("https://api.github.com/installation/repositories");

                if ($response->successful()) {
                    $data = $response->json();
                    foreach ($data['repositories'] ?? [] as $repo) {
                        $repositories[] = [
                            'github_repo_id' => $repo['id'],
                            'full_name' => $repo['full_name'],
                            'default_branch' => $repo['default_branch'] ?? 'main',
                            'html_url' => $repo['html_url'],
                            'github_installation_id' => $installation->id,
                            'private' => $repo['private'] ?? false,
                        ];
                    }
                } else {
                    $errors[] = "GitHub API returned {$response->status()} for installation {$installation->account_login}: " . $response->body();
                    Log::error("GitHub API error for installation {$installation->github_installation_id}: {$response->status()} " . $response->body());
                }
            } catch (\Exception $e) {
                $errors[] = "Installation {$installation->account_login}: " . $e->getMessage();
                Log::error("Error listing repositories for installation {$installation->github_installation_id}: " . $e->getMessage());
            }
        }

        return response()->json([
            'repositories' => $repositories,
            'error' => count($errors) > 0 ? implode('; ', $errors) : null,
        ]);
    }

    /**
     * Link a project to a selected GitHub repository.
     */
    public function linkRepository(Request $request, Workspace $workspace, Project $project)
    {
        if ($workspace->owner_id !== Auth::id() || $project->workspace_id !== $workspace->id) {
            abort(403);
        }

        $validated = $request->validate([
            'github_repo_id' => 'required|numeric',
            'github_installation_id' => 'required|exists:github_installations,id',
            'full_name' => 'required|string',
            'default_branch' => 'required|string',
            'html_url' => 'required|url',
        ]);

        GitHubRepository::updateOrCreate(
            ['project_id' => $project->id],
            [
                'github_installation_id' => $validated['github_installation_id'],
                'github_repo_id' => $validated['github_repo_id'],
                'full_name' => $validated['full_name'],
                'default_branch' => $validated['default_branch'],
                'html_url' => $validated['html_url'],
            ]
        );

        return back()->with('success', 'Repository linked successfully.');
    }

    /**
     * Unlink a repository from a project.
     */
    public function unlinkRepository(Workspace $workspace, Project $project)
    {
        if ($workspace->owner_id !== Auth::id() || $project->workspace_id !== $workspace->id) {
            abort(403);
        }

        if ($project->githubRepository) {
            $project->githubRepository->delete();
        }

        return back()->with('success', 'Repository unlinked successfully.');
    }
}
