<?php

return [
    'bonus_cents' => (int) env('REFERRAL_BONUS_CENTS', 50),
    'milestones' => [
        1 => 50,
        5 => 250,
        10 => 500,
        25 => 1500,
        50 => 3500,
    ],
];
