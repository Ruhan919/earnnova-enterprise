<?php

declare(strict_types=1);

namespace App\Domain\User\Events;

use App\Domain\User\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;

class UserRegistered
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly User $user,
    ) {}
}
