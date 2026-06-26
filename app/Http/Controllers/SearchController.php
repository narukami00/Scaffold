<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\Thread;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SearchController extends Controller
{
    /**
     * Search for tasks, threads, and projects in the workspace.
     */
    public function search(Request $request, Workspace $workspace)
    {
        // Security check, must be workspace member
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        $query = $request->query('q');

        if (empty($query) || strlen($query) < 2) {
            return response()->json([
                'projects' => [],
                'tasks' => [],
                'threads' => [],
            ]);
        }

        // Projects
        $projects = $workspace->projects()
            ->where('name', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'name', 'slug']);

        $projectIds = $workspace->projects()->pluck('id');

        // Tasks
        $tasks = Task::whereIn('project_id', $projectIds)
            ->where(function ($q) use ($query) {
                $q->where('title', 'like', "%{$query}%")
                  ->orWhere('description', 'like', "%{$query}%");
            })
            ->with(['project:id,slug,name'])
            ->limit(10)
            ->get(['id', 'project_id', 'title', 'status']);

        // Threads
        $threads = Thread::whereIn('project_id', $projectIds)
            ->where(function ($q) use ($query) {
                $q->where('title', 'like', "%{$query}%")
                  ->orWhere('body', 'like', "%{$query}%");
            })
            ->with(['project:id,slug,name'])
            ->limit(10)
            ->get(['id', 'project_id', 'title']);

        // Wikis
        $wikis = \App\Models\Wiki::whereIn('project_id', $projectIds)
            ->where(function ($q) use ($query) {
                $q->where('title', 'like', "%{$query}%")
                  ->orWhere('content', 'like', "%{$query}%");
            })
            ->with(['project:id,slug,name'])
            ->limit(10)
            ->get(['id', 'project_id', 'title', 'slug']);

        return response()->json([
            'projects' => $projects,
            'tasks' => $tasks,
            'threads' => $threads,
            'wikis' => $wikis,
        ]);
    }
}
