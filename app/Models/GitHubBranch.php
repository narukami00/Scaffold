<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GitHubBranch extends Model
{
    protected $table = 'github_branches';

    protected $fillable = [
        'github_repo_id',
        'name',
        'last_commit_sha',
    ];

    public function repository()
    {
        return $this->belongsTo(GitHubRepository::class, 'github_repo_id');
    }
}
