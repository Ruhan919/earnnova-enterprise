<?php

declare(strict_types=1);

namespace App\Infrastructure\Services\AI;

use App\Domain\Ad\Models\Ad;
use Illuminate\Support\Facades\Cache;

class RecommendationEngine
{
    public function recommendForUser(string $userId, int $limit = 5): array
    {
        return Cache::tags(['ai', 'ads'])->remember(
            "ai:recs:{$userId}",
            3600,
            function () use ($userId, $limit) {
                return Ad::where('is_active', true)
                    ->inRandomOrder()
                    ->take($limit)
                    ->get()
                    ->toArray();
            }
        );
    }

    public function trackPreference(string $userId, int $adId, string $action): void
    {
        Cache::tags(['ai'])->forget("ai:recs:{$userId}");
    }
}
