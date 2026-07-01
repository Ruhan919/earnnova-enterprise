<?php

declare(strict_types=1);

namespace App\Domain\Ad\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ad extends Model
{
    protected $fillable = [
        'title',
        'reward_cents',
        'duration_seconds',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function rewardInDollars(): float
    {
        return $this->reward_cents / 100;
    }

    public function watches(): HasMany
    {
        return $this->hasMany(AdWatch::class);
    }
}
