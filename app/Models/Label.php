<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Label extends Model
{
    protected $fillable = ["project_id", "name", "color"];

    public function tasks()
    {
        return $this->belongsToMany(Task::class);
    }
}
