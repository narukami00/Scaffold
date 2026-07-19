<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class AvatarUrl
{
    /**
     * Normalize and validate a pasted avatar URL.
     * Accepts direct HTTPS image links, Google thumbnail CDNs, and extracts
     * imgurl from Google Images "imgres" pages.
     */
    public static function normalize(?string $url): ?string
    {
        if ($url === null) {
            return null;
        }

        $url = trim($url);
        if ($url === '') {
            return null;
        }

        $parts = parse_url($url);
        $host = strtolower($parts['host'] ?? '');
        $path = $parts['path'] ?? '';

        // Google Images "imgres" pages are not image URLs — pull the real image out.
        if (
            ($host === 'google.com' || str_ends_with($host, '.google.com'))
            && str_contains($path, 'imgres')
        ) {
            parse_str($parts['query'] ?? '', $query);
            if (! empty($query['imgurl']) && is_string($query['imgurl'])) {
                $url = trim($query['imgurl']);
            }
        }

        return $url;
    }

    public static function isLikelyImageUrl(string $url): bool
    {
        if (! preg_match('/^https:\\/\\//i', $url)) {
            return false;
        }

        $parts = parse_url($url);
        if ($parts === false) {
            return false;
        }

        $host = strtolower($parts['host'] ?? '');
        $path = $parts['path'] ?? '';

        // Standard direct file links: .../photo.jpg?token=...
        if (preg_match('/\\.(png|jpe?g|gif|webp|avif)$/i', $path)) {
            return true;
        }

        // Google Images result thumbnails (Copy image address)
        // e.g. https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9Gc...&s=10
        if (
            str_ends_with($host, '.gstatic.com')
            && (str_starts_with($path, '/images') || $path === '/images')
        ) {
            return true;
        }

        // Google-hosted user content / photos CDN
        if (
            str_ends_with($host, '.googleusercontent.com')
            || $host === 'googleusercontent.com'
        ) {
            return true;
        }

        return false;
    }

    public static function rules(): array
    {
        return [
            'nullable',
            'string',
            'max:2048',
            'url',
            'regex:/^https:\\/\\//i',
            function (string $attribute, mixed $value, \Closure $fail) {
                $normalized = self::normalize(is_string($value) ? $value : null);
                if ($normalized === null) {
                    return;
                }

                if (! preg_match('/^https:\\/\\//i', $normalized)) {
                    $fail('Avatar URL must start with https://.');

                    return;
                }

                if (strlen($normalized) > 2048) {
                    $fail('Avatar URL is too long. Use a direct image link instead.');

                    return;
                }

                if (! self::isLikelyImageUrl($normalized)) {
                    $fail('Paste an image address (Google “Copy image address”, or a link ending in .jpg/.png/.webp).');
                }
            },
        ];
    }

    public static function validated(?string $url): ?string
    {
        $normalized = self::normalize($url);
        if ($normalized === null) {
            return null;
        }

        if (! preg_match('/^https:\\/\\//i', $normalized)) {
            throw ValidationException::withMessages([
                'avatar_url' => 'Avatar URL must start with https://.',
            ]);
        }

        if (strlen($normalized) > 2048) {
            throw ValidationException::withMessages([
                'avatar_url' => 'Avatar URL is too long. Use a direct image link instead.',
            ]);
        }

        if (! self::isLikelyImageUrl($normalized)) {
            throw ValidationException::withMessages([
                'avatar_url' => 'Paste an image address (Google “Copy image address”, or a link ending in .jpg/.png/.webp).',
            ]);
        }

        return $normalized;
    }
}
