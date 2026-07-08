<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GitHubIssue extends Model
{
    protected $table = 'github_issues';

    protected $fillable = [
        'task_id',
        'github_repo_id',
        'github_issue_id',
        'issue_number',
        'html_url',
        'last_synced_hash',
        'needs_sync',
        'needs_sync_since',
        'synced_at',
    ];

    protected $casts = [
        'needs_sync' => 'boolean',
        'needs_sync_since' => 'datetime',
        'synced_at' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function repository()
    {
        return $this->belongsTo(GitHubRepository::class, 'github_repo_id');
    }
}
