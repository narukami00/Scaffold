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

        // Prefer extensions over mimes: SQL dumps are often sniffed as octet-stream.
        $request->validate([
            'image' => [
                'required',
                'file',
                'max:10240',
                'extensions:jpg,jpeg,png,gif,webp,txt,text,md,markdown,json,js,ts,py,rs,go,c,cpp,h,hpp,cs,java,sh,bat,html,css,pdf,xml,yaml,yml,sql',
            ],
        ]);

        $file = $request->file('image');
        // Store in a generic uploads directory segmented by workspace
        $path = $file->store("workspaces/{$workspace->id}/media", 'public');

        $media = Media::create([
            'user_id' => $request->user()->id,
            // mediable_id and type remain null until explicitly attached
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $file->getClientMimeType() ?: $file->getClientOriginalExtension(),
            'file_size' => $file->getSize(),
        ]);

        return response()->json([
            'url' => asset('storage/' . $path),
            'media_id' => $media->id,
        ]);
    }
}
