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
