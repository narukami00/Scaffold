<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GitHubInstallation extends Model
{
    protected $table = 'github_installations';

    protected $fillable = [
        'workspace_id',
        'github_installation_id',
        'account_login',
        'account_type',
        'avatar_url',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function repositories()
    {
        return $this->hasMany(GitHubRepository::class, 'github_installation_id');
    }
}
