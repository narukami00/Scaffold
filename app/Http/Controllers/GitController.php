<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class GitController extends Controller
{
    /**
     * Display the Git commit timeline feed.
     */
    public function index(Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        $commits = [];
        $error = null;

        if ($project->git_repo_path) {
            if (is_dir($project->git_repo_path)) {
                $escapedPath = escapeshellarg($project->git_repo_path);
                // Run git command to fetch last 50 commits
                $output = shell_exec("cd /d {$escapedPath} && git log -n 50 --pretty=format:\"%H|%an|%ae|%ad|%s\" 2>&1");

                if ($output && !str_contains($output, 'fatal:')) {
                    $lines = explode("\n", trim($output));
                    foreach ($lines as $line) {
                        $parts = explode("|", $line, 5);
                        if (count($parts) === 5) {
                            $commits[] = [
                                'hash' => $parts[0],
                                'author_name' => $parts[1],
                                'author_email' => $parts[2],
                                'date' => $parts[3],
                                'message' => $parts[4],
                                'short_hash' => substr($parts[0], 0, 7),
                            ];
                        }
                    }
                } else {
                    $error = "Failed to retrieve git log. Ensure the repository is initialized. Error: " . ($output ?: 'Unknown');
                }
            } else {
                $error = "The configured Git repository directory does not exist or is not accessible.";
            }
        }

        return Inertia::render('Project/Git/Feed', [
            'workspace' => $workspace,
            'project' => $project,
            'commits' => $commits,
            'error' => $error,
        ]);
    }

    /**
     * Sync commits manually from the configured path.
     */
    public function sync(Workspace $workspace, Project $project)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        if (!$project->git_repo_path || !is_dir($project->git_repo_path)) {
            return back()->withErrors(['git_repo_path' => 'Git repository path is invalid.']);
        }

        $escapedPath = escapeshellarg($project->git_repo_path);
        $output = shell_exec("cd /d {$escapedPath} && git log -n 100 --pretty=format:\"%H|%an|%ae|%ad|%s\" 2>&1");

        if (!$output || str_contains($output, 'fatal:')) {
            return back()->withErrors(['git_repo_path' => 'Failed to run git log.']);
        }

        $lines = array_reverse(explode("\n", trim($output))); // Process oldest to newest
        $syncedCount = 0;
        $latestHash = null;

        foreach ($lines as $line) {
            $parts = explode("|", $line, 5);
            if (count($parts) === 5) {
                $hash = $parts[0];
                $authorName = $parts[1];
                $message = $parts[4];
                $latestHash = $hash;

                // Process this commit
                $processed = $this->processCommit($project, $hash, $authorName, $message);
                if ($processed) {
                    $syncedCount++;
                }
            }
        }

        if ($latestHash) {
            $project->update(['git_last_synced_commit' => $latestHash]);
        }

        return back()->with('success', "Git sync completed. Processed {$syncedCount} new task references.");
    }

    /**
     * Webhook endpoint hit by local git post-commit hooks.
     */
    public function webhook(Request $request, Workspace $workspace, Project $project)
    {
        $validated = $request->validate([
            'hash' => 'required|string',
            'message' => 'required|string',
            'author_name' => 'required|string',
        ]);

        $hash = $validated['hash'];
        $authorName = $validated['author_name'];
        $message = $validated['message'];

        $processed = $this->processCommit($project, $hash, $authorName, $message);

        $project->update(['git_last_synced_commit' => $hash]);

        return response()->json([
            'success' => true,
            'processed' => $processed,
        ]);
    }

    /**
     * Parse task links and transition task status in database.
     */
    protected function processCommit(Project $project, string $hash, string $authorName, string $message): bool
    {
        // Find task references (e.g. #12)
        preg_match_all('/#(\d+)/', $message, $matches);
        if (empty($matches[1])) {
            return false;
        }

        // Check if message matches closing keywords (e.g., closes #12, fix #12)
        $isClose = preg_match('/(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/i', $message);
        $processedAny = false;

        foreach ($matches[1] as $taskId) {
            $task = Task::find($taskId);

            if ($task && $task->project_id === $project->id) {
                // Prevent duplicate comments for same commit
                $commentSignature = "`{$hash}`";
                $exists = $task->comments()->where('body', 'like', "%{$commentSignature}%")->exists();

                if (!$exists) {
                    $statusUpdated = false;

                    if ($isClose && $task->status !== 'done') {
                        $task->status = 'done';
                        $task->save();
                        $statusUpdated = true;
                    }

                    // Exclude comments from blocking if user is system/webhook
                    $userId = Auth::id() ?: $project->workspace->owner_id;

                    $commentText = "Commit `{$hash}` by **{$authorName}**:\n> {$message}";
                    if ($statusUpdated) {
                        $commentText = "⚡ **Task closed via commit** `{$hash}` by **{$authorName}**:\n> {$message}";
                    }

                    $comment = $task->comments()->create([
                        'user_id' => $userId,
                        'body' => $commentText,
                    ]);

                    // Broadcast real-time events to all clients
                    broadcast(new \App\Events\CommentPosted($comment))->toOthers();
                    if ($statusUpdated) {
                        broadcast(new \App\Events\TaskUpdated($task))->toOthers();
                    }

                    $processedAny = true;
                }
            }
        }

        return $processedAny;
    }
}
