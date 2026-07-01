<?php

declare(strict_types=1);

namespace App\Domain\Ad\Actions;

use App\Domain\Ad\Exceptions\CooldownActiveException;
use App\Domain\Ad\Exceptions\DailyLimitExceededException;
use App\Domain\Ad\Models\Ad;
use App\Domain\Ad\Models\AdWatch;
use App\Domain\Transaction\Models\Transaction;
use App\Domain\User\Models\User;
use App\Infrastructure\Services\AI\RecommendationEngine;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class WatchAd
{
    public function __construct(
        private CalculateStreak $streakCalculator,
        private RecommendationEngine $ai,
    ) {}

    public function execute(User $user, Ad $ad): AdWatch
    {
        // Validate daily limit (cached)
        $dailyCount = Cache::tags(['users', 'ads'])->remember(
            "user:{$user->id}:ads_today:" . now()->toDateString(),
            3600,
            fn () => AdWatch::where('user_id', $user->id)
                ->whereDate('created_at', today())->count()
        );

        throw_if(
            $dailyCount >= config('domain.ads.daily_limit', 30),
            DailyLimitExceededException::class,
        );

        // Validate cooldown
        $lastWatch = AdWatch::where('user_id', $user->id)->latest()->first();
        throw_if(
            $lastWatch && $lastWatch->created_at->diffInMinutes(now()) < config('domain.ads.cooldown_minutes', 10),
            CooldownActiveException::class,
        );

        // Atomic watch with distributed lock
        $lock = Cache::lock("watch_ad:{$user->id}", 5);

        try {
            $lock->block(5);

            return DB::transaction(function () use ($user, $ad, $dailyCount) {
                $watch = AdWatch::create([
                    'user_id' => $user->id,
                    'ad_id' => $ad->id,
                    'reward_cents' => $ad->reward_cents,
                ]);

                $user->increment('balance_cents', $ad->reward_cents);
                $user->increment('total_earned_cents', $ad->reward_cents);
                $user->increment('ads_watched');
                $user->update([
                    'last_active_at' => now(),
                    'today_ads' => $dailyCount + 1,
                    'last_ad_date' => now()->toDateString(),
                ]);

                Transaction::create([
                    'user_id' => $user->id,
                    'type' => Transaction::TYPE_AD_REWARD,
                    'amount_cents' => $ad->reward_cents,
                    'status' => Transaction::STATUS_COMPLETED,
                    'description' => "Watched: {$ad->title}",
                ]);

                $this->streakCalculator->execute($user);

                Cache::tags(['users', 'finances', 'ads'])->forget("user:{$user->id}");
                Cache::tags(['users', 'ads'])->forget("user:{$user->id}:ads_today:" . now()->toDateString());

                $this->ai->trackPreference($user->id, $ad->id, 'watched');

                return $watch;
            });
        } finally {
            $lock->release();
        }
    }
}
