<?php

namespace App\WebSocket;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use React\EventLoop\Loop;
use React\Socket\SocketServer;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

use App\Models\DevicesModel;
use App\Models\WebServiceModel;
use App\Libraries\RobotTaskTracker;

class HikrobotWebSocketServer implements MessageComponentInterface
{
    protected $clients;
    protected $loop;
    protected $robotModel;
    protected $lastDataHash;
    protected $tracker;

    public function __construct($loop)
    {
        $this->clients = new \SplObjectStorage;
        $this->loop = $loop;

        // Aqui usamos o model diretamente
        //$this->robotModel = new RobotModel();
        $this->robotModel = new DevicesModel();
        $this->tracker = new RobotTaskTracker();

        $loop->addPeriodicTimer(5, function () {
            $this->pollRobotData();
        });
    }

    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        echo "New connection: {$conn->resourceId}\n";

        // Envia dados iniciais
        $this->sendInitialData($conn);
    }

    public function onMessage(ConnectionInterface $from, $msg)
    {
        echo "Message from {$from->resourceId}: $msg\n";
    }

    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        echo "Connection {$conn->resourceId} closed\n";
    }

    public function onError(ConnectionInterface $conn, \Throwable $e)
    {
        echo "Error: {$e->getMessage()}\n";
        $conn->close();
    }

    protected function pollRobotData()
    {
        helper('utilis_helper');

        try {
            $ws = new WebServiceModel();
            $kidModel = new DevicesModel();
            $body = array(
                "reqCode" => newStamp("QAS"),
                "mapCode" => "LA"
            );  
        
            $result = $ws->callWebservice(HIKROBOT_QUERY_AGV_STATUS, $body);
            if($result) {
                $robotsData = $result->data;
                //echo json_encode($robotsData);
                foreach($robotsData as $key => $value) {
                    

                    $robotName = $kidModel->getDeviceName($value->robotIp);
                    $value->robotName = $robotName;
                    $value->statusText = lang("HikrobotStatus.statuses.{$value->status}");
                    unset($value->timestamp);

                    $robotData = $value;
                    $info = $this->tracker->processRobotData($robotData);
                    //print_r($info);
                    $value->info = $info;
                    
                }
                //echo json_encode($robotsData);
                $hash = md5(json_encode($robotsData));
            
                if($this->lastDataHash !== $hash) {
                    $this->lastDataHash = $hash;
                
                    $this->broadcast([
                        'type' => 'robot_update',
                        'api_data' => $robotsData,
                        'timestamp' => date('Y-m-d H:i:s')
                    ]);
                }
            
            }
        } catch (\Throwable $e) {
            echo "Polling error: {$e->getMessage()}\n";
        }
    }


    protected function sendInitialData(ConnectionInterface $conn)
    {
        helper('utilis_helper');
        $ws = new WebServiceModel();
        $kidModel = new DevicesModel();
        $body = array(
            "reqCode" => newStamp("QAS"),
            "mapCode" => "LA"
        );  
        
        $result = $ws->callWebservice(HIKROBOT_QUERY_AGV_STATUS, $body);
        if($result) {
            $robotsData = $result->data;
            //echo json_encode($robotsData);
            foreach($robotsData as $key => $value) {
                $robotName = $kidModel->getDeviceName($value->robotIp);
                $value->robotName = $robotName;
                $value->statusText = lang("HikrobotStatus.statuses.{$value->status}");
                

                unset($value->timestamp);
                $robotData = $value;
                $info = $this->tracker->processRobotData($robotData);
                if($info) {
                    $value->info = $info;
                } else {
                    $value->info = [];
                }
            }

            $this->broadcast([
                'type' => 'initial_data',
                'api_data' => $robotsData,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
                   
        }        
    }

    protected function broadcast(array $message)
    {
        $json = json_encode($message);
        foreach ($this->clients as $client) {
            $client->send($json);
        }
    }

    public static function runServer()
    {   
        $config     = new \Config\WebSocket;
        $addressToListen  = $config->addressToListen;
        $portToListen     = $config->portToListen;

        $loop = Loop::get();
        $server = new IoServer(
            new HttpServer(
                new WsServer(new self($loop))
            ),
            new SocketServer("{$addressToListen}:{$portToListen}", [], $loop),
            $loop
        );

        echo "WebSocket server running on ws://{$addressToListen}:{$portToListen}...\n";
        $loop->run();
    }
}
