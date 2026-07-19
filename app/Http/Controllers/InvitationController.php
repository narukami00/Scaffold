<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInvitationRequest;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
use App\Helpers\Notifier;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class InvitationController extends Controller
{
    /**
     * Store a new invitation.
     */
    public function store(StoreInvitationRequest $request, Workspace $workspace)
    {
        // Only owners can invite others
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        // Check if user is already a member
        $targetUser = User::where("email", $request->email)->first();
        if ($targetUser && $workspace->members()->where("users.id", $targetUser->id)->exists()) {
            return back()->withErrors(["email" => "This user is already a member of this workspace."]);
        }

        // Generate a random secure token
        $token = Str::random(40);

        $invitation = WorkspaceInvitation::create([
            "workspace_id" => $workspace->id,
            "inviter_id" => Auth::id(),
            "email" => $request->email,
            "token" => $token,
            "role" => $request->role,
            "expires_at" => now()->addDays(7),
        ]);

        // Real-time: If the user exists, push an in-app notification
        if ($targetUser) {
            Notifier::send(
                $targetUser,
                "workspace.invitation",
                [
                    "message" => "invited you to join {$workspace->name}",
                    "actor_name" => Auth::user()->name,
                    "workspace_name" => $workspace->name,
                    "workspace_slug" => $workspace->slug,
                    "token" => $token,
                    "link" => "/invitations/{$token}",
                ],
                $invitation
            );
        }

        return back()->with("message", "Invitation sent successfully!");
    }

    /**
     * Show the invitation acceptance page.
     */
    public function show(string $token)
    {
        $invitation = WorkspaceInvitation::where("token", $token)
            ->where("status", "pending")
            ->where("expires_at", ">", now())
            ->firstOrFail();

        $workspace = Workspace::findOrFail($invitation->workspace_id);

        return Inertia::render("Workspace/InviteResponse", [
            "invitation" => $invitation,
            "workspace" => $workspace,
        ]);
    }

    /**
     * officially join the workspace.
     */
    public function accept(string $token)
    {
        $invitation = WorkspaceInvitation::where("token", $token)
            ->where("status", "pending")
            ->where("expires_at", ">", now())
            ->firstOrFail();

        $workspace = Workspace::findOrFail($invitation->workspace_id);
        $userId = Auth::id();

        // Predefined premium palette
        $colors = [
            "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
            "#06b6d4", "#f97316", "#14b8a6", "#6366f1", "#d946ef", "#84cc16",
        ];
        $randomColor = $colors[array_rand($colors)];

        // Avoid DB::transaction here: Neon pooled connections often abort
        // mid-transaction and surface a misleading 25P02 follow-on error.
        if (!$workspace->members()->where("users.id", $userId)->exists()) {
            $workspace->members()->attach($userId, [
                "role" => $invitation->role ?: "member",
                "joined_at" => now(),
                "color" => $randomColor,
            ]);
        }

        $invitation->update(["status" => "accepted"]);

        // Mark corresponding notification as read if it exists
        if (Auth::check()) {
            Auth::user()->notifications()
                ->where('notifiable_type', WorkspaceInvitation::class)
                ->where('notifiable_id', $invitation->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        return redirect()->route("workspaces.show", $workspace->slug);
    }

    /**
     * Decline the invitation.
     */
    public function decline(string $token)
    {
        $invitation = WorkspaceInvitation::where("token", $token)
            ->where("status", "pending")
            ->firstOrFail();

        $invitation->update(["status" => "declined"]);

        // Mark corresponding notification as read if it exists
        if (Auth::check()) {
            Auth::user()->notifications()
                ->where('notifiable_type', WorkspaceInvitation::class)
                ->where('notifiable_id', $invitation->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        return redirect()->route("workspaces.index")->with("message", "Invitation declined.");
    }
}
