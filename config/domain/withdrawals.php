<?php

return [
    'min_amount_cents' => (int) env('WD_MIN_CENTS', 500),
    'max_amount_cents' => (int) env('WD_MAX_CENTS', 100000),
    'methods' => [
        'bkash' => ['name' => 'bKash', 'icon' => '💰', 'fields' => ['number']],
        'nagad' => ['name' => 'Nagad', 'icon' => '💳', 'fields' => ['number']],
        'binance' => ['name' => 'Binance', 'icon' => '🪙', 'fields' => ['id', 'email']],
        'paypal' => ['name' => 'PayPal', 'icon' => '💸', 'fields' => ['email']],
        'wise' => ['name' => 'Wise', 'icon' => '🏦', 'fields' => ['email']],
        'bank' => ['name' => 'Bank Transfer', 'icon' => '🏛️', 'fields' => ['account_name', 'account_number', 'bank_name', 'routing']],
        'crypto' => ['name' => 'Crypto (USDT/BTC)', 'icon' => '₿', 'fields' => ['wallet', 'network']],
    ],
];
