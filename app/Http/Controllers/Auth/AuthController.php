<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AvatarUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showRegister()
    {
        if (Auth::check()) {
            return redirect()->route("workspaces.index");
        }

        return Inertia::render("Auth/Register");
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            "name" => "required|string|max:255",
            "email" => "required|string|email|max:255|unique:users",
            "password" => "required|string|confirmed|min:8",
            "title" => "nullable|string|max:255",
            "bio" => "nullable|string|max:1000",
            "avatar" => "nullable|image|mimes:jpeg,png,jpg,gif,webp|max:4096",
            "avatar_url" => AvatarUrl::rules(),
            "recovery_question" => "nullable|string|min:8|max:255|required_with:recovery_answer",
            "recovery_answer" => "nullable|string|min:3|max:255|required_with:recovery_question",
        ]);

        $avatarUrl = AvatarUrl::validated($validated["avatar_url"] ?? null);

        $user = User::create([
            "name" => $validated["name"],
            "email" => $validated["email"],
            "password" => $validated["password"],
            "title" => $validated["title"] ?? null,
            "bio" => $validated["bio"] ?? null,
            "avatar_path" => $avatarUrl,
            "recovery_question" => $validated["recovery_question"] ?? null,
            "recovery_answer" => isset($validated["recovery_answer"])
                ? Hash::make($this->normalizeRecoveryAnswer($validated["recovery_answer"]))
                : null,
        ]);

        if ($request->hasFile("avatar")) {
            $file = $request->file("avatar");

            if (function_exists('imagecreatetruecolor')) {
                $imageInfo = getimagesize($file->getRealPath());

                if ($imageInfo) {
                    $width = $imageInfo[0];
                    $height = $imageInfo[1];
                    $mime = $imageInfo["mime"];

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
                        $dst = imagecreatetruecolor(300, 300);
                        imagealphablending($dst, false);
                        imagesavealpha($dst, true);
                        imagecopyresampled($dst, $src, 0, 0, $x, $y, 300, 300, $size, $size);

                        $filename = "avatar_" . $user->id . "_" . uniqid() . ".png";
                        $relativePath = "avatars/" . $filename;
                        Storage::disk("public")->makeDirectory("avatars");

                        ob_start();
                        imagepng($dst);
                        $pngData = ob_get_clean();
                        Storage::disk("public")->put($relativePath, $pngData);
                        imagedestroy($src);
                        imagedestroy($dst);

                        $user->avatar_path = "/storage/" . $relativePath;
                        $user->save();
                    }
                }
            } else {
                $filename = "avatar_" . $user->id . "_" . uniqid() . "." . $file->getClientOriginalExtension();
                Storage::disk("public")->putFileAs("avatars", $file, $filename);

                $user->avatar_path = "/storage/avatars/" . $filename;
                $user->save();
            }
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route("workspaces.index");
    }

    public function showLogin()
    {
        if (Auth::check()) {
            return redirect()->route("workspaces.index");
        }

        return Inertia::render("Auth/Login");
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            "email" => "required|string|email",
            "password" => "required|string",
        ]);

        if (Auth::attempt($credentials, $request->boolean("remember"))) {
            $request->session()->regenerate();

            return redirect()->route("workspaces.index");
        }

        return back()->withErrors([
            "email" => "The provided credentials do not match our records.",
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route("login");
    }

    private function normalizeRecoveryAnswer(string $answer): string
    {
        return Str::lower(preg_replace('/\s+/', ' ', trim($answer)));
    }
}
