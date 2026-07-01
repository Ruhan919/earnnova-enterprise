#!/bin/bash
# EARNNOVA Enterprise — Full Application Generator
set -e

echo "🚀 Building EARNNOVA Enterprise Application..."
echo ""

# =============================================
# 1. DATABASE MIGRATIONS
# =============================================
echo "📦 Creating migrations..."

cat > database/migrations/0001_01_01_000001_create_users_table.php << 'MIGRATIONS'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email', 191)->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('phone', 20)->nullable();
            $table->string('photo_url')->nullable();
            $table->bigInteger('balance_cents')->default(0);
            $table->bigInteger('total_earned_cents')->default(0);
            $table->bigInteger('total_withdrawn_cents')->default(0);
            $table->integer('ads_watched')->default(0);
            $table->integer('today_ads')->default(0);
            $table->date('last_ad_date')->nullable();
            $table->string('referral_code', 10)->unique();
            $table->uuid('referred_by')->nullable();
            $table->integer('streak')->default(0);
            $table->timestamp('last_active_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_admin')->default(false);
            $table->boolean('has_mfa_enabled')->default(false);
            $table->string('mfa_secret')->nullable();
            $table->string('plan_id')->nullable();
            $table->timestamp('plan_expiry')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->index(['referral_code', 'is_active']);
            $table->index(['created_at', 'is_admin']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('referred_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
MIGRATIONS

cat > database/migrations/0001_01_01_000002_create_ads_tables.php << 'MIGRATIONS'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ads', function (Blueprint $table) {
            $table->id();
            $table->string('title', 100);
            $table->integer('reward_cents');
            $table->integer('duration_seconds')->default(5);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('ad_watches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreignId('ad_id')->constrained()->cascadeOnDelete();
            $table->integer('reward_cents');
            $table->timestamp('created_at')->index();
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('type', 50)->index();
            $table->integer('amount_cents');
            $table->string('status', 20)->default('pending')->index();
            $table->string('description')->nullable();
            $table->timestamp('created_at')->index();
            $table->index(['user_id', 'created_at']);
            $table->index(['type', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('ad_watches');
        Schema::dropIfExists('ads');
    }
};
MIGRATIONS

cat > database/migrations/0001_01_01_000003_create_withdrawals_table.php << 'MIGRATIONS'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('withdrawals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('user_email');
            $table->string('user_name');
            $table->string('method', 20);
            $table->integer('amount_cents');
            $table->json('details');
            $table->string('status', 20)->default('pending')->index();
            $table->uuid('approved_by')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });

        Schema::create('referrals', function (Blueprint $table) {
            $table->id();
            $table->uuid('referrer_id');
            $table->foreign('referrer_id')->references('id')->on('users')->cascadeOnDelete();
            $table->uuid('referred_id');
            $table->foreign('referred_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('referred_name');
            $table->integer('bonus_cents')->default(50);
            $table->timestamps();
            $table->unique(['referrer_id', 'referred_id']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('message')->nullable();
            $table->string('type', 20)->default('info');
            $table->boolean('is_read')->default(false)->index();
            $table->timestamps();
        });

        Schema::create('system_config', function (Blueprint $table) {
            $table->id();
            $table->integer('min_withdrawal_cents')->default(500);
            $table->integer('daily_ad_limit')->default(30);
            $table->integer('ad_cooldown_minutes')->default(10);
            $table->integer('referral_bonus_cents')->default(50);
            $table->string('admin_email', 191)->default('owner@nova.com');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_config');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('referrals');
        Schema::dropIfExists('withdrawals');
    }
};
MIGRATIONS

echo "✅ Migrations created"

# =============================================
# 2. CONFIG FILES
# =============================================
echo "📦 Creating config files..."

cat > config/domain/ads.php << 'CONFIG'
<?php

return [
    'daily_limit' => (int) env('ADS_DAILY_LIMIT', 30),
    'cooldown_minutes' => (int) env('ADS_COOLDOWN_MINUTES', 10),
    'min_reward_cents' => (int) env('ADS_MIN_REWARD_CENTS', 3),
    'max_reward_cents' => (int) env('ADS_MAX_REWARD_CENTS', 100),
];
CONFIG

cat > config/domain/withdrawals.php << 'CONFIG'
<?php

return [
    'min_amount_cents' => (int) env('WD_MIN_CENTS', 500),
    'max_amount_cents' => (int) env('WD_MAX_CENTS', 100000),
    'methods' => [
        'bkash' => ['name' => 'bKash', 'icon' => '💰', 'fields' => ['number']],
        'nagad' => ['name' => 'Nagad', 'icon' => '💳', 'fields' => ['number']],
        'binance' => ['name' => 'Binance', 'icon' => '🪙', 'fields' => ['id', 'email']],
        'paypal' => ['name' => 'PayPal', 'icon' => '💸', 'fields' => ['email']],
        'wise' => ['name' => 'Wise', 'icon' => '🏦', 'fields' => ['email']],
        'bank' => ['name' => 'Bank Transfer', 'icon' => '🏛️', 'fields' => ['account_name', 'account_number', 'bank_name', 'routing']],
        'crypto' => ['name' => 'Crypto (USDT/BTC)', 'icon' => '₿', 'fields' => ['wallet', 'network']],
    ],
];
CONFIG

cat > config/domain/referrals.php << 'CONFIG'
<?php

return [
    'bonus_cents' => (int) env('REFERRAL_BONUS_CENTS', 50),
    'milestones' => [
        1 => 50,
        5 => 250,
        10 => 500,
        25 => 1500,
        50 => 3500,
    ],
];
CONFIG

cat > config/domain/security.php << 'CONFIG'
<?php

return [
    'rate_limits' => [
        'global' => ['attempts' => 60, 'decay' => 1],
        'login' => ['attempts' => 5, 'decay' => 1],
        'register' => ['attempts' => 3, 'decay' => 60],
        'watch_ad' => ['attempts' => 30, 'decay' => 1440],
        'withdrawal' => ['attempts' => 3, 'decay' => 60],
        'api' => ['attempts' => 60, 'decay' => 1],
    ],
    'mfa' => [
        'enforced' => (bool) env('MFA_ENFORCED', false),
        'issuer' => 'EARNNOVA',
        'digits' => 6,
        'window' => 1,
    ],
    'session' => [
        'lifetime' => (int) env('SESSION_LIFETIME', 10080),
        'inactivity_timeout' => 30,
    ],
];
CONFIG

echo "✅ Config files created"

# =============================================
# 3. CORE APPLICATION FILES
# =============================================
echo "📦 Creating application bootstrap..."

cat > bootstrap/app.php << 'BOOTSTRAP'
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => \App\Infrastructure\Http\Middleware\AdminMiddleware::class,
            'force.json' => \App\Infrastructure\Http\Middleware\ForceJsonResponse::class,
            'security.headers' => \App\Infrastructure\Http\Middleware\SecurityHeaders::class,
            'mfa.required' => \App\Infrastructure\Http\Middleware\MFARequired::class,
        ]);

        $middleware->web(prepend: [
            \App\Infrastructure\Http\Middleware\SecurityHeaders::class,
        ]);

        $middleware->api(prepend: [
            \App\Infrastructure\Http\Middleware\ForceJsonResponse::class,
            'throttle:60,1',
        ]);

        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })
    ->create();
