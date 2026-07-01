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
