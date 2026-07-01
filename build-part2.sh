#!/bin/bash
# EARNNOVA Enterprise — Part 2: API Controllers + Docker + Frontend
set -e

echo "📦 Creating remaining API controllers..."

# WalletController
cat > app/Infrastructure/Http/Controllers/Api/WalletController.php << 'EOF'
<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Domain\Transaction\Models\Transaction;
use App\Infrastructure\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function balance(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'balance' => $user->balanceInDollars(),
            'balance_cents' => $user->balance_cents,
            'total_earned' => $user->total_earned_cents / 100,
            'total_withdrawn' => $user->total_withdrawn_cents / 100,
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $transactions = Transaction::where('user_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return response()->json($transactions);
    }
}
EOF

# AdController
cat > app/Infrastructure/Http/Controllers/Api/AdController.php << 'EOF'
<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Domain\Ad\Actions\WatchAd;
use App\Domain\Ad\Models\Ad;
use App\Infrastructure\Http\Controllers\Controller;
use App\Infrastructure\Services\AI\RecommendationEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdController extends Controller
{
    public function __construct(
        private WatchAd $watchAd,
        private RecommendationEngine $ai,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $ads = $this->ai->recommendForUser($request->user()->id);
        return response()->json(['data' => $ads]);
    }

    public function watch(Request $request, Ad $ad): JsonResponse
    {
        try {
            $watch = $this->watchAd->execute($request->user(), $ad);
            return response()->json([
                'status' => 'success',
                'reward' => $ad->rewardInDollars(),
                'new_balance' => $request->user()->fresh()->balanceInDollars(),
            ]);
        } catch (\DomainException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 429);
        }
    }
}
EOF

# WithdrawalController
cat > app/Infrastructure/Http/Controllers/Api/WithdrawalController.php << 'EOF'
<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Domain\Withdrawal\Actions\RequestWithdrawal;
use App\Domain\Withdrawal\Models\Withdrawal;
use App\Infrastructure\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WithdrawalController extends Controller
{
    public function __construct(
        private RequestWithdrawal $requestWithdrawal,
    ) {}

    public function methods(): JsonResponse
    {
        return response()->json(['data' => config('domain.withdrawals.methods')]);
    }

    public function index(Request $request): JsonResponse
    {
        $withdrawals = Withdrawal::where('user_id', $request->user()->id)
            ->latest()->paginate(20);
        return response()->json($withdrawals);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'method' => 'required|string|in:' . implode(',', array_keys(config('domain.withdrawals.methods'))),
            'amount' => 'required|numeric|min:0',
            'details' => 'required|array',
        ]);

        try {
            $withdrawal = $this->requestWithdrawal->execute(
                $request->user(),
                $validated['method'],
                (int) ($validated['amount'] * 100),
                $validated['details'],
            );

            return response()->json([
                'status' => 'success',
                'data' => $withdrawal,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function show(Request $request, Withdrawal $withdrawal): JsonResponse
    {
        if ($withdrawal->user_id !== $request->user()->id) {
            abort(403);
        }
        return response()->json(['data' => $withdrawal]);
    }
}
EOF

# ReferralController
cat > app/Infrastructure/Http/Controllers/Api/ReferralController.php << 'EOF'
<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Domain\Referral\Models\Referral;
use App\Infrastructure\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferralController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $referrals = Referral::where('referrer_id', $request->user()->id)
            ->latest()->paginate(20);

        return response()->json([
            'data' => $referrals,
            'meta' => [
                'total_bonus' => Referral::where('referrer_id', $request->user()->id)->sum('bonus_cents') / 100,
                'total_count' => $referrals->total(),
                'referral_code' => $request->user()->referral_code,
                'referral_url' => $request->user()->getReferralUrl(),
            ],
        ]);
    }

    public function milestones(): JsonResponse
    {
        return response()->json(['data' => config('domain.referrals.milestones')]);
    }
}
EOF

# ProfileController
cat > app/Infrastructure/Http/Controllers/Api/ProfileController.php << 'EOF'
<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Infrastructure\Http\Controllers\Controller;
use App\Infrastructure\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'current_password' => 'required_with:new_password|string',
            'new_password' => 'nullable|string|min:6|confirmed',
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['phone'])) {
            $user->phone = $validated['phone'];
        }
        if (isset($validated['new_password'])) {
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['status' => 'error', 'message' => 'Current password is incorrect.'], 422);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        $user->save();

        return response()->json([
            'status' => 'success',
            'data' => new UserResource($user),
        ]);
    }
}
EOF