BOOTSTRAP

echo "✅ Bootstrap created"

# =============================================
# 4. MIDDLEWARE
# =============================================
echo "📦 Creating middleware..."

cat > app/Infrastructure/Http/Middleware/AdminMiddleware.php << 'MIDDLEWARE'
<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (!Auth::check() || !Auth::user()->is_admin) {
            abort(403, 'Admin access required.');
        }
        return $next($request);
    }
}
MIDDLEWARE

cat > app/Infrastructure/Http/Middleware/ForceJsonResponse.php << 'MIDDLEWARE'
<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ForceJsonResponse
{
    public function handle(Request $request, Closure $next)
    {
        $request->headers->set('Accept', 'application/json');
        return $next($request);
    }
}
MIDDLEWARE

cat > app/Infrastructure/Http/Middleware/SecurityHeaders.php << 'MIDDLEWARE'
<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    private array $headers = [
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'DENY',
        'X-XSS-Protection' => '1; mode=block',
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains; preload',
    ];

    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        foreach ($this->headers as $key => $value) {
            $response->headers->set($key, $value);
        }
        $response->headers->set('Content-Security-Policy', $this->buildCSP($request));
        return $response;
    }

    private function buildCSP(Request $request): string
    {
        $nonce = base64_encode(random_bytes(16));
        $request->attributes->set('csp_nonce', $nonce);

        return implode('; ', [
            "default-src 'self'",
            "script-src 'self' 'nonce-{$nonce}' https://js.stripe.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://api.stripe.com",
            "font-src 'self' https://fonts.gstatic.com",
            "frame-src 'self' https://js.stripe.com",
            "base-uri 'self'",
            "form-action 'self'",
        ]);
    }
}
MIDDLEWARE

