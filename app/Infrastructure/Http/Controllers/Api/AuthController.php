<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Domain\User\Actions\RegisterUser;
use App\Domain\User\DataTransferObjects\UserDTO;
use App\Domain\User\Models\User;
use App\Infrastructure\Http\Controllers\Controller;
use App\Infrastructure\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class AuthController extends Controller
{
    public function __construct(
        private RegisterUser $registerUser,
        private Google2FA $google2fa,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'referral_code' => 'nullable|string|max:10|exists:users,referral_code',
        ]);

        $dto = new UserDTO(
            name: $validated['name'],
            email: $validated['email'],
            password: $validated['password'],
            referralCode: $validated['referral_code'] ?? null,
        );

        $user = $this->registerUser->execute($dto);

        $token = $user->createToken('auth-token', ['*'])->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Account created successfully.',
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'remember' => 'boolean',
        ]);

        if (!Auth::attempt(['email' => $validated['email'], 'password' => $validated['password']], $validated['remember'] ?? false)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        $user = Auth::user();

        if ($user->isBanned()) {
            Auth::logout();
            return response()->json(['status' => 'error', 'message' => 'Account is suspended.'], 403);
        }

        // MFA Check
        if ($user->has_mfa_enabled) {
            session()->put('mfa:required', true);
            session()->put('mfa:user_id', $user->id);
            Auth::logout();

            return response()->json([
                'status' => 'mfa_required',
                'message' => 'Please enter your authentication code.',
            ]);
        }

        $token = $user->createToken('auth-token', ['*'])->plainTextToken;

        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
        ]);
    }

    public function verifyMFA(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $userId = session('mfa:user_id');
        $user = User::findOrFail($userId);

        $valid = $this->google2fa->verifyKey(
            $user->mfa_secret,
            $request->code
        );

        if (!$valid) {
            return response()->json(['status' => 'error', 'message' => 'Invalid code.'], 422);
        }

        Auth::login($user);
        session()->forget('mfa:required');
        session()->forget('mfa:user_id');

        $token = $user->createToken('auth-token', ['*'])->plainTextToken;

        return response()->json([
            'status' => 'success',
            'data' => ['user' => new UserResource($user), 'token' => $token],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['status' => 'success', 'message' => 'Logged out.']);
    }
}
