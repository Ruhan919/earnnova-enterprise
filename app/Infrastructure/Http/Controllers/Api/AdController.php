<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Domain\Ad\Actions\WatchAd;
use App\Domain\Ad\Models\Ad;
use App\Infrastructure\Http\Controllers\Controller;
use App\Infrastructure\Services\AI\RecommendationEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdController extends Controller
{
    public function __construct(
        private WatchAd $watchAd,
        private RecommendationEngine $ai,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $ads = $this->ai->recommendForUser($request->user()->id);
        return response()->json(['data' => $ads]);
    }

    public function watch(Request $request, Ad $ad): JsonResponse
    {
        try {
            $watch = $this->watchAd->execute($request->user(), $ad);
            return response()->json([
                'status' => 'success',
                'reward' => $ad->rewardInDollars(),
                'new_balance' => $request->user()->fresh()->balanceInDollars(),
            ]);
        } catch (\DomainException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 429);
        }
    }
}
