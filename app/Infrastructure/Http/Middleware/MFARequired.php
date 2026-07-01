<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class MFARequired
{
    public function handle(Request $request, Closure $next)
    {
        if (session()->has('mfa:required')) {
            return response()->json(['status' => 'mfa_required', 'message' => 'MFA verification required.'], 401);
        }
        return $next($request);
    }
}
