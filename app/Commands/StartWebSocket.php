<?php 

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use App\WebSocket\HikrobotWebSocketServer;

class StartWebSocket extends BaseCommand
{
    protected $group = 'custom';
    protected $name = 'websocket:start';
    protected $description = 'Start the WebSocket server using Ratchet and ReactPHP';

    public function run(array $params)
    {
        CLI::write("Starting WebSocket Server...", 'green');
        HikrobotWebSocketServer::runServer();
    }
}