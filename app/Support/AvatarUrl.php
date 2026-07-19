<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class AvatarUrl
{
    /**
     * Normalize and validate a pasted avatar URL.
     * Accepts direct HTTPS image links, and extracts imgurl from Google Images pages.
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

                $path = parse_url($normalized, PHP_URL_PATH) ?: '';
                if (! preg_match('/\\.(png|jpe?g|gif|webp|avif)$/i', $path)) {
                    $fail('Paste a direct image link (URL ending in .jpg, .png, .gif, or .webp). From Google Images: open the image, then use “Copy image address”.');
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

        $path = parse_url($normalized, PHP_URL_PATH) ?: '';
        if (! preg_match('/\\.(png|jpe?g|gif|webp|avif)$/i', $path)) {
            throw ValidationException::withMessages([
                'avatar_url' => 'Paste a direct image link (URL ending in .jpg, .png, .gif, or .webp). From Google Images: open the image, then use “Copy image address”.',
            ]);
        }

        return $normalized;
    }
}
