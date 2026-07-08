<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        ]);

        $user = User::create([
            "name" => $validated["name"],
            "email" => $validated["email"],
            "password" => $validated["password"],
            "title" => $validated["title"] ?? null,
            "bio" => $validated["bio"] ?? null,
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
                        $uploadDir = public_path("uploads/avatars");
                        if (!file_exists($uploadDir)) {
                            mkdir($uploadDir, 0755, true);
                        }

                        imagepng($dst, $uploadDir . "/" . $filename);
                        imagedestroy($src);
                        imagedestroy($dst);

                        $user->avatar_path = "/uploads/avatars/" . $filename;
                        $user->save();
                    }
                }
            } else {
                $filename = "avatar_" . $user->id . "_" . uniqid() . "." . $file->getClientOriginalExtension();
                $uploadDir = public_path("uploads/avatars");
                if (!file_exists($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                $file->move($uploadDir, $filename);

                $user->avatar_path = "/uploads/avatars/" . $filename;
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
}
