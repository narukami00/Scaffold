<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\Thread;
use App\Models\User;
use App\Models\Wiki;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProfileController extends Controller
{
    /**
     * Display a workspace member's profile.
     */
    public function show(Workspace $workspace, User $user)
    {
        // Ensure viewer is a member of the workspace
        if (!$workspace->members()->where("users.id", Auth::id())->exists()) {
            abort(403);
        }

        // Ensure the profile user is also a member of the workspace
        $memberPivot = $workspace->members()->where("users.id", $user->id)->first();
        if (!$memberPivot) {
            abort(404, "User is not a member of this workspace.");
        }

        $userColor = $memberPivot->pivot->color ?? "#8b5e3c";

        // Gather professional PM analytics for the user in this workspace
        $tasksCompleted = Task::where("assignee_id", $user->id)
            ->whereHas("project", function ($q) use ($workspace) {
                $q->where("workspace_id", $workspace->id);
            })
            ->where("status", "done")
            ->count();

        $tasksPending = Task::where("assignee_id", $user->id)
            ->whereHas("project", function ($q) use ($workspace) {
                $q->where("workspace_id", $workspace->id);
            })
            ->whereIn("status", ["backlog", "in_progress", "in_review"])
            ->count();

        // A task is blocked if it's assigned, not done, and has incomplete dependencies
        $tasksBlocked = Task::where("assignee_id", $user->id)
            ->whereHas("project", function ($q) use ($workspace) {
                $q->where("workspace_id", $workspace->id);
            })
            ->where("status", "!=", "done")
            ->whereHas("dependencies", function ($q) {
                $q->where("status", "!=", "done");
            })
            ->count();

        $wikiCount = Wiki::where("user_id", $user->id)
            ->whereHas("project", function ($q) use ($workspace) {
                $q->where("workspace_id", $workspace->id);
            })
            ->count();

        $threadCount = Thread::where("user_id", $user->id)
            ->whereHas("project", function ($q) use ($workspace) {
                $q->where("workspace_id", $workspace->id);
            })
            ->count();

        // Retrieve list of all active assigned tasks for this user in the workspace
        $assignedTasks = Task::where("assignee_id", $user->id)
            ->whereHas("project", function ($q) use ($workspace) {
                $q->where("workspace_id", $workspace->id);
            })
            ->with(["project", "labels"])
            ->orderBy("due_date", "asc")
            ->get();

        return Inertia::render("Workspace/MemberProfile", [
            "workspace" => $workspace,
            "profileUser" => [
                "id" => $user->id,
                "name" => $user->name,
                "email" => $user->email,
                "title" => $user->title,
                "bio" => $user->bio,
                "avatar_path" => $user->avatar_path,
                "recovery_question" => (int) $user->id === (int) Auth::id()
                    ? $user->recovery_question
                    : null,
                "has_recovery_question" => (int) $user->id === (int) Auth::id()
                    && filled($user->recovery_question)
                    && filled($user->recovery_answer),
                "color" => $userColor,
                "joined_at" => $memberPivot->pivot->created_at ? $memberPivot->pivot->created_at->toDateString() : null,
            ],
            "stats" => [
                "completed" => $tasksCompleted,
                "pending" => $tasksPending,
                "blocked" => $tasksBlocked,
                "wikis" => $wikiCount,
                "threads" => $threadCount,
            ],
            "assignedTasks" => $assignedTasks,
        ]);
    }

    /**
     * Update the authenticated user's profile and workspace color.
     */
    public function update(Request $request, Workspace $workspace)
    {
        if (!$workspace->members()->where("users.id", Auth::id())->exists()) {
            abort(403);
        }

        $user = Auth::user();

        $request->validate([
            "name" => "required|string|max:255",
            "title" => "nullable|string|max:255",
            "bio" => "nullable|string|max:1000",
            "color" => "nullable|string|max:7",
            "avatar" => "nullable|image|mimes:jpeg,png,jpg,gif,webp|max:4096",
            "avatar_url" => ["nullable", "url", "max:2048", "regex:/^https:\\/\\//i"],
            "recovery_question" => "nullable|string|min:8|max:255|required_with:recovery_answer",
            "recovery_answer" => "nullable|string|min:3|max:255|required_with:recovery_question",
            "current_password" => "nullable|string",
        ]);

        if ($request->filled("recovery_question") || $request->filled("recovery_answer")) {
            $request->validate([
                "recovery_question" => "required|string|min:8|max:255",
                "recovery_answer" => "required|string|min:3|max:255",
                "current_password" => "required|current_password",
            ]);

            $user->recovery_question = $request->string("recovery_question")->trim()->toString();
            $normalizedAnswer = Str::lower(
                preg_replace('/\s+/', ' ', trim($request->string("recovery_answer")->toString())),
            );
            $user->recovery_answer = Hash::make($normalizedAnswer);
        }

        // Process avatar upload and crop to 1:1 square using GD
        if ($request->hasFile("avatar")) {
            $file = $request->file("avatar");

            // Check if GD extension is loaded
            if (function_exists('imagecreatetruecolor')) {
                $imageInfo = getimagesize($file->getRealPath());

                if ($imageInfo) {
                    $width = $imageInfo[0];
                    $height = $imageInfo[1];
                    $mime = $imageInfo["mime"];

                    // Crop to 1:1 square from the center
                    $size = min($width, $height);
                    $x = ($width - $size) / 2;
                    $y = ($height - $size) / 2;

                    $src = null;
                    if (str_contains($mime, "jpeg") || str_contains($mime, "jpg")) {
                        $src = imagecreatefromjpeg($file->getRealPath());
                    } elseif (str_contains($mime, "png")) {
                        $src = imagecreatefrompng($file->getRealPath());
                    } elseif (str_contains($mime, "gif")) {
                        $src = imagecreatefromgif($file->getRealPath());
                    } elseif (str_contains($mime, "webp")) {
                        $src = @imagecreatefromwebp($file->getRealPath());
                    }

                    if ($src) {
                        // Create target 1:1 truecolor canvas (standardized at 300x300 pixels)
                        $dst = imagecreatetruecolor(300, 300);

                        // Preserve PNG/GIF transparency
                        imagealphablending($dst, false);
                        imagesavealpha($dst, true);

                        // Crop and resample
                        imagecopyresampled($dst, $src, 0, 0, $x, $y, 300, 300, $size, $size);

                        $filename = "avatar_" . $user->id . "_" . uniqid() . ".png";
                        $relativePath = "avatars/" . $filename;
                        Storage::disk("public")->makeDirectory("avatars");

                        // Save into storage/app/public so storage:link can serve it
                        ob_start();
                        imagepng($dst);
                        $pngData = ob_get_clean();
                        Storage::disk("public")->put($relativePath, $pngData);
                        imagedestroy($src);
                        imagedestroy($dst);

                        // Delete old avatar if exists
                        $this->deleteStoredAvatar($user->avatar_path);

                        $user->avatar_path = "/storage/" . $relativePath;
                    }
                }
            } else {
                // GD is missing: just save raw file directly
                $filename = "avatar_" . $user->id . "_" . uniqid() . "." . $file->getClientOriginalExtension();
                $relativePath = "avatars/" . $filename;
                Storage::disk("public")->putFileAs("avatars", $file, $filename);

                $this->deleteStoredAvatar($user->avatar_path);

                $user->avatar_path = "/storage/" . $relativePath;
            }
        } elseif ($request->filled("avatar_url")) {
            $this->deleteStoredAvatar($user->avatar_path);
            $user->avatar_path = $request->string("avatar_url")->trim()->toString();
        }

        // Update fields
        $user->name = $request->name;
        $user->title = $request->title;
        $user->bio = $request->bio;
        $user->save();

        // Update color in the pivot table for this workspace
        if ($request->has("color")) {
            $workspace->members()->updateExistingPivot($user->id, [
                "color" => $request->color,
            ]);
        }

        return redirect()->back();
    }

    private function deleteStoredAvatar(?string $avatarPath): void
    {
        if (!$avatarPath) {
            return;
        }

        if (str_starts_with($avatarPath, "/storage/")) {
            Storage::disk("public")->delete(ltrim(substr($avatarPath, strlen("/storage/")), "/"));
            return;
        }

        if (str_starts_with($avatarPath, "/uploads/") && file_exists(public_path($avatarPath))) {
            @unlink(public_path($avatarPath));
        }
    }
}
