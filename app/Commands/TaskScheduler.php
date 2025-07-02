<?php 

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use CodeIgniter\HTTP\CURLRequest;
use Config\Services; // Para aceder ao Logger

use App\Models\TaskModel;
use App\Models\WebServiceModel;
use stdClass;

class TaskScheduler extends BaseCommand
{
    protected $group       = 'Custom';
    protected $name        = 'schedule-tasks:start';
    protected $description = 'Verifica a existência de novas tarefas e atualiza os estados das mesmas de 5 em 5 segundos.';
    protected $tasksModel;
    protected $webserviceModel;

    public function run(array $params)
    {
        $logger = Services::logger();
        $logger->info('A iniciar Task Scheduler...'); 

        $this->tasksModel = new TaskModel();
        $this->webserviceModel = new WebServiceModel();

        while (true) {
            $logger->info('Checking for tasks at ' . date('Y-m-d H:i:s'));

            try {
                $newTasks = $this->tasksModel->getCreatedTasks();
                if(!empty($newTasks)) {
                    foreach ($newTasks as $task) {
                        $this->sendTaskToRobot($task, $logger); 
                    }
                }
                
                $pendingTasks = $this->tasksModel->getPendingTasks();
                if(!empty($pendingTasks)) {
                    $this->updateTaskStatusFromRobot($pendingTasks, $logger);
                }                
            } catch (\Throwable $e) { 
                $logger->error('Ocorreu um erro na classe TaskScheduler: ' . $e->getMessage() . ' na linha ' . $e->getLine() . ' ficheiro ' . $e->getFile());
            }

            sleep(5);
        }
    }

    private function sendTaskToRobot($task, $logger) {
        helper('utilis_helper');

        $taskStamp = trim($task->u_kidtaskstamp);
        $racks = [];

        // VERIFICA SE A RACK ESTÁ NALGUMA LOCALIZAÇÃO
        $requestData = array(
            "reqCode" => newStamp("QPD"),
            "mapShortName" => "LN_Floor00"
        );

        // CERTIFICA-SE QUE A RACK ESTÁ MESMO FORA DE QUALQUER OUTRA LOCALIZAÇÃO
        try {
            $responseData = $this->webserviceModel->callWebservice(HIKROBOT_QUERY_POD_BERTH_MAT, $requestData);
            if(isset($responseData->code) && $responseData->code === '0') {
                $logger->info("Informação acerca das racks obtida com sucesso! Detalhes: " . json_encode($responseData));
                $racks = $responseData->data;               
            } else {
                $logger->error("Erro ao obter info. acerca das racks. Resposta: " . json_encode($responseData));
            }        
        } catch (\CodeIgniter\HTTP\Exceptions\HTTPException $e) {
            $logger->error("Ocorreu um erro HTTP ao enviar a tarefa ".$taskStamp." (Requisição: " . $requestData['reqCode'] . "): " . $e->getMessage());
        } catch (\Exception $e) {
            $logger->error("Erro genérico ao enviar tarefa ".$taskStamp." (Requisição: " . $requestData['reqCode'] . "): " . $e->getMessage());
        }

        // SE HOUVER RACKS VINCULADAS, TENTA DESVINCULAR A QUE ESTÁ DEFINIDA NA TAREFA
        if(!empty($racks)) {
            foreach($racks as $rack) {
                $rackCode = trim($rack->podCode);
                if($rackCode !== trim($task->carrinho)) continue;

                $requestData = array(
                    "reqCode" => newStamp("POD"),
                    "podCode" => $rack->podCode,
                    "positionCode" => $rack->positionCode
                );

                try {
                    $responseData = $this->webserviceModel->callWebservice(HIKROBOT_BIND_POD_BERTH, $requestData);
                    if(isset($responseData->code) && $responseData->code === '0') {
                        $logger->info("Rack desvinculada da localização com sucesso! Detalhes: " . json_encode($responseData));            
                    } else {
                        $logger->error("Erro ao desvincular rack. Resposta: " . json_encode($responseData));
                    }        
                } catch (\CodeIgniter\HTTP\Exceptions\HTTPException $e) {
                    $logger->error("Ocorreu um erro HTTP ao desvincular a localização a rack ".$rackCode." (Requisição: " . $requestData['reqCode'] . "): " . $e->getMessage());
                } catch (\Exception $e) {
                    $logger->error("Erro genérico ao desvincular a localização a rack".$rackCode." (Requisição: " . $requestData['reqCode'] . "): " . $e->getMessage());
                }
            }
        }

        // ENVIO DA TAREFA AO ROBOT
        $requestData = array(
            "reqCode" => newStamp("CTM"),
            "taskTyp" => "ZLN101",
            "positionCodePath" => array(
                array(
                    "positionCode" => $task->ptoori,
                    "type" => "00"
                ),
                array(
                    "positionCode" => $task->ptodes,
                    "type" => "00"
                )
            ),
            "priority" => $task->prioridade,
            "taskCode" => $taskStamp
        );

        try {           
            $responseData = $this->webserviceModel->callWebservice(HIKROBOT_GEN_AGV_SCHEDULING_TASK, $requestData);
            if(isset($responseData->code) && $responseData->code === '0') {
                $logger->info("Tarefa enviada com sucesso para o robot! Task ID: " . ($responseData->data ?? 'N/A') . ". Requisição: " . $requestData["reqCode"] . "Resposta" . json_encode($responseData));
                
                $result = $this->tasksModel->updateTaskStatus($taskStamp, 1);
                if(!$result) {
                    $logger->error("Ocorreu um erro ao atualizar o estado da tarefa na base de dados!");
                }
            } else {
                $errorMessage = "Erro ao enviar a tarefa para o robot com a requisição " . $requestData['reqCode'] . ": " . ($responseData->message ?? 'Erro desconhecido da API');
                $logger->error($errorMessage . " Resposta: " . json_encode($responseData));
            }        
        } catch (\CodeIgniter\HTTP\Exceptions\HTTPException $e) {
            $logger->error("Ocorreu um erro HTTP ao desvincular a localização a tarefa ".$taskStamp." (Requisição: " . $requestData['reqCode'] . "): " . $e->getMessage());
        } catch (\Exception $e) { 
            $logger->error("Erro genérico ao enviar a tarefa ".$taskStamp." (Requisição: " . $requestData['reqCode'] . "): " . $e->getMessage());
        }
    }

