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
