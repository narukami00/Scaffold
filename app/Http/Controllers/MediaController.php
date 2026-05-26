<?php

namespace App\Http\Controllers;

use App\Models\Media;
use App\Models\Workspace;
use Illuminate\Http\Request;

class MediaController extends Controller
{
    /**
     * Upload a new media file (used primarily for Markdown inline image drops).
     */
    public function upload(Request $request, Workspace $workspace)
    {
        // Security check, must be workspace member or owner
        if ((int)$workspace->owner_id !== (int)$request->user()->id && !$request->user()->workspaces()->where('workspaces.id', $workspace->id)->exists()) {
            abort(403);
        }

        $request->validate([
            'image' => 'required|image|max:10240', // 10MB max
        ]);

        $file = $request->file('image');
        // Store in a generic uploads directory segmented by workspace
        $path = $file->store("workspaces/{$workspace->id}/media", 'public');

        $media = Media::create([
            'user_id' => $request->user()->id,
            // mediable_id and type remain null until explicitly attached
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
        ]);

        return response()->json([
            'url' => asset('storage/' . $path),
            'media_id' => $media->id,
        ]);
    }
}
