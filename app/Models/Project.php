<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Project extends Model
{
    protected $fillable = ["name", "slug", "description", "workspace_id"];

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
}
