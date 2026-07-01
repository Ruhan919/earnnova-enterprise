<?php

declare(strict_types=1);

namespace App\Domain\Withdrawal\Actions;

use App\Domain\Withdrawal\Enums\WithdrawalStatus;
use App\Domain\Withdrawal\Models\Withdrawal;
use App\Domain\Transaction\Models\Transaction;
use App\Domain\User\Models\User;
use App\Infrastructure\Services\AI\FraudDetectionService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ApproveWithdrawal
{
    public function __construct(
        private FraudDetectionService $fraudAI,
    ) {}

    public function execute(Withdrawal $withdrawal, User $admin): void
    {
        $fraudScore = $this->fraudAI->analyzeWithdrawal($withdrawal);

        DB::transaction(function () use ($withdrawal, $admin, $fraudScore) {
            if ($fraudScore > 0.85) {
                $withdrawal->update([
                    'status' => WithdrawalStatus::REJECTED,
                    'approved_by' => $admin->id,
                    'rejected_at' => now(),
                    'notes' => "Flagged by AI fraud detection (score: {$fraudScore})",
                ]);

                $withdrawal->user->increment('balance_cents', $withdrawal->amount_cents);

                Transaction::create([
                    'user_id' => $withdrawal->user_id,
                    'type' => Transaction::TYPE_WITHDRAWAL,
                    'amount_cents' => $withdrawal->amount_cents,
                    'status' => Transaction::STATUS_FAILED,
                    'description' => "Withdrawal rejected (fraud flag)",
                ]);
            } else {
                $withdrawal->update([
                    'status' => WithdrawalStatus::APPROVED,
                    'approved_by' => $admin->id,
                ]);
            }

            Cache::tags(['users', 'finances'])->forget("user:{$withdrawal->user_id}");
        });
    }
}
