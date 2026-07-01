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
