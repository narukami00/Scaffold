<?php

namespace App\Services;

use App\Models\GitHubIssue;
use App\Models\Media;
use App\Models\Notification;
use App\Models\Project;
use App\Models\Reaction;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\Thread;
use App\Models\ThreadReply;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class ProjectDeletionService
{
    /**
     * Permanently delete a project and all locally owned data.
     *
     * Remote GitHub resources are intentionally not modified.
     */
    public function delete(Project $project): void
    {
        $lock = Cache::lock("project-delete:{$project->id}", 30);

        if (!$lock->get()) {
            throw new RuntimeException('This project is already being deleted.');
        }

        try {
            $filePaths = $this->collectFilePaths($project);

            DB::transaction(function () use ($project) {
                $taskIds = Task::where('project_id', $project->id)->pluck('id');
                $taskCommentIds = TaskComment::whereIn('task_id', $taskIds)->pluck('id');
                $threadIds = Thread::where('project_id', $project->id)->pluck('id');
                $replyIds = ThreadReply::whereIn('thread_id', $threadIds)->pluck('id');
                $githubIssueIds = GitHubIssue::whereIn('task_id', $taskIds)->pluck('id');

                $this->deleteReactions(Task::class, $taskIds);
                $this->deleteReactions(TaskComment::class, $taskCommentIds);
                $this->deleteReactions(Thread::class, $threadIds);
                $this->deleteReactions(ThreadReply::class, $replyIds);

                Notification::where(function ($query) use ($taskIds, $githubIssueIds) {
                    $query
                        ->where(function ($taskQuery) use ($taskIds) {
                            $taskQuery
                                ->where('notifiable_type', Task::class)
                                ->whereIn('notifiable_id', $taskIds);
                        })
                        ->orWhere(function ($issueQuery) use ($githubIssueIds) {
                            $issueQuery
                                ->where('notifiable_type', GitHubIssue::class)
                                ->whereIn('notifiable_id', $githubIssueIds);
                        });
                })->delete();

                // Delete morph-linked and project-scoped media before their owners.
                Media::where('project_id', $project->id)
                    ->orWhere(function ($query) use ($threadIds) {
                        $query->where('mediable_type', Thread::class)
                            ->whereIn('mediable_id', $threadIds);
                    })
                    ->orWhere(function ($query) use ($replyIds) {
                        $query->where('mediable_type', ThreadReply::class)
                            ->whereIn('mediable_id', $replyIds);
                    })
                    ->delete();

                // Explicit deletion supports databases deployed before thread FKs
                // were added. New installations also have cascade constraints.
                ThreadReply::whereIn('thread_id', $threadIds)->delete();
                Thread::whereIn('id', $threadIds)->delete();

                $project->delete();
            }, 3);

            $this->deleteFiles($filePaths, $project->id);
        } finally {
            $lock->release();
        }
    }

    private function collectFilePaths(Project $project): array
    {
        $taskIds = Task::where('project_id', $project->id)->pluck('id');
        $threadIds = Thread::where('project_id', $project->id)->pluck('id');
        $replyIds = ThreadReply::whereIn('thread_id', $threadIds)->pluck('id');

        $attachmentPaths = DB::table('task_attachments')
            ->whereIn('task_id', $taskIds)
            ->pluck('file_path');

        $mediaPaths = Media::where('project_id', $project->id)
            ->orWhere(function ($query) use ($threadIds) {
                $query->where('mediable_type', Thread::class)
                    ->whereIn('mediable_id', $threadIds);
            })
            ->orWhere(function ($query) use ($replyIds) {
                $query->where('mediable_type', ThreadReply::class)
                    ->whereIn('mediable_id', $replyIds);
            })
            ->pluck('file_path');

        return $attachmentPaths
            ->merge($mediaPaths)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function deleteReactions(string $type, $ids): void
    {
        if ($ids->isEmpty()) {
            return;
        }

        Reaction::where('reactable_type', $type)
            ->whereIn('reactable_id', $ids)
            ->delete();
    }

    private function deleteFiles(array $paths, int $projectId): void
    {
        foreach ($paths as $path) {
            try {
                Storage::disk('public')->delete($path);
            } catch (\Throwable $exception) {
                Log::warning('Failed to remove project file after deletion.', [
                    'project_id' => $projectId,
                    'path' => $path,
                    'message' => $exception->getMessage(),
                ]);
            }
        }
    }
}
