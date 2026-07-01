<?php

declare(strict_types=1);

namespace App\Infrastructure\Services\AI;

use App\Domain\User\Models\User;
use App\Domain\Withdrawal\Models\Withdrawal;

class FraudDetectionService
{
    public function analyzeRegistration(User $user): float
    {
        $score = 0.0;

        // Check for disposable email
        if ($this->isDisposableEmail($user->email)) {
            $score += 0.5;
        }

        // Check for rapid registration (same IP)
        // In production: query recent registrations from same IP

        return $score;
    }

    public function analyzeWithdrawal(Withdrawal $withdrawal): float
    {
        $user = $withdrawal->user;
        $score = 0.0;

        // New accounts withdrawing immediately
        if ($user->created_at->diffInHours(now()) < 24) {
            $score += 0.3;
        }

        // Withdrawing > 80% of balance
        if ($withdrawal->amount_cents > $user->total_earned_cents * 0.8) {
            $score += 0.2;
        }

        // Multiple pending withdrawals
        if ($user->withdrawals()->where('status', 'pending')->count() > 3) {
            $score += 0.25;
        }

        // Amount significantly higher than average
        $avgWithdrawal = $user->withdrawals()->avg('amount_cents') ?? 0;
        if ($avgWithdrawal > 0 && $withdrawal->amount_cents > $avgWithdrawal * 3) {
            $score += 0.15;
        }

        return min($score, 1.0);
    }

    private function isDisposableEmail(string $email): bool
    {
        $domains = [
            'mailinator.com', 'guerrillamail.com', 'tempmail.com',
            '10minutemail.com', 'throwaway.email', 'trashmail.com',
            'yopmail.com',
        ];
        $domain = explode('@', $email)[1] ?? '';
        return in_array($domain, $domains, true);
    }
}
