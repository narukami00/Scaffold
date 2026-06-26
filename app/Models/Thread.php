<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Thread extends Model
{
    use HasFactory;

    protected static function booted()
    {
        static::deleting(function ($thread) {
            $thread->replies->each->delete();
            $thread->reactions()->delete();
            $thread->media()->delete();
        });
    }

    protected $fillable = [
        "project_id",
        "user_id",
        "title",
        "body",
        "tags",
        "is_pinned",
    ];

    protected $casts = [
        "is_pinned" => "boolean",
        "tags" => "array",
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function replies()
    {
        return $this->hasMany(ThreadReply::class);
    }

    public function reactions()
    {
        return $this->morphMany(Reaction::class, "reactable");
    }

    public function media()
    {
        return $this->morphMany(Media::class, "mediable");
    }
}
