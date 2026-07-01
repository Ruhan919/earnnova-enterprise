<?php

return [
    'daily_limit' => (int) env('ADS_DAILY_LIMIT', 30),
    'cooldown_minutes' => (int) env('ADS_COOLDOWN_MINUTES', 10),
    'min_reward_cents' => (int) env('ADS_MIN_REWARD_CENTS', 3),
    'max_reward_cents' => (int) env('ADS_MAX_REWARD_CENTS', 100),
];
