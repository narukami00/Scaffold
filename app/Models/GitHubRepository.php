<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GitHubRepository extends Model
{
    protected $table = 'github_repositories';

    protected $fillable = [
        'project_id',
        'github_installation_id',
        'github_repo_id',
        'full_name',
        'default_branch',
        'html_url',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function installation()
    {
        return $this->belongsTo(GitHubInstallation::class, 'github_installation_id');
    }

    public function issues()
    {
        return $this->hasMany(GitHubIssue::class, 'github_repo_id');
    }

    public function pullRequests()
    {
        return $this->hasMany(GitHubPullRequest::class, 'github_repo_id');
    }

    public function branches()
    {
        return $this->hasMany(GitHubBranch::class, 'github_repo_id');
    }
}
