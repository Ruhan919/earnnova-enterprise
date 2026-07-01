<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Domain\Withdrawal\Actions\RequestWithdrawal;
use App\Domain\Withdrawal\Models\Withdrawal;
use App\Infrastructure\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WithdrawalController extends Controller
{
    public function __construct(
        private RequestWithdrawal $requestWithdrawal,
    ) {}

    public function methods(): JsonResponse
    {
        return response()->json(['data' => config('domain.withdrawals.methods')]);
    }

    public function index(Request $request): JsonResponse
    {
        $withdrawals = Withdrawal::where('user_id', $request->user()->id)
            ->latest()->paginate(20);
        return response()->json($withdrawals);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'method' => 'required|string|in:' . implode(',', array_keys(config('domain.withdrawals.methods'))),
            'amount' => 'required|numeric|min:0',
            'details' => 'required|array',
        ]);

        try {
            $withdrawal = $this->requestWithdrawal->execute(
                $request->user(),
                $validated['method'],
                (int) ($validated['amount'] * 100),
                $validated['details'],
            );

            return response()->json([
                'status' => 'success',
                'data' => $withdrawal,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function show(Request $request, Withdrawal $withdrawal): JsonResponse
    {
        if ($withdrawal->user_id !== $request->user()->id) {
            abort(403);
        }
        return response()->json(['data' => $withdrawal]);
    }
}