echo "✅ Middleware created"

# =============================================
# 5. ROUTES
# =============================================
echo "📦 Creating routes..."

cat > routes/api.php << 'ROUTES'
<?php

use Illuminate\Support\Facades\Route;
use App\Infrastructure\Http\Controllers\Api;

Route::prefix('v1')->group(function () {
    // Auth
    Route::post('auth/register', [Api\AuthController::class, 'register'])
        ->middleware('throttle:3,60');
    Route::post('auth/login', [Api\AuthController::class, 'login'])
        ->middleware('throttle:5,1');
    Route::post('auth/verify-mfa', [Api\AuthController::class, 'verifyMFA'])
        ->middleware('throttle:10,1');
    Route::post('auth/logout', [Api\AuthController::class, 'logout'])
        ->middleware('auth:sanctum');

    // Protected
    Route::middleware(['auth:sanctum', 'mfa.required'])->group(function () {
        // Wallet
        Route::get('wallet/balance', [Api\WalletController::class, 'balance']);
        Route::get('wallet/transactions', [Api\WalletController::class, 'transactions']);

        // Ads
        Route::get('ads', [Api\AdController::class, 'index']);
        Route::post('ads/{ad}/watch', [Api\AdController::class, 'watch'])
            ->middleware('throttle:30,1440');

        // Withdrawals
        Route::get('withdrawals/methods', [Api\WithdrawalController::class, 'methods']);
        Route::apiResource('withdrawals', Api\WithdrawalController::class)
            ->except(['update', 'destroy']);

        // Referrals
        Route::get('referrals', [Api\ReferralController::class, 'index']);
        Route::get('referrals/milestones', [Api\ReferralController::class, 'milestones']);

        // Profile
        Route::get('profile', [Api\ProfileController::class, 'show']);
        Route::put('profile', [Api\ProfileController::class, 'update']);

        // Admin
        Route::middleware('admin')->prefix('admin')->group(function () {
            Route::get('stats', [Api\AdminController::class, 'stats']);
            Route::get('users', [Api\AdminController::class, 'users']);
            Route::put('users/{user}', [Api\AdminController::class, 'updateUser']);
            Route::get('withdrawals', [Api\AdminController::class, 'withdrawals']);
            Route::post('withdrawals/{withdrawal}/approve', [Api\AdminController::class, 'approveWithdrawal']);
            Route::post('withdrawals/{withdrawal}/reject', [Api\AdminController::class, 'rejectWithdrawal']);
            Route::get('ads', [Api\AdminController::class, 'ads']);
            Route::post('ads', [Api\AdminController::class, 'createAd']);
        });
    });
});
ROUTES

cat > routes/web.php << 'ROUTES'
<?php

use Illuminate\Support\Facades\Route;
use App\Infrastructure\Http\Controllers\Web;

Route::middleware(['web'])->group(function () {
    // Public
    Route::inertia('/', 'Auth/Login')->name('login');
    Route::inertia('/register', 'Auth/Register')->name('register');
    Route::inertia('/forgot-password', 'Auth/ForgotPassword')->name('password.request');

    // Authenticated
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::inertia('/dashboard', 'Dashboard')->name('dashboard');
        Route::inertia('/earn', 'Earn')->name('earn');
        Route::inertia('/withdraw', 'Withdraw')->name('withdraw');
        Route::inertia('/referrals', 'Referrals')->name('referrals');
        Route::inertia('/history', 'History')->name('history');
        Route::inertia('/profile', 'Profile')->name('profile');

        // Admin
        Route::middleware('admin')->prefix('admin')->group(function () {
            Route::inertia('/dashboard', 'Admin/Dashboard')->name('admin.dashboard');
            Route::inertia('/users', 'Admin/Users')->name('admin.users');
            Route::inertia('/withdrawals', 'Admin/Withdrawals')->name('admin.withdrawals');
            Route::inertia('/ads', 'Admin/Ads')->name('admin.ads');
            Route::inertia('/settings', 'Admin/Settings')->name('admin.settings');
        });
    });
});
ROUTES

