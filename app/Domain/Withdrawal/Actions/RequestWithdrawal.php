<?php

declare(strict_types=1);

namespace App\Domain\Withdrawal\Actions;

use App\Domain\Transaction\Models\Transaction;
use App\Domain\Withdrawal\Enums\WithdrawalStatus;
use App\Domain\Withdrawal\Models\Withdrawal;
use App\Domain\User\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RequestWithdrawal
{
    public function execute(User $user, string $method, int $amountCents, array $details): Withdrawal
    {
        $minCents = config('domain.withdrawals.min_amount_cents', 500);
        $maxCents = config('domain.withdrawals.max_amount_cents', 100000);

        throw_if($amountCents < $minCents, ValidationException::withMessages([
            'amount' => "Minimum withdrawal is $" . number_format($minCents / 100, 2),
        ]));

        throw_if($amountCents > $user->balance_cents, ValidationException::withMessages([
            'amount' => 'Insufficient balance.',
        ]));

        throw_if($amountCents > $maxCents, ValidationException::withMessages([
            'amount' => "Maximum withdrawal is $" . number_format($maxCents / 100, 2),
        ]));

        return DB::transaction(function () use ($user, $method, $amountCents, $details) {
            $withdrawal = Withdrawal::create([
                'user_id' => $user->id,
                'user_email' => $user->email,
                'user_name' => $user->name,
                'method' => $method,
                'amount_cents' => $amountCents,
                'details' => $details,
                'status' => WithdrawalStatus::PENDING,
            ]);

            $user->decrement('balance_cents', $amountCents);
            $user->increment('total_withdrawn_cents', $amountCents);

            Transaction::create([
                'user_id' => $user->id,
                'type' => Transaction::TYPE_WITHDRAWAL,
                'amount_cents' => -$amountCents,
                'status' => Transaction::STATUS_PENDING,
                'description' => "Withdrawal via " . strtoupper($method),
            ]);

            Cache::tags(['users', 'finances'])->forget("user:{$user->id}");

            return $withdrawal;
        });
    }
}
