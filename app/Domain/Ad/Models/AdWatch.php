<?php

declare(strict_types=1);

namespace App\Domain\Ad\Models;

use App\Domain\User\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdWatch extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'ad_id',
        'reward_cents',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ad(): BelongsTo
    {
        return $this->belongsTo(Ad::class);
    }
}
