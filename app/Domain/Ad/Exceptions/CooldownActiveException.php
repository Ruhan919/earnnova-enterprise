<?php

declare(strict_types=1);

namespace App\Domain\Ad\Exceptions;

class CooldownActiveException extends \DomainException
{
    public function __construct()
    {
        parent::__construct('Please wait before watching another ad.');
    }
}
