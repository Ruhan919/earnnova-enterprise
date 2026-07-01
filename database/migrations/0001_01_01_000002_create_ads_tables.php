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
