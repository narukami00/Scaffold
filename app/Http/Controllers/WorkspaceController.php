<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWorkspaceRequest;
use App\Http\Requests\UpdateWorkspaceRequest;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class WorkspaceController extends Controller
{
    /**
     * Display a listing of the user's workspaces.
     */
    public function index()
    {
        $workspaces = Workspace::where("owner_id", Auth::id())->latest()->get();

        return Inertia::render("Workspace/Index", [
            "workspaces" => $workspaces,
        ]);
    }

    /**
     * Store a newly created workspace in storage.
     */
    public function store(StoreWorkspaceRequest $request)
    {
        $workspace = Workspace::create([
            "name" => $request->name,
            "owner_id" => Auth::id(),
        ]);

        return redirect()->route("workspaces.index");
    }

    /**
     * Display the specified workspace.
     */
    public function show(Workspace $workspace)
    {
        // Security check: Only the owner should see this workspace (for now)
        if ($workspace->owner_id !== Auth::id()) {
            abort(403, "Unauthorized access to this workspace.");
        }

        return Inertia::render("Workspace/Show", [
            "workspace" => $workspace,
        ]);
    }

    /**
     * Show the settings for the workspace.
     */
    public function edit(Workspace $workspace)
    {
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        return Inertia::render("Workspace/Settings", [
            "workspace" => $workspace,
        ]);
    }

    /**
     * Update the workspace name.
     */
    public function update(
        UpdateWorkspaceRequest $request,
        Workspace $workspace,
    ) {
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        $workspace->update([
            "name" => $request->name,
        ]);

        return redirect()->route("workspaces.edit", $workspace->slug);
    }

    /**
     * Delete the workspace.
     */
    public function destroy(Workspace $workspace)
    {
        if ($workspace->owner_id !== Auth::id()) {
            abort(403);
        }

        $workspace->delete();

        return redirect()->route("workspaces.index");
    }
}
