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
     * Handle the redirect from GitHub App installation.
     */
    public function callback(Request $request)
    {
        $installationId = $request->query('installation_id');
        $setupAction = $request->query('setup_action');
        $workspaceSlug = $request->query('state'); // workspace slug passed as state parameter

        if (!$installationId || $setupAction !== 'install' || !$workspaceSlug) {
            return redirect()->route('workspaces.index')->withErrors(['github' => 'Invalid callback parameters from GitHub.']);
        }

        $workspace = Workspace::where('slug', $workspaceSlug)->first();
        if (!$workspace) {
            return redirect()->route('workspaces.index')->withErrors(['github' => 'Workspace not found.']);
        }

        // Verify membership
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
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
     * List all repositories available for linking in the workspace.
     */
    public function listRepositories(Workspace $workspace)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        $installations = $workspace->githubInstallations;
        $repositories = [];

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
                }
            } catch (\Exception $e) {
                Log::error("Error listing repositories for installation {$installation->github_installation_id}: " . $e->getMessage());
            }
        }

        return response()->json($repositories);
    }

    /**
     * Link a project to a selected GitHub repository.
     */
    public function linkRepository(Request $request, Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists() || $project->workspace_id !== $workspace->id) {
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
        if (!$workspace->members()->where('users.id', Auth::id())->exists() || $project->workspace_id !== $workspace->id) {
            abort(403);
        }

        if ($project->githubRepository) {
            $project->githubRepository->delete();
        }

        return back()->with('success', 'Repository unlinked successfully.');
    }
}
