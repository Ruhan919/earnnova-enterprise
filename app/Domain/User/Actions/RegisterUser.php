<?php

declare(strict_types=1);

namespace App\Domain\User\Actions;

use App\Domain\Referral\Models\Referral;
use App\Domain\User\DataTransferObjects\UserDTO;
use App\Domain\User\Events\UserRegistered;
use App\Domain\User\Models\User;
use App\Infrastructure\Services\AI\FraudDetectionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RegisterUser
{
    public function __construct(
        private FraudDetectionService $fraudAI,
    ) {}

    public function execute(UserDTO $dto): User
    {
        return DB::transaction(function () use ($dto) {
            $referralCode = strtoupper(Str::random(8));
            $isAdmin = $dto->email === config('domain.security.admin_email', 'owner@nova.com');

            $user = User::create([
                'name' => $dto->name,
                'email' => $dto->email,
                'password' => Hash::make($dto->password),
                'referral_code' => $referralCode,
                'is_admin' => $isAdmin,
            ]);

            // Process referral if provided
            if ($dto->referralCode) {
                $referrer = User::where('referral_code', $dto->referralCode)->first();
                if ($referrer && $referrer->id !== $user->id) {
                    $bonusCents = config('domain.referrals.bonus_cents', 50);

                    $referrer->increment('balance_cents', $bonusCents);
                    $referrer->increment('total_earned_cents', $bonusCents);

                    Referral::create([
                        'referrer_id' => $referrer->id,
                        'referred_id' => $user->id,
                        'referred_name' => $user->name,
                        'bonus_cents' => $bonusCents,
                    ]);

                    $user->update(['referred_by' => $referrer->id]);
                }
            }

            // AI: Check for fraudulent registration patterns
            $this->fraudAI->analyzeRegistration($user);

            event(new UserRegistered($user));

            return $user;
        });
    }
}
