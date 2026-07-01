<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'photo_url' => $this->photo_url,
            'balance' => $this->balanceInDollars(),
            'balance_cents' => $this->balance_cents,
            'total_earned' => $this->total_earned_cents / 100,
            'total_withdrawn' => $this->total_withdrawn_cents / 100,
            'ads_watched' => $this->ads_watched,
            'today_ads' => $this->today_ads,
            'referral_code' => $this->referral_code,
            'streak' => $this->streak,
            'is_admin' => $this->is_admin,
            'has_mfa' => $this->has_mfa_enabled,
            'created_at' => $this->created_at,
        ];
    }
}
