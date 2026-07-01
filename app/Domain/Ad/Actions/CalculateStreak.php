<?php

declare(strict_types=1);

namespace App\Domain\Ad\Actions;

use App\Domain\Ad\Models\AdWatch;
use App\Domain\User\Models\User;

class CalculateStreak
{
    public function execute(User $user): void
    {
        $dates = AdWatch::where('user_id', $user->id)
            ->selectRaw('DATE(created_at) as date')
            ->distinct()
            ->orderBy('date', 'desc')
            ->take(7)
            ->pluck('date')
            ->toArray();

        $streak = 0;
        $check = now()->toDateString();

        foreach ($dates as $date) {
            if ($date === $check) {
                $streak++;
                $check = now()->subDays($streak)->toDateString();
            } else {
                break;
            }
        }

        if ($user->streak !== $streak) {
            $user->update(['streak' => $streak]);
        }
    }
}
