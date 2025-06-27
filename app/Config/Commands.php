<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class Commands extends BaseConfig
{
    public $commands = [
        'websocket:start' => \App\Commands\StartWebSocket::class,
        'schedule-tasks:start' => \App\Commands\ServiceRunner::class,
        'thekid:start' => \App\Commands\ServiceRunner::class
    ];
}