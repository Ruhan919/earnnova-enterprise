<?php

declare(strict_types=1);

namespace App\Domain\User\DataTransferObjects;

class UserDTO
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $password,
        public readonly ?string $referralCode = null,
    ) {}

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'email' => $this->email,
            'password' => $this->password,
            'referral_code' => $this->referralCode,
        ];
    }
}
