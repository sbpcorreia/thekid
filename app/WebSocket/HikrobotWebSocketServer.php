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
use App\Libraries\RobotTaskTracker;
use App\Models\SpotModel;
use App\Models\TerminalModel;
use App\Models\WebServiceModel;
use App\Models\TaskModel;

class HikrobotWebSocketServer implements MessageComponentInterface
{
    protected \SplObjectStorage $clients;
    protected \React\EventLoop\LoopInterface $loop;
    protected DevicesModel $robotModel;
    protected ?string $lastRobotDataHash = null;
    protected RobotTaskTracker $tracker;
    protected WebServiceModel $webserviceModel;
    protected TerminalModel $terminalModel;
    protected TaskModel $taskModel;
    protected SpotModel $spotModel;

    // Cache para os últimos dados de robô processados
    protected array $cachedRobotData = [];
    // Cache para a última informação de rack por posCode para evitar broadcasts redundantes
    protected array $cachedRackInfo = [];

    // Mapeamento de ConnectionInterface para o locationCode do terminal associado
    protected \SplObjectStorage $clientLocations;

    public function __construct(
        \React\EventLoop\LoopInterface $loop
    ) {
        $this->clients = new \SplObjectStorage;
        $this->clientLocations = new \SplObjectStorage; // Inicializa o SplObjectStorage para clientes

        $this->loop = $loop;

        // Injeção de dependência para modelos e bibliotecas
        $this->robotModel       = new DevicesModel();
        $this->tracker          = new RobotTaskTracker();
        $this->webserviceModel  = new WebServiceModel();
        $this->terminalModel    = new TerminalModel();
        $this->taskModel        = new TaskModel();
        $this->spotModel        = new SpotModel();


        // Timer para polling de dados de robôs (a cada 5 segundos)
        $loop->addPeriodicTimer(5, function () {
            $this->pollRobotData();
        });

        // Timer para polling de informações de rack para cada localização de terminal ativa (a cada 5 segundos)
        // Isso assume que você quer atualizar todos os clientes sobre as racks nas localizações que eles 'se inscreveram'.
        $loop->addPeriodicTimer(5, function() {
            foreach ($this->clientLocations as $conn) {
                if ($this->clientLocations->offsetExists($conn)) {
                    $locationCode = $this->clientLocations[$conn];
                    if (!empty($locationCode)) {
                        $this->queryAndSendRackInfoByPosCode($locationCode, $conn); // Envia seletivamente para cada cliente
                    }
                }
            }
        });
    }

    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        echo "New connection: {$conn->resourceId}\n";

