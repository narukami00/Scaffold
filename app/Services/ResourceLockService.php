<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class ResourceLockService
{
    private const TTL_MINUTES = 30;

    public function key(string $type, int $id): string
    {
        return "resource-lock:{$type}:{$id}";
    }

    public function holder(string $type, int $id): ?int
    {
        $userId = Cache::get($this->key($type, $id));

        return $userId !== null ? (int) $userId : null;
    }

    public function acquire(string $type, int $id, int $userId): bool
    {
        $key = $this->key($type, $id);
        $current = $this->holder($type, $id);

        if ($current !== null && $current !== $userId) {
            return false;
        }

        Cache::put($key, $userId, now()->addMinutes(self::TTL_MINUTES));

        return true;
    }

    public function release(string $type, int $id, int $userId): bool
    {
        $key = $this->key($type, $id);
        $current = $this->holder($type, $id);

        if ($current === null) {
            return true;
        }

        if ($current !== $userId) {
            return false;
        }

        Cache::forget($key);

        return true;
    }

    public function isLockedByOther(string $type, int $id, int $userId): bool
    {
        $holder = $this->holder($type, $id);

        return $holder !== null && $holder !== $userId;
    }

    public function forceRelease(string $type, int $id): void
    {
        Cache::forget($this->key($type, $id));
    }
}
