<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers\Api;

use App\Infrastructure\Http\Controllers\Controller;
use App\Infrastructure\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'current_password' => 'required_with:new_password|string',
            'new_password' => 'nullable|string|min:6|confirmed',
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['phone'])) {
            $user->phone = $validated['phone'];
        }
        if (isset($validated['new_password'])) {
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['status' => 'error', 'message' => 'Current password is incorrect.'], 422);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        $user->save();

        return response()->json([
            'status' => 'success',
            'data' => new UserResource($user),
        ]);
    }
}
