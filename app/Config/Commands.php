<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class Commands extends BaseConfig
{
    public $commands = [
        'hikrobot:start' => \App\Commands\StartWebSocket::class,
    ];
}