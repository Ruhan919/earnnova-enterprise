<?php

declare(strict_types=1);

namespace App\Domain\User\Models;

use App\Domain\Ad\Models\AdWatch;
use App\Domain\Notification\Models\Notification;
use App\Domain\Referral\Models\Referral;
use App\Domain\Transaction\Models\Transaction;
use App\Domain\Withdrawal\Models\Withdrawal;
use App\Infrastructure\Auth\HasMFA;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use HasMFA;
    use HasUuids;
    use LogsActivity;
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'photo_url',
        'balance_cents',
        'total_earned_cents',
        'total_withdrawn_cents',
        'ads_watched',
        'today_ads',
        'last_ad_date',
        'referral_code',
        'referred_by',
        'streak',
        'last_active_at',
        'is_active',
        'is_admin',
        'has_mfa_enabled',
        'mfa_secret',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_active_at' => 'datetime',
            'last_ad_date' => 'date',
            'is_active' => 'boolean',
            'is_admin' => 'boolean',
            'has_mfa_enabled' => 'boolean',
            'password' => 'hashed',
        ];
    }

    // === Helpers ===

    public function balanceInDollars(): float
    {
        return $this->balance_cents / 100;
    }

    public function getReferralUrl(): string
    {
        return config('app.url') . '/register?ref=' . $this->referral_code;
    }

    public function isBanned(): bool
    {
        return !$this->is_active;
    }

    public function hasReachedDailyAdLimit(): bool
    {
        return $this->today_ads >= config('domain.ads.daily_limit');
    }

    // === Relations ===

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function referrals(): HasMany
    {
        return $this->hasMany(Referral::class, 'referrer_id');
    }

    public function withdrawals(): HasMany
    {
        return $this->hasMany(Withdrawal::class);
    }

    public function adWatches(): HasMany
    {
        return $this->hasMany(AdWatch::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    // === Activity Log ===

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['balance_cents', 'today_ads', 'streak', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    // === Factory ===

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }
}
