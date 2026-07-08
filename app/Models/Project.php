<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Project extends Model
{
    protected $fillable = ["name", "slug", "description", "workspace_id", "git_repo_path", "git_last_synced_commit"];

    /**
     * Automatic slug generation on creation.
     */
    protected static function boot()
    {
        parent::boot();
        static::creating(function ($project) {
            $project->slug = Str::slug($project->name) . "-" . Str::random(5);
        });
    }

    /**
     * Use the slug for routing instead of ID.
     */
    public function getRouteKeyName()
    {
        return "slug";
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * A project contains many tasks.
     */
    public function tasks()
    {
        return $this->hasMany(Task::class)->orderBy("position");
    }

    /**
     * A project contains many threads.
     */
    public function threads()
    {
        return $this->hasMany(Thread::class);
    }

    /**
     * A project contains many wiki pages.
     */
    public function wikis()
    {
        return $this->hasMany(Wiki::class);
    }

    /**
     * A project contains many labels.
     */
    public function labels()
    {
        return $this->hasMany(Label::class);
    }

    public function githubRepository()
    {
        return $this->hasOne(GitHubRepository::class);
    }
}
