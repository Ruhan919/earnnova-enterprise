<?php

declare(strict_types=1);

namespace App\Domain\Ad\Exceptions;

class DailyLimitExceededException extends \DomainException
{
    public function __construct()
    {
        parent::__construct('Daily ad limit reached. Come back tomorrow!');
    }
}
