<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkspaceInvitation extends Model
{
    protected $fillable = [
        "workspace_id",
        "inviter_id",
        "email",
        "token",
        "role",
        "status",
        "expires_at",
    ];

    protected function casts(): array
    {
        return [
            "expires_at" => "datetime",
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function inviter()
    {
        return $this->belongsTo(User::class, "inviter_id");
    }
}
