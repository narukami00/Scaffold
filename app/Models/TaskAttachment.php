<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        "task_id",
        "user_id",
        "file_path",
        "file_name",
        "file_type",
        "file_size",
    ];

    protected $appends = ["url"];

    /**
     * The task this attachment belongs to.
     */
    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * The user who uploaded the attachment.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the absolute URL to the file.
     */
    public function getUrlAttribute()
    {
        return asset("storage/" . $this->file_path);
    }
}
