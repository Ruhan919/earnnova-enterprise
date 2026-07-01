<?php

declare(strict_types=1);

namespace App\Domain\Transaction\Models;

use App\Domain\User\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasUuids;

    public const TYPE_AD_REWARD = 'ad_reward';
    public const TYPE_WITHDRAWAL = 'withdrawal';
    public const TYPE_REFERRAL_BONUS = 'referral_bonus';
    public const TYPE_MILESTONE_BONUS = 'milestone_bonus';

    public const STATUS_PENDING = 'pending';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'user_id',
        'type',
        'amount_cents',
        'status',
        'description',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function amountInDollars(): float
    {
        return $this->amount_cents / 100;
    }

    public function isCredit(): bool
    {
        return $this->amount_cents > 0;
    }

    public function isDebit(): bool
    {
        return $this->amount_cents < 0;
    }
}
