<?php

namespace App\Http\Middleware;

use App\Models\Workspace;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = "app";

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */

    public function share(Request $request): array
    {
        $workspace = $request->route("workspace");

        if (is_string($workspace)) {
            $workspace = Workspace::with("projects")
                ->where("slug", $workspace)
                ->first();
        } elseif ($workspace instanceof Workspace) {
            $workspace->loadMissing("projects");
        } else {
            $workspace = null;
        }

        return [
            ...parent::share($request),
            "auth" => [
                "user" => $request->user(),
            ],
            // Share sidebar projects only when the route actually resolved a workspace.
            "workspaceProjects" => $workspace ? $workspace->projects : [],
        ];
    }
}
