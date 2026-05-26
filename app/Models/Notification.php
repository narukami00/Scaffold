<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        "user_id",
        "type",
        "notifiable_type",
        "notifiable_id",
        "data",
        "read_at"
    ];

    protected $casts = [
        "data" => "array",
        "read_at" => "datetime"
    ];

    /**
     * Get the user that owns the notification.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope a query to only include unread notifications.
     */
    public function scopeUnread($query)
    {
        return $query->whereNull("read_at");
    }

    /**
     * Mark the notification as read.
     */
    public function markAsRead()
    {
        $this->update(["read_at" => now()]);
    }
}