        // Envia dados iniciais do robô (o cache mais recente)
        $this->sendRobotStatusToClient($conn);
    }

    public function onMessage(ConnectionInterface $from, $msg)
    {
        echo "Message from {$from->resourceId}: {$msg}\n";

        $data = json_decode($msg, true);

        if($data["type"] === "ping") {
            $from->send(json_encode(array("type" => "pong")));
            return;
        }

        // Validação básica da mensagem
        if (!is_array($data)) {
            echo "Invalid message format from {$from->resourceId}: {$msg}\n";
            $from->send(json_encode(['error' => 'Invalid message format']));
            return;
        }

        $terminalCode = $data["terminalCode"] ?? null;
        $unloadLocation = "";

        if (!empty($terminalCode)) {
            try {
                $terminalInfo = $this->terminalModel->getTerminalInfo($terminalCode);
                if (!empty($terminalInfo)) {
                    $unloadInfo = $this->spotModel->getDefaultUnloadDock($terminalInfo->codigo);
                    if(!empty($unloadInfo)) {
                        $unloadLocation = $unloadInfo->ponto;
                         // Armazena o locationCode associado a esta conexão
                        $this->clientLocations->offsetSet($from, $unloadLocation);
                        echo "Cliente {$from->resourceId} associado à localização de descarga: {$unloadLocation}\n";
                    } else {
                        echo "Cliente {$from->resourceId} sem local de descarga associado!\n";
                    }
                } else {
                    echo "Terminal não encontrado {$terminalCode}\n";
                }
            } catch (\Throwable $e) {
                echo "Erro ao obter as informações do terminal {$terminalCode}: {$e->getMessage()}\n";
                // Opcional: enviar erro para o cliente
                $from->send(json_encode(['error' => 'Falha ao obter as informações do terminal']));
            }
        }

        if (isset($data['type'])) {
            switch ($data['type']) {
                case 'requestRobotStatus':
                    // Cliente está pedindo o status do robô
                    $this->sendRobotStatusToClient($from);
                    break;
                case 'requestRackAtPositionCode':
                    // Cliente está pedindo a rack em um posCode específico
                    $requestedPosCode = $data['posCode'] ?? null; // Assume que o posCode pode vir na requisição
                    if (!empty($requestedPosCode)) {
                        $this->queryAndSendRackInfoByPosCode($requestedPosCode, $from); // Envia para o cliente que pediu
                    } elseif ($this->clientLocations->offsetExists($from)) {
                        $locationCode = $this->clientLocations[$from];
                        if (!empty($locationCode)) {
                            $this->queryAndSendRackInfoByPosCode($locationCode, $from);
                        }
                    } else {
                        $from->send(json_encode(['error' => 'Não existe nenhuma localização associada ao cliente']));
                    }
                    break;
                default:
                    // Se nenhum tipo específico, envia o status do robô e tenta enviar a rack info se houver locationCode
                    $this->sendRobotStatusToClient($from);
                    if ($this->clientLocations->offsetExists($from)) {
                        $locationCode = $this->clientLocations[$from];
                        if (!empty($locationCode)) {
                            $this->queryAndSendRackInfoByPosCode($locationCode, $from);
                        }
                    }
                    break;
            }
        } else {
             // Se não houver tipo, assume-se que é uma requisição inicial ou de terminalCode
             $this->sendRobotStatusToClient($from);
             if ($this->clientLocations->offsetExists($from)) {
                 $locationCode = $this->clientLocations[$from];
                 if (!empty($locationCode)) {
                     $this->queryAndSendRackInfoByPosCode($locationCode, $from);
                 }
             }
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        $this->clientLocations->detach($conn); // Remove a associação de localização ao desconectar
        echo "A ligação {$conn->resourceId} foi quebrada\n";
    }

    public function onError(ConnectionInterface $conn, \Throwable $e)
    {
        echo "Ocorreu um erro na ligação {$conn->resourceId}: {$e->getMessage()}\n";
        $conn->close();
    }

    /**
     * Consulta os dados dos robôs e as informações da rack, processa e transmite.
     */
    protected function pollRobotData()
    {
        // 1. Obter todas as posições com racks no mapa
        $racksOnMap = [];
        helper('utilis_helper'); // Certifique-se de que este helper está carregado

        $bodyPodBerth = [
            "reqCode" => newStamp(REQ_CODE_POD_BERTH),
            "mapShortName" => MAP_SHORT_NAME
        ];

        try {
            $podBerthResponse = $this->webserviceModel->callWebservice(HIKROBOT_QUERY_POD_BERTH_MAT, $bodyPodBerth);

            if (isset($podBerthResponse->code) && $podBerthResponse->code == '0' && isset($podBerthResponse->data)) {
                foreach ($podBerthResponse->data as $rackInfo) {
                    if (isset($rackInfo->posCode)) {
                        $racksOnMap[$rackInfo->posCode] = true;
                    }
                }
            } else {
                echo "Error fetching pod berth data: " . json_encode($podBerthResponse) . "\n";
            }
        } catch (\Throwable $e) {
            echo "Exception fetching pod berth data: {$e->getMessage()}\n";
            // Em produção, considere logar isso mais robustamente
        }


        // 2. Obter o status dos AGVs
        $bodyAgvStatus = [
            "reqCode" => newStamp(REQ_CODE_AGV_STATUS),
            "mapCode" => MAP_CODE_AGV_STATUS
        ];
        $robotsData = [];

        try {
            $robotsResponse = $this->webserviceModel->callWebservice(HIKROBOT_QUERY_AGV_STATUS, $bodyAgvStatus);

            if (isset($robotsResponse->code) && $robotsResponse->code == '0' && isset($robotsResponse->data)) {
                foreach ($robotsResponse->data as $robot) {
                    $robotCurrentPosCode = $robot->posCode ?? null;

                    $hasRackAtCurrentPosition = false;
                    if ($robotCurrentPosCode && isset($racksOnMap[$robotCurrentPosCode])) {
                        $hasRackAtCurrentPosition = true;
                    }

                    $robot->robotName = "";
                    $robotName = $this->robotModel->getDeviceName($robot->robotIp, $robot->robotCode);
                    if (!empty($robotName)) {
                        $robot->robotName = $robotName;
                    }

                    $robot->hasRackAtCurrentPosition = $hasRackAtCurrentPosition;

                    $info = $this->tracker->processRobotData($robot);

                    $robot->statusText = lang("HikrobotStatus.statuses.{$robot->status}");
                    if ($info) {
                        $robot->info = $info;
                    } else {
                        $robot->info = [];
                    }

                    $taskData = $this->taskModel->getTaskByCartCode($robot->podCode); 
                    if(!empty($taskData)) {
                        $robot->taskData = [
                            "taskCode"      => $taskData->id,
                            "taskStamp"     => $taskData->u_kidtaskstamp,
                            "origin"        => $taskData->ptoori . ' (' . $taskData->ptoorinom . ')',
                            "destination"   => $taskData->ptodes . ' (' . $taskData->ptodesnom . ')'
                        ];
                    } else {
                        $robot->taskData = [];
                    }

                    unset($robot->timestamp);
                    $robotsData[] = $robot;
                }

                $currentRobotDataHash = md5(json_encode($robotsData));

                if ($currentRobotDataHash !== $this->lastRobotDataHash) {
                    $this->lastRobotDataHash = $currentRobotDataHash;
                    $this->cachedRobotData = $robotsData; // Atualiza o cache
                    $this->broadcast([
                        'type' => 'robot_data_update',
                        'api_data' => $robotsData,
                        'timestamp' => date('Y-m-d H:i:s')
                    ]);
                }
            } else {
                echo "Error fetching AGV status data: " . json_encode($robotsResponse) . "\n";
            }
        } catch (\Throwable $e) {
            echo "Exception fetching AGV status data: {$e->getMessage()}\n";
            // Em produção, considere logar isso mais robustamente
        }
    }

    /**
     * Envia o status atual do robô para um cliente específico.
     * Usa o cache para evitar re-poll desnecessário.
     */
    protected function sendRobotStatusToClient(ConnectionInterface $conn)
    {
        if (!empty($this->cachedRobotData)) {
            $conn->send(json_encode([
                'type' => 'robot_data_update',
                'api_data' => $this->cachedRobotData,
                'timestamp' => date('Y-m-d H:i:s')
            ]));
        } else {
            // Se o cache estiver vazio (ex: no primeiro cliente), dispara um poll para preencher
            $this->pollRobotData();
            // E então tenta enviar novamente após o poll (pode ser assíncrono, então não garante no mesmo ciclo)
            // Para garantir, você poderia ter um callback ou enviar de dentro do pollRobotData após o primeiro fetch.
        }
    }

    /**
     * Consulta a informação da rack para um posCode específico e envia para um cliente.
     * @param string $posCode O código da posição a ser verificada (ex: "DP2_101").
     * @param ConnectionInterface|null $conn A conexão específica para enviar (se nulo, faz broadcast).
     */
    protected function queryAndSendRackInfoByPosCode(string $posCode, ?ConnectionInterface $conn = null)
    {
        $hasRack = false;
        $podCode = "";
        helper('utilis_helper');

        $racks = [];

        $body = [
            "reqCode" => newStamp(REQ_CODE_POD_BERTH),
            "mapShortName" => MAP_SHORT_NAME
        ];

        try {
            $podBerthResponse = $this->webserviceModel->callWebservice(HIKROBOT_QUERY_POD_BERTH_MAT, $body);

            if (isset($podBerthResponse->code) && $podBerthResponse->code == '0' && isset($podBerthResponse->data)) {
                foreach ($podBerthResponse->data as $rackInfo) {
                    if (isset($rackInfo->posCode) && $rackInfo->posCode === $posCode) {
                        $hasRack = true;
                        $podCode = $rackInfo->podCode;
                        array_push($racks, array(
                            "podCode" => $podCode
                        ));
                    }
                }
            } else {
                echo "Error fetching pod berth data for rack info: " . json_encode($podBerthResponse) . "\n";
            }
        } catch (\Throwable $e) {
            echo "Exception fetching pod berth data for rack info: {$e->getMessage()}\n";
        }

        if(!empty($racks)) {
            $message = [
                'type'      => 'rack_info_at_pos_code',
                'posCode'   => $posCode,
                'hasRack'   => $hasRack,
                'racks'     => $racks,
                'timestamp' => date('Y-m-d H:i:s')
            ];

        if ($conn) {
            $conn->send(json_encode($message));
        } else {
                $this->broadcast($message);
        }
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
                new WsServer(new self($loop)) // Passa o loop para o construtor
            ),
            new SocketServer("{$addressToListen}:{$portToListen}", [], $loop),
            $loop
        );

        $loop->run();
    }
}