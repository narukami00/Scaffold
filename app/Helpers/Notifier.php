<?php

namespace App\Helpers;

use App\Models\Notification;
use App\Models\User;
use App\Events\NotificationReceived;

class Notifier
{
    /**
     * Create and broadcast a notification.
     *
     * @param User $user The recipient
     * @param string $type The notification type
     * @param array $data JSON data payload
     * @param mixed $notifiable Optional related model
     * @return Notification
     */
    public static function send(User $user, string $type, array $data, $notifiable = null)
    {
        $notification = Notification::create([
            "user_id" => $user->id,
            "type" => $type,
            "notifiable_type" => $notifiable ? get_class($notifiable) : null,
            "notifiable_id" => $notifiable ? $notifiable->id : null,
            "data" => $data,
        ]);

        // Broadcast the real-time event (include recipient's own socket —
        // queue jobs have no auth user; web requests need the recipient to see it).
        try {
            broadcast(new NotificationReceived($notification));
        } catch (\Exception $e) {
            \Log::error("Broadcasting failed: " . $e->getMessage());
        }

        return $notification;
    }
}
