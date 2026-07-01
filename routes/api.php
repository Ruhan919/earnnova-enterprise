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
