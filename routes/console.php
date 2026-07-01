<?php

use Illuminate\Support\Facades\Schedule;
use App\Domain\Ad\Commands\ResetDailyLimits;
use App\Domain\System\Commands\GenerateSitemap;

Schedule::command(ResetDailyLimits::class)->dailyAt('00:00');
Schedule::command('horizon:snapshot')->everyFiveMinutes();
Schedule::command('backup:clean')->daily();
Schedule::command('backup:run')->dailyAt('03:00');
Schedule::command(GenerateSitemap::class)->dailyAt('04:00');
