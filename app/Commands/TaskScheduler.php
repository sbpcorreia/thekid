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
    protected $description = 'Checks for new tasks and updates robot status every 5 seconds.';
    protected $tasksModel;
    protected $webserviceModel;

    public function run(array $params)
    {
        $logger = Services::logger();
        $logger->info('Starting Task Scheduler...'); // Log de informação
        echo "A iniciar gestor de tarefas\n";

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
                    foreach ($pendingTasks as $task) {
                        $this->updateTaskStatusFromRobot($task, $logger);
                    }
                }                
            } catch (\Throwable $e) { 
                $logger->error('An unhandled error occurred in Task Scheduler: ' . $e->getMessage() . ' on line ' . $e->getLine() . ' in ' . $e->getFile());
                echo 'An unhandled error occurred in Task Scheduler: ' . $e->getMessage() . ' on line ' . $e->getLine() . ' in ' . $e->getFile() . "\n";
            }

            sleep(5);
        }
    }

    private function sendTaskToRobot($task, $logger) {
        helper('utilis_helper');

        $taskStamp = trim($task->u_kidtaskstamp);

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
            $responseData = new stdClass();
            $responseData->code = 0;
            if(isset($responseData->code) && $responseData->code === '0') {
                $logger->info("Task sent successfully! Task ID: " . ($responseData->data ?? 'N/A') . ". ReqCode: " . $requestData["reqCode"]);
                echo "Task sent successfully! Task ID: " . ($responseData->data ?? 'N/A') . ". ReqCode: " . $requestData["reqCode"] . "\n";
                $this->tasksModel->updateTaskStatus($taskStamp, 1);
            } else {
                $errorMessage = "Failed to send task with ReqCode " . $requestData['reqCode'] . ": " . ($responseData->message ?? 'Unknown API error');
                $logger->error($errorMessage . " Response: " . json_encode($responseData));
                echo $errorMessage . " Response: " . json_encode($responseData) . "\n";
            }        
        } catch (\CodeIgniter\HTTP\Exceptions\HTTPException $e) { // Erros de HTTP, como timeout, etc.
            $logger->error("HTTP error sending task ".$taskStamp." (ReqCode " . $requestData['reqCode'] . "): " . $e->getMessage());
        } catch (\Exception $e) { // Outros erros gerais
            $logger->error("General error sending task ".$taskStamp." (ReqCode " . $requestData['reqCode'] . "): " . $e->getMessage());
        }
    }

    private function updateTaskStatusFromRobot($task, $logger) {
        helper('utilis_helper');

        $taskStamp = trim($task->u_kidtaskstamp);

        $requestData = array(
            'reqCode' => newStamp("QTS"),
            'taskCode' => $taskStamp,
        );

        try {
            $responseData = $this->webserviceModel->callWebservice(HIKROBOT_GEN_AGV_SCHEDULING_TASK, $requestData);
            if (isset($responseData->code) && $responseData->code === '0') {
                $status = $responseData->data->taskStatus ?? '0';
                $logger->info("Task " . $taskStamp . " status updated to: " . $status . ". ReqCode: " . $requestData['reqCode']);
                echo "Task " . $taskStamp . " status updated to: " . $status . ". ReqCode: " . $requestData['reqCode'] . "\n";
                $this->tasksModel->updateTaskStatus($taskStamp, $status);
            } else {
                $errorMessage = "Failed to query status for task " . $taskStamp . " (ReqCode " . $requestData['reqCode'] . "): " . ($responseData->message ?? 'Unknown API error');
                $logger->error($errorMessage . " Response: " . json_encode($responseData));
                echo $errorMessage . " Response: " . json_encode($responseData) . "\n";
            }
        } catch (\CodeIgniter\HTTP\Exceptions\HTTPException $e) {
            $logger->error("HTTP error querying task status for task " . $taskStamp . " (ReqCode " . $requestData['reqCode'] . "): " . $e->getMessage());
        } catch (\Exception $e) {
            $logger->error("General error querying task status for task " . $taskStamp . " (ReqCode " . $requestData['reqCode'] . "): " . $e->getMessage());
        }
    }

    
}