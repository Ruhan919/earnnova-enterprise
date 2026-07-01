<?php

declare(strict_types=1);

namespace App\Domain\Withdrawal\Models;

use App\Domain\User\Models\User;
use App\Domain\Withdrawal\Enums\WithdrawalStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Withdrawal extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'user_email',
        'user_name',
        'method',
        'amount_cents',
        'details',
        'status',
        'approved_by',
        'rejected_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'rejected_at' => 'datetime',
            'status' => WithdrawalStatus::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function amountInDollars(): float
    {
        return $this->amount_cents / 100;
    }

    public function isPending(): bool
    {
        return $this->status === WithdrawalStatus::PENDING;
    }

    public function isApproved(): bool
    {
        return $this->status === WithdrawalStatus::APPROVED;
    }

    public function isRejected(): bool
    {
        return $this->status === WithdrawalStatus::REJECTED;
    }
}