# AdminController
cat > app/Infrastructure/Http/Controllers/Api/AdminController.php << 'EOF'
<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Domain\Ad\Models\Ad;
use App\Domain\User\Models\User;
use App\Domain\Withdrawal\Actions\ApproveWithdrawal;
use App\Domain\Withdrawal\Enums\WithdrawalStatus;
use App\Domain\Withdrawal\Models\Withdrawal;
use App\Infrastructure\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function __construct(
        private ApproveWithdrawal $approveWithdrawal,
    ) {}

    public function stats(): JsonResponse
    {
        return response()->json([
            'total_users' => User::count(),
            'active_ads' => Ad::where('is_active', true)->count(),
            'pending_withdrawals' => Withdrawal::where('status', WithdrawalStatus::PENDING)->count(),
            'total_paid' => Withdrawal::where('status', WithdrawalStatus::APPROVED)->sum('amount_cents') / 100,
            'recent_users' => User::latest()->take(10)->get(),
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query();
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        return response()->json($query->latest()->paginate(20));
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'balance_cents' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
            'is_admin' => 'sometimes|boolean',
        ]);

        $user->update($validated);
        return response()->json(['status' => 'success', 'data' => $user]);
    }

    public function withdrawals(Request $request): JsonResponse
    {
        $status = $request->input('status');
        $query = Withdrawal::query();
        if ($status) {
            $query->where('status', $status);
        }
        return response()->json($query->latest()->paginate(20));
    }

    public function approveWithdrawal(Request $request, Withdrawal $withdrawal): JsonResponse
    {
        $this->approveWithdrawal->execute($withdrawal, $request->user());
        return response()->json(['status' => 'success', 'message' => 'Withdrawal approved.']);
    }

    public function rejectWithdrawal(Request $request, Withdrawal $withdrawal): JsonResponse
    {
        $withdrawal->update([
            'status' => WithdrawalStatus::REJECTED,
            'approved_by' => $request->user()->id,
            'rejected_at' => now(),
            'notes' => $request->input('reason'),
        ]);

        $withdrawal->user->increment('balance_cents', $withdrawal->amount_cents);

        return response()->json(['status' => 'success', 'message' => 'Withdrawal rejected and refunded.']);
    }

    public function ads(): JsonResponse
    {
        return response()->json(['data' => Ad::all()]);
    }

    public function createAd(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'reward_cents' => 'required|integer|min:1',
            'duration_seconds' => 'required|integer|min:5',
            'is_active' => 'boolean',
        ]);

        $ad = Ad::create($validated);
        return response()->json(['status' => 'success', 'data' => $ad], 201);
    }
}
EOF

echo "✅ All API controllers created"

# =============================================
# DOCKER CONFIG
# =============================================
echo "📦 Creating Docker configuration..."

cat > Dockerfile << 'DOCKER'
FROM php:8.4-fpm-alpine

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
    && docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    zip \
    bcmath \
    gd \
    mbstring \
    pcntl \
    && apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/community \
    gnu-libiconv \
    && docker-php-ext-install sockets

# Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Swoole for Octane
RUN pecl install swoole && docker-php-ext-enable swoole

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . .

RUN composer install --no-interaction --optimize-autoloader --no-dev && \
    chown -R www-data:www-data storage bootstrap/cache && \
    chmod -R 775 storage bootstrap/cache

EXPOSE 8000

CMD ["php", "artisan", "octane:start", "--server=swoole", "--host=0.0.0.0", "--port=8000"]
DOCKER

cat > docker-compose.yml << 'YAML'
version: '3.9'

services:
  app:
    build: .
    container_name: earnnova-app
    restart: unless-stopped
    environment:
      APP_ENV: production
      APP_DEBUG: "false"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - earnnova
    volumes:
      - storage_data:/var/www/storage

  web:
    image: nginx:alpine
    container_name: earnnova-web
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - .:/var/www
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - app
    networks:
      - earnnova

  postgres:
    image: postgres:16-alpine
    container_name: earnnova-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: earnnova
      POSTGRES_USER: earnnova
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secret}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U earnnova"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - earnnova

  redis:
    image: redis:7-alpine
    container_name: earnnova-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-secret}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - earnnova

  horizon:
    build: .
    container_name: earnnova-horizon
    restart: unless-stopped
    command: php artisan horizon
    environment:
      APP_ENV: production
    env_file: .env
    depends_on:
      - postgres
      - redis
    networks:
      - earnnova

  scheduler:
    build: .
    container_name: earnnova-scheduler
    restart: unless-stopped
    command: php artisan schedule:work
    environment:
      APP_ENV: production
    env_file: .env
    depends_on:
      - postgres
    networks:
      - earnnova

  meilisearch:
    image: getmeili/meilisearch:latest
    container_name: earnnova-search
    restart: unless-stopped
    environment:
      MEILI_MASTER_KEY: ${MEILISEARCH_KEY:-secretkey}
    ports:
      - "7700:7700"
    volumes:
      - meilisearch_data:/meili_data
    networks:
      - earnnova

volumes:
  postgres_data:
  redis_data:
  meilisearch_data:
  storage_data:

networks:
  earnnova:
    driver: bridge
YAML

mkdir -p docker/nginx
cat > docker/nginx/default.conf << 'NGINX'
server {
    listen 80;
    server_name earnnova.com api.earnnova.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name earnnova.com;

    root /var/www/public;
    index index.php;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass app:8000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known) {
        deny all;
    }

    access_log /var/log/nginx/earnnova_access.log;
    error_log /var/log/nginx/earnnova_error.log;
}
NGINX

echo "✅ Docker configuration created"

# =============================================
# CI/CD
# =============================================
echo "📦 Creating CI/CD pipeline..."

cat > .github/workflows/deploy.yml << 'YAML'
name: Deploy EARNNOVA

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: earnnova_test
          POSTGRES_USER: earnnova
          POSTGRES_PASSWORD: secret
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.4'
          extensions: mbstring, pdo_pgsql, redis, pcntl, swoole
          coverage: pcov

      - run: composer install --no-interaction --prefer-dist
      - run: cp .env.example .env
      - run: php artisan key:generate

      - name: PHPStan
        run: vendor/bin/phpstan analyse --level=max --memory-limit=2G

      - name: Pint
        run: vendor/bin/pint --test

      - name: Pest Tests
        run: php artisan test --parallel
        env:
          DB_CONNECTION: pgsql
          DB_HOST: localhost
          DB_PORT: 5432
          DB_DATABASE: earnnova_test
          DB_USERNAME: earnnova
          DB_PASSWORD: secret

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  deploy:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vapor
        uses: vapor-actions/deploy@v2
        with:
          vapor_token: ${{ secrets.VAPOR_API_TOKEN }}
          environment: production
YAML

echo "✅ CI/CD pipeline created"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 PART 2 BUILD COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "All files created. Run:"
echo "  composer install"
echo "  php artisan migrate --seed"
echo "  php artisan octane:start"
