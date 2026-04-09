<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Display a listing of the notifications for the current user.
     */
    public function index()
    {
        return Auth::user()->notifications()
            ->latest()
            ->limit(30)
            ->get();
    }

    /**
     * Mark a notification as read.
     */
    public function markRead(string $id)
    {
        $notification = Auth::user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(["success" => true]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllRead()
    {
        Auth::user()->notifications()->whereNull("read_at")->update([
            "read_at" => now()
        ]);

        return response()->json(["success" => true]);
    }
}
