<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        "project_id",
        "assignee_id",
        "blocked_by_id",
        "title",
        "description",
        "status",
        "priority",
        "position",
        "x_pos",
        "y_pos",
        "due_date",
    ];

    /**
     * The project this task belongs to.
     */
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * The user assigned to this task.
     */
    public function assignee()
    {
        return $this->belongsTo(User::class, "assignee_id");
    }

    /**
     * The task that blocks THIS task (The "Parent" dependency).
     */
    public function blockedBy()
    {
        return $this->belongsTo(Task::class, "blocked_by_id");
    }

    /**
     * The labels associated with this task.
     */
    public function labels()
    {
        return $this->belongsToMany(Label::class);
    }

    /**
     * The comments on this task.
     */
    public function comments()
    {
        return $this->hasMany(TaskComment::class)->latest();
    }
}
