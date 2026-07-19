<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\Thread;
use App\Models\User;
use App\Models\Wiki;
use App\Models\Workspace;
use App\Support\AvatarUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProfileController extends Controller
{
    /**
     * Authenticated user's aggregated profile across workspaces.
     */
    public function me(Request $request)
    {
        $user = Auth::user();
        $memberships = $user->workspaces()
            ->orderBy('workspaces.name')
            ->get(['workspaces.id', 'workspaces.name', 'workspaces.slug']);

        $filterSlug = $request->string('workspace')->trim()->toString();
        $filterWorkspace = null;

        if ($filterSlug !== '') {
            $filterWorkspace = $memberships->firstWhere('slug', $filterSlug);
            abort_unless($filterWorkspace, 404, 'Workspace not found in your memberships.');
        }

        $workspaceIds = $filterWorkspace
            ? collect([$filterWorkspace->id])
            : $memberships->pluck('id');

        $userColor = $filterWorkspace
            ? ($filterWorkspace->pivot->color ?? '#8b5e3c')
            : ($memberships->first()?->pivot?->color ?? '#8b5e3c');

        $joinedAt = $filterWorkspace
            ? optional($filterWorkspace->pivot->joined_at ?? $filterWorkspace->pivot->created_at)?->toDateString()
            : optional(
                $memberships
                    ->map(fn (Workspace $ws) => $ws->pivot->joined_at ?? $ws->pivot->created_at)
                    ->filter()
                    ->sort()
                    ->first()
                    ?? $user->created_at
            )?->toDateString();

        return Inertia::render('Workspace/MemberProfile', [
            'workspace' => $filterWorkspace,
            'profileMode' => 'global',
            'profileWorkspaces' => $memberships->map(fn (Workspace $ws) => [
                'id' => $ws->id,
                'name' => $ws->name,
                'slug' => $ws->slug,
            ])->values(),
            'filters' => [
                'workspace' => $filterWorkspace?->slug,
            ],
            'profileUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'title' => $user->title,
                'bio' => $user->bio,
                'avatar_path' => $user->avatar_path,
                'recovery_question' => $user->recovery_question,
                'has_recovery_question' => filled($user->recovery_question) && filled($user->recovery_answer),
                'color' => $userColor,
                'joined_at' => $joinedAt,
            ],
            'stats' => $this->buildStats($user->id, $workspaceIds),
            'assignedTasks' => $this->buildAssignedTasks($user->id, $workspaceIds),
        ]);
    }

    /**
     * Display a workspace member's profile.
     */
    public function show(Workspace $workspace, User $user)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        $memberPivot = $workspace->members()->where('users.id', $user->id)->first();
        if (!$memberPivot) {
            abort(404, 'User is not a member of this workspace.');
        }

        $userColor = $memberPivot->pivot->color ?? '#8b5e3c';
        $isOwn = (int) $user->id === (int) Auth::id();

        return Inertia::render('Workspace/MemberProfile', [
            'workspace' => $workspace,
            'profileMode' => 'workspace',
            'profileWorkspaces' => [],
            'filters' => [
                'workspace' => $workspace->slug,
            ],
            'profileUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'title' => $user->title,
                'bio' => $user->bio,
                'avatar_path' => $user->avatar_path,
                'recovery_question' => $isOwn ? $user->recovery_question : null,
                'has_recovery_question' => $isOwn
                    && filled($user->recovery_question)
                    && filled($user->recovery_answer),
                'color' => $userColor,
                'joined_at' => $memberPivot->pivot->created_at
                    ? $memberPivot->pivot->created_at->toDateString()
                    : null,
            ],
            'stats' => $this->buildStats($user->id, collect([$workspace->id])),
            'assignedTasks' => $this->buildAssignedTasks($user->id, collect([$workspace->id])),
        ]);
    }

    /**
     * Update the authenticated user's global profile (optional workspace color).
     */
    public function updateMe(Request $request)
    {
        $workspace = null;
        $slug = $request->string('workspace_slug')->trim()->toString();
        if ($slug !== '') {
            $workspace = Auth::user()->workspaces()->where('workspaces.slug', $slug)->first();
            abort_unless($workspace, 404);
        }

        return $this->persistProfile($request, $workspace);
    }

    /**
     * Update the authenticated user's profile and workspace color.
     */
    public function update(Request $request, Workspace $workspace)
    {
        if (!$workspace->members()->where('users.id', Auth::id())->exists()) {
            abort(403);
        }

        return $this->persistProfile($request, $workspace);
    }

    private function persistProfile(Request $request, ?Workspace $workspace)
    {
        $user = Auth::user();

        $request->validate([
            'name' => 'required|string|max:255',
            'title' => 'nullable|string|max:255',
            'bio' => 'nullable|string|max:1000',
            'color' => 'nullable|string|max:7',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
            'avatar_url' => AvatarUrl::rules(),
            'recovery_question' => 'nullable|string|min:8|max:255|required_with:recovery_answer',
            'recovery_answer' => 'nullable|string|min:3|max:255|required_with:recovery_question',
            'current_password' => 'nullable|string',
            'workspace_slug' => 'nullable|string',
        ]);

        if ($request->filled('recovery_question') || $request->filled('recovery_answer')) {
            $request->validate([
                'recovery_question' => 'required|string|min:8|max:255',
                'recovery_answer' => 'required|string|min:3|max:255',
                'current_password' => 'required|current_password',
            ]);

            $user->recovery_question = $request->string('recovery_question')->trim()->toString();
            $normalizedAnswer = Str::lower(
                preg_replace('/\s+/', ' ', trim($request->string('recovery_answer')->toString())),
            );
            $user->recovery_answer = Hash::make($normalizedAnswer);
        }

        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');

            if (function_exists('imagecreatetruecolor')) {
                $imageInfo = getimagesize($file->getRealPath());

                if ($imageInfo) {
                    $width = $imageInfo[0];
                    $height = $imageInfo[1];
                    $mime = $imageInfo['mime'];

                    $size = min($width, $height);
                    $x = ($width - $size) / 2;
                    $y = ($height - $size) / 2;

                    $src = null;
                    if (str_contains($mime, 'jpeg') || str_contains($mime, 'jpg')) {
                        $src = imagecreatefromjpeg($file->getRealPath());
                    } elseif (str_contains($mime, 'png')) {
                        $src = imagecreatefrompng($file->getRealPath());
                    } elseif (str_contains($mime, 'gif')) {
                        $src = imagecreatefromgif($file->getRealPath());
                    } elseif (str_contains($mime, 'webp')) {
                        $src = @imagecreatefromwebp($file->getRealPath());
                    }

                    if ($src) {
                        $dst = imagecreatetruecolor(300, 300);
                        imagealphablending($dst, false);
                        imagesavealpha($dst, true);
                        imagecopyresampled($dst, $src, 0, 0, $x, $y, 300, 300, $size, $size);

                        $filename = 'avatar_'.$user->id.'_'.uniqid().'.png';
                        $relativePath = 'avatars/'.$filename;
                        Storage::disk('public')->makeDirectory('avatars');

                        ob_start();
                        imagepng($dst);
                        $pngData = ob_get_clean();
                        Storage::disk('public')->put($relativePath, $pngData);
                        imagedestroy($src);
                        imagedestroy($dst);

                        $this->deleteStoredAvatar($user->avatar_path);
                        $user->avatar_path = '/storage/'.$relativePath;
                    }
                }
            } else {
                $filename = 'avatar_'.$user->id.'_'.uniqid().'.'.$file->getClientOriginalExtension();
                $relativePath = 'avatars/'.$filename;
                Storage::disk('public')->putFileAs('avatars', $file, $filename);
                $this->deleteStoredAvatar($user->avatar_path);
                $user->avatar_path = '/storage/'.$relativePath;
            }
        } elseif ($request->filled('avatar_url')) {
            $avatarUrl = AvatarUrl::validated($request->string('avatar_url')->toString());
            $this->deleteStoredAvatar($user->avatar_path);
            $user->avatar_path = $avatarUrl;
        }

        $user->name = $request->name;
        $user->title = $request->title;
        $user->bio = $request->bio;
        $user->save();

        if ($workspace && $request->has('color')) {
            $workspace->members()->updateExistingPivot($user->id, [
                'color' => $request->color,
            ]);
        }

        return redirect()->back();
    }

    private function buildStats(int $userId, $workspaceIds): array
    {
        $ids = collect($workspaceIds)->filter()->values();

        if ($ids->isEmpty()) {
            return [
                'completed' => 0,
                'pending' => 0,
                'blocked' => 0,
                'wikis' => 0,
                'threads' => 0,
            ];
        }

        $inWorkspace = fn ($q) => $q->whereIn('workspace_id', $ids);

        return [
            'completed' => Task::where('assignee_id', $userId)
                ->whereHas('project', $inWorkspace)
                ->where('status', 'done')
                ->count(),
            'pending' => Task::where('assignee_id', $userId)
                ->whereHas('project', $inWorkspace)
                ->whereIn('status', ['backlog', 'in_progress', 'in_review'])
                ->count(),
            'blocked' => Task::where('assignee_id', $userId)
                ->whereHas('project', $inWorkspace)
                ->where('status', '!=', 'done')
                ->whereHas('dependencies', fn ($q) => $q->where('status', '!=', 'done'))
                ->count(),
            'wikis' => Wiki::where('user_id', $userId)
                ->whereHas('project', $inWorkspace)
                ->count(),
            'threads' => Thread::where('user_id', $userId)
                ->whereHas('project', $inWorkspace)
                ->count(),
        ];
    }

    private function buildAssignedTasks(int $userId, $workspaceIds)
    {
        $ids = collect($workspaceIds)->filter()->values();

        if ($ids->isEmpty()) {
            return collect();
        }

        return Task::where('assignee_id', $userId)
            ->whereHas('project', fn ($q) => $q->whereIn('workspace_id', $ids))
            ->with(['project.workspace', 'labels'])
            ->orderBy('due_date', 'asc')
            ->get();
    }

    private function deleteStoredAvatar(?string $avatarPath): void
    {
        if (!$avatarPath) {
            return;
        }

        if (str_starts_with($avatarPath, '/storage/')) {
            Storage::disk('public')->delete(ltrim(substr($avatarPath, strlen('/storage/')), '/'));
            return;
        }

        if (str_starts_with($avatarPath, '/uploads/') && file_exists(public_path($avatarPath))) {
            @unlink(public_path($avatarPath));
        }
    }
}
