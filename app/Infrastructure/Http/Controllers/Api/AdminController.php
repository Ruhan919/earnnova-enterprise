<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Domain\Ad\Models\Ad;
use App\Domain\User\Models\User;
use App\Domain\Withdrawal\Actions\ApproveWithdrawal;
use App\Domain\Withdrawal\Enums\WithdrawalStatus;
use App\Domain\Withdrawal\Models\Withdrawal;
use App\Infrastructure\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function __construct(
        private ApproveWithdrawal $approveWithdrawal,
    ) {}

    public function stats(): JsonResponse
    {
        return response()->json([
            'total_users' => User::count(),
            'active_ads' => Ad::where('is_active', true)->count(),
            'pending_withdrawals' => Withdrawal::where('status', WithdrawalStatus::PENDING)->count(),
            'total_paid' => Withdrawal::where('status', WithdrawalStatus::APPROVED)->sum('amount_cents') / 100,
            'recent_users' => User::latest()->take(10)->get(),
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query();
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        return response()->json($query->latest()->paginate(20));
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'balance_cents' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
            'is_admin' => 'sometimes|boolean',
        ]);

        $user->update($validated);
        return response()->json(['status' => 'success', 'data' => $user]);
    }

    public function withdrawals(Request $request): JsonResponse
    {
        $status = $request->input('status');
        $query = Withdrawal::query();
        if ($status) {
            $query->where('status', $status);
        }
        return response()->json($query->latest()->paginate(20));
    }

    public function approveWithdrawal(Request $request, Withdrawal $withdrawal): JsonResponse
    {
        $this->approveWithdrawal->execute($withdrawal, $request->user());
        return response()->json(['status' => 'success', 'message' => 'Withdrawal approved.']);
    }

    public function rejectWithdrawal(Request $request, Withdrawal $withdrawal): JsonResponse
    {
        $withdrawal->update([
            'status' => WithdrawalStatus::REJECTED,
            'approved_by' => $request->user()->id,
            'rejected_at' => now(),
            'notes' => $request->input('reason'),
        ]);

        $withdrawal->user->increment('balance_cents', $withdrawal->amount_cents);

        return response()->json(['status' => 'success', 'message' => 'Withdrawal rejected and refunded.']);
    }

    public function ads(): JsonResponse
    {
        return response()->json(['data' => Ad::all()]);
    }

    public function createAd(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'reward_cents' => 'required|integer|min:1',
            'duration_seconds' => 'required|integer|min:5',
            'is_active' => 'boolean',
        ]);

        $ad = Ad::create($validated);
        return response()->json(['status' => 'success', 'data' => $ad], 201);
    }
}
