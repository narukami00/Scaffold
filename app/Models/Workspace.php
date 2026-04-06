<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Workspace extends Model
{
    use HasFactory;

    protected $fillable = ["name", "slug", "owner_id"];

    /**
     * Get the user that owns the workspace.
     */
    public function owner()
    {
        return $this->belongsTo(User::class, "owner_id");
    }

    /**
     * Automatically generate a slug when the workspace is being created.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($workspace) {
            if (empty($workspace->slug)) {
                $workspace->slug =
                    Str::slug($workspace->name) . "-" . Str::random(5);
            }
        });
    }

    /**
     * Use the slug instead of the ID for URL routing.
     */
    public function getRouteKeyName()
    {
        return "slug";
    }

    /**
     * The members that belong to the workspace.
     */
    public function members()
    {
        return $this->belongsToMany(User::class, "workspace_members")
            ->withPivot("role", "joined_at")
            ->withTimestamps();
    }

    /**
     * A workspace can host many projects.
     */
    public function projects()
    {
        return $this->hasMany(Project::class)->latest();
    }
}
