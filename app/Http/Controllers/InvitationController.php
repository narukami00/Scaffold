<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInvitationRequest;
use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
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

        // Generate a random secure token
        $token = Str::random(40);

        WorkspaceInvitation::create([
            "workspace_id" => $workspace->id,
            "email" => $request->email,
            "token" => $token,
            "role" => $request->role,
            "expires_at" => now()->addDays(7),
        ]);

        // In a real app, you would send an email here with the link:
        // /invitations/accept/{token}

        return back()->with("message", "Invitation sent successfully!");
    }

    /**
     * Show the invitation acceptance page.
     */
    public function show(string $token)
    {
        $invitation = WorkspaceInvitation::where("token", $token)
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
            ->where("expires_at", ">", now())
            ->firstOrFail();

        $workspace = Workspace::findOrFail($invitation->workspace_id);

        // Add the user to the workspace members
        $workspace->members()->attach(Auth::id(), [
            "role" => $invitation->role,
            "joined_at" => now(),
        ]);

        // Delete the invitation now that it's used
        $invitation->delete();

        return redirect()->route("workspaces.show", $workspace->slug);
    }
}
