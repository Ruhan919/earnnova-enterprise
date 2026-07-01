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