cat > routes/console.php << 'ROUTES'
<?php

use Illuminate\Support\Facades\Schedule;
use App\Domain\Ad\Commands\ResetDailyLimits;
use App\Domain\System\Commands\GenerateSitemap;

Schedule::command(ResetDailyLimits::class)->dailyAt('00:00');
Schedule::command('horizon:snapshot')->everyFiveMinutes();
Schedule::command('backup:clean')->daily();
Schedule::command('backup:run')->dailyAt('03:00');
Schedule::command(GenerateSitemap::class)->dailyAt('04:00');
ROUTES

echo "✅ Routes created"

# =============================================
# 6. DOMAIN ACTIONS
# =============================================
echo "📦 Creating domain actions..."

cat > app/Domain/User/Actions/RegisterUser.php << 'ACTIONS'
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
ACTIONS

cat > app/Domain/Ad/Actions/WatchAd.php << 'ACTIONS'
<?php

declare(strict_types=1);

namespace App\Domain\Ad\Actions;

use App\Domain\Ad\Exceptions\CooldownActiveException;
use App\Domain\Ad\Exceptions\DailyLimitExceededException;
use App\Domain\Ad\Models\Ad;
use App\Domain\Ad\Models\AdWatch;
use App\Domain\Transaction\Models\Transaction;
use App\Domain\User\Models\User;
use App\Infrastructure\Services\AI\RecommendationEngine;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class WatchAd
{
    public function __construct(
        private CalculateStreak $streakCalculator,
        private RecommendationEngine $ai,
    ) {}

    public function execute(User $user, Ad $ad): AdWatch
    {
        // Validate daily limit (cached)
        $dailyCount = Cache::tags(['users', 'ads'])->remember(
            "user:{$user->id}:ads_today:" . now()->toDateString(),
            3600,
            fn () => AdWatch::where('user_id', $user->id)
                ->whereDate('created_at', today())->count()
        );

        throw_if(
            $dailyCount >= config('domain.ads.daily_limit', 30),
            DailyLimitExceededException::class,
        );

        // Validate cooldown
        $lastWatch = AdWatch::where('user_id', $user->id)->latest()->first();
        throw_if(
            $lastWatch && $lastWatch->created_at->diffInMinutes(now()) < config('domain.ads.cooldown_minutes', 10),
            CooldownActiveException::class,
        );

        // Atomic watch with distributed lock
        $lock = Cache::lock("watch_ad:{$user->id}", 5);

        try {
            $lock->block(5);

            return DB::transaction(function () use ($user, $ad, $dailyCount) {
                $watch = AdWatch::create([
                    'user_id' => $user->id,
                    'ad_id' => $ad->id,
                    'reward_cents' => $ad->reward_cents,
                ]);

                $user->increment('balance_cents', $ad->reward_cents);
                $user->increment('total_earned_cents', $ad->reward_cents);
                $user->increment('ads_watched');
                $user->update([
                    'last_active_at' => now(),
                    'today_ads' => $dailyCount + 1,
                    'last_ad_date' => now()->toDateString(),
                ]);

                Transaction::create([
                    'user_id' => $user->id,
                    'type' => Transaction::TYPE_AD_REWARD,
                    'amount_cents' => $ad->reward_cents,
                    'status' => Transaction::STATUS_COMPLETED,
                    'description' => "Watched: {$ad->title}",
                ]);

                $this->streakCalculator->execute($user);

                Cache::tags(['users', 'finances', 'ads'])->forget("user:{$user->id}");
                Cache::tags(['users', 'ads'])->forget("user:{$user->id}:ads_today:" . now()->toDateString());

                $this->ai->trackPreference($user->id, $ad->id, 'watched');

                return $watch;
            });
        } finally {
            $lock->release();
        }
    }
}
ACTIONS

