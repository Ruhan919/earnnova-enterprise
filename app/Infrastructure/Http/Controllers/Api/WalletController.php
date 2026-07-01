<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Domain\Transaction\Models\Transaction;
use App\Infrastructure\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function balance(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'balance' => $user->balanceInDollars(),
            'balance_cents' => $user->balance_cents,
            'total_earned' => $user->total_earned_cents / 100,
            'total_withdrawn' => $user->total_withdrawn_cents / 100,
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $transactions = Transaction::where('user_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return response()->json($transactions);
    }
}
