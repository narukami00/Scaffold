<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Media extends Model
{
    use HasFactory;

    protected $fillable = [
        "user_id",
        "project_id",
        "mediable_id",
        "mediable_type",
        "file_path",
        "file_name",
        "file_type",
        "file_size",
    ];

    /**
     * Get the parent mediable model (Thread, Reply, Task, etc).
     */
    public function mediable()
    {
        return $this->morphTo();
    }

    /**
     * Get the user who uploaded the media.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
