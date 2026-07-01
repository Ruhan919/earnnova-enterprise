<?php

declare(strict_types=1);

namespace App\Domain\User\Listeners;

use App\Domain\Notification\Models\Notification;
use App\Domain\User\Events\UserRegistered;

class SendWelcomeNotification
{
    public function handle(UserRegistered $event): void
    {
        Notification::create([
            'user_id' => $event->user->id,
            'title' => 'Welcome to EARNNOVA! 🎉',
            'message' => 'Start watching ads and earning rewards today. Check out the Earn page to begin!',
            'type' => 'success',
        ]);
    }
}
