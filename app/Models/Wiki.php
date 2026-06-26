<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Wiki extends Model
{
    protected $fillable = ["project_id", "user_id", "title", "slug", "content"];

    /**
     * Automatic slug generation on creation.
     */
    protected static function boot()
    {
        parent::boot();
        static::creating(function ($wiki) {
            $wiki->slug = Str::slug($wiki->title) . "-" . Str::random(5);
        });
    }

    /**
     * Use the slug for routing instead of ID.
     */
    public function getRouteKeyName()
    {
        return "slug";
    }

    /**
     * Wiki belongs to a project.
     */
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Wiki belongs to a creator user.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
