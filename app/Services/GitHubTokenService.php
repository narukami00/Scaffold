<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GitHubTokenService
{
    /**
     * Generate a signed JWT to authenticate as the GitHub App.
     */
    public function generateAppJwt(): string
    {
        $appId = config('services.github.app_id');
        $privateKeySource = config('services.github.private_key');

        if (!$appId || !$privateKeySource) {
            throw new \Exception('GitHub App ID or Private Key is not configured.');
        }

        // Support both direct PEM content and a file path
        if (str_starts_with(trim($privateKeySource), '-----BEGIN')) {
            $privateKey = $privateKeySource;
        } else {
            $path = base_path($privateKeySource);
            if (!file_exists($path)) {
                $path = $privateKeySource; // Try absolute path
            }
            if (!file_exists($path)) {
                throw new \Exception("GitHub Private Key file not found at: {$privateKeySource}");
            }
            $privateKey = file_get_contents($path);
        }

        $now = time();
        $payload = [
            'iat' => $now - 60,         // backdate 60 seconds to prevent clock drift issues
            'exp' => $now + (10 * 60),  // maximum 10 minutes lifetime
            'iss' => (int)$appId,       // GitHub App ID
        ];

        return JWT::encode($payload, $privateKey, 'RS256');
    }

    /**
     * Exchange the App JWT for a temporary Installation Access Token (cached for 55 minutes).
     */
    public function getInstallationToken(int $installationId): string
    {
        $cacheKey = "github_token_installation_{$installationId}";

        return Cache::remember($cacheKey, now()->addMinutes(55), function () use ($installationId) {
            $jwt = $this->generateAppJwt();

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$jwt}",
                'Accept' => 'application/vnd.github+json',
                'X-GitHub-Api-Version' => '2022-11-28',
            ])->post("https://api.github.com/app/installations/{$installationId}/access_tokens");

            if ($response->failed()) {
                Log::error("Failed to generate GitHub Installation Access Token: " . $response->body());
                throw new \Exception("Failed to authenticate with GitHub App installation: " . $response->body());
            }

            return $response->json()['token'];
        });
    }

    /**
     * Evict the cached token in case of 401 response and force a fresh retrieval.
     */
    public function clearInstallationToken(int $installationId): void
    {
        Cache::forget("github_token_installation_{$installationId}");
    }
}
