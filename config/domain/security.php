<?php

return [
    'rate_limits' => [
        'global' => ['attempts' => 60, 'decay' => 1],
        'login' => ['attempts' => 5, 'decay' => 1],
        'register' => ['attempts' => 3, 'decay' => 60],
        'watch_ad' => ['attempts' => 30, 'decay' => 1440],
        'withdrawal' => ['attempts' => 3, 'decay' => 60],
        'api' => ['attempts' => 60, 'decay' => 1],
    ],
    'mfa' => [
        'enforced' => (bool) env('MFA_ENFORCED', false),
        'issuer' => 'EARNNOVA',
        'digits' => 6,
        'window' => 1,
    ],
    'session' => [
        'lifetime' => (int) env('SESSION_LIFETIME', 10080),
        'inactivity_timeout' => 30,
    ],
];
