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
    /**
     * Tasks that THIS task depends on (The Parents).
     */
    public function dependencies()
    {
        return $this->belongsToMany(
            Task::class,
            "task_dependencies",
            "task_id",
            "depends_on_id",
        );
    }

    /**
     * Tasks that depend on THIS task (The Children).
     */
    public function dependents()
    {
        return $this->belongsToMany(
            Task::class,
            "task_dependencies",
            "depends_on_id",
            "task_id",
        );
    }
}
