<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

trait HasMFA
{
    public function enableMFA(string $secret): void
    {
        $this->update([
            'has_mfa_enabled' => true,
            'mfa_secret' => $secret,
        ]);
    }

    public function disableMFA(): void
    {
        $this->update([
            'has_mfa_enabled' => false,
            'mfa_secret' => null,
        ]);
    }

    public function hasMFAEnabled(): bool
    {
        return (bool) $this->has_mfa_enabled;
    }
}