    private function updateTaskStatusFromRobot($tasks, $logger) {
        helper('utilis_helper');

        $tasksCodes = array_column($tasks, "u_kidtaskstamp");

        $requestData = array(
            'reqCode' => newStamp("QTS"),
            'taskCodes' => $tasksCodes
        );

        try {
            $responseData = $this->webserviceModel->callWebservice(HIKROBOT_QUERY_TASK_STATUS, $requestData);
            if (isset($responseData->code) && $responseData->code === '0') {
               
                $tasksStatuses = $responseData->data;
                if(!empty($tasksStatuses)) {
                    foreach($tasksStatuses as $taskStatus) {
                        $taskStamp = $taskStatus->taskCode;
                        $status = intval($taskStatus->taskStatus);
                        $result = $this->tasksModel->updateTaskStatus($taskStamp, $status);
                        if(!$result) {
                            $logger->error("Ocorreu um erro ao atualizar o estado da tarefa " . $taskStamp . " para o estado " . $status);
                        } else {
                            $logger->info("Task " . $taskStamp . " status updated to: " . $status . ". ReqCode: " . $requestData['reqCode']);
                        }
                    }
                }                
            } else {
                $errorMessage = "UTFR Failed to query status for tasks list (ReqCode " . $requestData['reqCode'] . "): " . ($responseData->message ?? 'Unknown API error');
                $logger->error($errorMessage . " Response: " . json_encode($responseData));
            }
        } catch (\CodeIgniter\HTTP\Exceptions\HTTPException $e) {
            $logger->error("HTTP error querying task status for task " . $taskStamp . " (ReqCode " . $requestData['reqCode'] . "): " . $e->getMessage());
        } catch (\Exception $e) {
            $logger->error("General error querying task status for task " . $taskStamp . " (ReqCode " . $requestData['reqCode'] . "): " . $e->getMessage());
        }
    }    
}