cat > app/Domain/Ad/Actions/CalculateStreak.php << 'ACTIONS'
<?php

declare(strict_types=1);

namespace App\Domain\Ad\Actions;

use App\Domain\Ad\Models\AdWatch;
use App\Domain\User\Models\User;

class CalculateStreak
{
    public function execute(User $user): void
    {
        $dates = AdWatch::where('user_id', $user->id)
            ->selectRaw('DATE(created_at) as date')
            ->distinct()
            ->orderBy('date', 'desc')
            ->take(7)
            ->pluck('date')
            ->toArray();

        $streak = 0;
        $check = now()->toDateString();

        foreach ($dates as $date) {
            if ($date === $check) {
                $streak++;
                $check = now()->subDays($streak)->toDateString();
            } else {
                break;
            }
        }

        if ($user->streak !== $streak) {
            $user->update(['streak' => $streak]);
        }
    }
}
ACTIONS

cat > app/Domain/Withdrawal/Actions/RequestWithdrawal.php << 'ACTIONS'
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
ACTIONS

cat > app/Domain/Withdrawal/Actions/ApproveWithdrawal.php << 'ACTIONS'
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
ACTIONS

echo "✅ Domain actions created"

# =============================================
# 7. API CONTROLLERS
# =============================================
echo "📦 Creating API controllers..."

cat > app/Infrastructure/Http/Controllers/Api/AuthController.php << 'CONTROLLER'
<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Domain\User\Actions\RegisterUser;
use App\Domain\User\DataTransferObjects\UserDTO;
use App\Domain\User\Models\User;
use App\Infrastructure\Http\Controllers\Controller;
use App\Infrastructure\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class AuthController extends Controller
{
    public function __construct(
        private RegisterUser $registerUser,
        private Google2FA $google2fa,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'referral_code' => 'nullable|string|max:10|exists:users,referral_code',
        ]);

        $dto = new UserDTO(
            name: $validated['name'],
            email: $validated['email'],
            password: $validated['password'],
            referralCode: $validated['referral_code'] ?? null,
        );

        $user = $this->registerUser->execute($dto);

        $token = $user->createToken('auth-token', ['*'])->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Account created successfully.',
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'remember' => 'boolean',
        ]);

        if (!Auth::attempt(['email' => $validated['email'], 'password' => $validated['password']], $validated['remember'] ?? false)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        $user = Auth::user();

        if ($user->isBanned()) {
            Auth::logout();
            return response()->json(['status' => 'error', 'message' => 'Account is suspended.'], 403);
        }

        // MFA Check
        if ($user->has_mfa_enabled) {
            session()->put('mfa:required', true);
            session()->put('mfa:user_id', $user->id);
            Auth::logout();

            return response()->json([
                'status' => 'mfa_required',
                'message' => 'Please enter your authentication code.',
            ]);
        }

        $token = $user->createToken('auth-token', ['*'])->plainTextToken;

        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
        ]);
    }

    public function verifyMFA(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $userId = session('mfa:user_id');
        $user = User::findOrFail($userId);

        $valid = $this->google2fa->verifyKey(
            $user->mfa_secret,
            $request->code
        );

        if (!$valid) {
            return response()->json(['status' => 'error', 'message' => 'Invalid code.'], 422);
        }

        Auth::login($user);
        session()->forget('mfa:required');
        session()->forget('mfa:user_id');

        $token = $user->createToken('auth-token', ['*'])->plainTextToken;

        return response()->json([
            'status' => 'success',
            'data' => ['user' => new UserResource($user), 'token' => $token],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['status' => 'success', 'message' => 'Logged out.']);
    }
}
CONTROLLER

echo "✅ Auth controller created"

# =============================================
# 8. SEEDER
# =============================================
echo "📦 Creating seeders..."

cat > database/seeders/DatabaseSeeder.php << 'SEEDER'
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
SEEDER

echo "✅ Seeder created"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 BUILD COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  composer install"
echo "  php artisan key:generate"
echo "  php artisan migrate --seed"
echo "  php artisan serve"
echo ""
echo "Admin login: owner@nova.com / OWNERNOVA"
