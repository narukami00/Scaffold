<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GitHubPullRequest extends Model
{
    protected $table = 'github_pull_requests';

    protected $fillable = [
        'task_id',
        'github_repo_id',
        'pr_number',
        'title',
        'state',
        'head_branch',
        'base_branch',
        'html_url',
        'is_draft',
    ];

    protected $casts = [
        'is_draft' => 'boolean',
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
