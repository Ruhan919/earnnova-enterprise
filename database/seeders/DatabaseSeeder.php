<?php

namespace Database\Seeders;

use App\Domain\Ad\Models\Ad;
use App\Domain\System\Models\SystemConfig;
use App\Domain\User\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user
        User::create([
            'name' => 'Admin',
            'email' => 'owner@nova.com',
            'password' => Hash::make('OWNERNOVA'),
            'referral_code' => 'ADMIN001',
            'balance_cents' => 100000,
            'total_earned_cents' => 500000,
            'total_withdrawn_cents' => 400000,
            'ads_watched' => 150,
            'is_active' => true,
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);

        // Sample ads
        $ads = [
            ['title' => 'Premium Ad Slot 1', 'reward_cents' => 10, 'duration_seconds' => 10],
            ['title' => 'Quick Ad', 'reward_cents' => 5, 'duration_seconds' => 5],
            ['title' => 'Featured Promotion', 'reward_cents' => 15, 'duration_seconds' => 15],
            ['title' => 'Standard Ad', 'reward_cents' => 3, 'duration_seconds' => 5],
            ['title' => 'Bonus Video', 'reward_cents' => 20, 'duration_seconds' => 20],
        ];

        foreach ($ads as $ad) {
            Ad::create($ad);
        }

        // System config
        SystemConfig::create([
            'min_withdrawal_cents' => 500,
            'daily_ad_limit' => 30,
            'ad_cooldown_minutes' => 10,
            'referral_bonus_cents' => 50,
            'admin_email' => 'owner@nova.com',
        ]);

        $this->command->info('✅ Database seeded: Admin user, ads, and system config created!');
        $this->command->info('   Admin login: owner@nova.com / OWNERNOVA');
    }
}
