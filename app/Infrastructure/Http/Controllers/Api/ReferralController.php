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
