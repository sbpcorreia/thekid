<?php

namespace App\Controllers;

use App\Models\ArticlesModel;
use App\Models\CartsModel;
use App\Models\CutOrdersModel;
use App\Models\RulesModel;
use App\Models\SpotModel;
use App\Models\TaskLinesModel;
use App\Models\TaskModel;
use App\Models\TerminalModel;
use App\Models\WebServiceModel;
use CodeIgniter\HTTP\ResponseInterface;
use App\Models\WorkOrdersModel;
use CodeIgniter\HTTP\Response;

class Home extends BaseController
{

    protected $articlesModel;
    protected $cartsModel;    
    protected $cutOrdersModel;
    protected $ordersModel;
    protected $rulesModel;
    protected $spotsModel;
    protected $taskModel;
    protected $taskLinesModel;
    protected $terminalModel;
    protected $workOrdersModel;
    protected $webServicesModel;



    public function __construct()
    {
        $this->articlesModel    = new ArticlesModel();
        $this->cartsModel       = new CartsModel();        
        $this->cutOrdersModel   = new CutOrdersModel();
        $this->ordersModel      = null;
        $this->rulesModel       = new RulesModel();
        $this->spotsModel       = new SpotModel();
        $this->taskModel        = new TaskModel();
        $this->taskLinesModel   = new TaskLinesModel();
        $this->terminalModel    = new TerminalModel();
        $this->webServicesModel = new WebServiceModel();
        $this->workOrdersModel  = new WorkOrdersModel();        
    }

    public function index()
    {
        $config                             = new \Config\WebSocket;
        $company                            = "";
        $multiLoad                          = false;
        $terminalCode                       = $this->request->getCookie("terminalCode");        
        $addressToListen                    = $config->addressToListen;
        $portToListen                       = $config->portToListen;

        $terminalList                       = $this->terminalModel->getTerminalList();

        $this->pageData["javascriptData"]   = array(
            "site_url"  => site_url(),
            "ws_url"    => sprintf("ws://%s:%d", $addressToListen, $portToListen),
            "pwd"       => base64_encode("Lanema123")
        );

        $groupedData = [];
        foreach ($terminalList as $item) {
            $empresa = $item->empresa;
            if (!isset($groupedData[$empresa])) {
                $groupedData[$empresa] = [];
            }
            $groupedData[$empresa][] = $item;
        }

        $this->navbarData["terminalCode"]   = $terminalCode;
        $this->navbarData["terminalList"]   = $groupedData;



        if(!empty($terminalCode)) {
            $terminal                       = $this->terminalModel->getTerminalInfo($terminalCode);
            if($terminal != null) {
                $this->navbarData["terminalDescription"]    = $terminal->descricao;
                $company                                    = $terminal->empresa;
            }

            $loadLocations = $this->spotsModel->getLoadLocations($terminalCode);
            if(!empty($loadLocations) && count($loadLocations) > 1) {
                $multiLoad = true;
            }   
        }

        
        $viewData = array(
            "terminalCode"  => $terminalCode,
            "company"       => strtoupper($company),
            "multiLoad"     => $multiLoad
        );
        
        echo view("base/header", $this->pageData);
        echo view("base/navbar", $this->navbarData);
        echo view("base/prebody");
        echo view("main", $viewData);
        echo view("base/postbody");
        echo view("base/footer", $this->pageData);
    }

    public function loadTaskArea($terminalCode, $company, $multiLoad = false) {
        $viewData = array(
            "terminalCode"  => $terminalCode,
            "company"       => $company,
            "multiLoad"     => intval($multiLoad)
        );
        return view("view_cells/new_task", $viewData);
    }


    public function postTableData() : ResponseInterface {
        $request = service('request');

        $inputData = json_decode($request->getBody());

        
        //return $this->response->setJSON($input_data);

        if(!$inputData->columnsToShow) {
            return $this->response->setJSON([
                "type" => "warning",
                "message" => "Deve indicar as colunas a apresentar!"
            ]);
        }

        if(!$inputData->requestType) {
            return $this->response->setJSON([
                "type" => "warning",
                "message" => "Deve indicar o tipo de pedido!"
            ]);
        }

        $data = array();

        $columnsToShow = array_column((array) $inputData->columnsToShow, "dataField");
        $requestType = $inputData->requestType;
        $pageSize = $inputData->pageSize;
        $page = $inputData->page;
        $search = $inputData->searchTerm ?? "";
        $searchColumn = $inputData->searchColumn ?? "";
        $sortColumn = $inputData->sortColumn ?? "";
        $sortDirection = $inputData->sortDirection ?? "";
        $totalRecords = 0;

        if($requestType === "CART") {
            $totalRecords = $this->cartsModel->countData($columnsToShow, $search, $searchColumn);
            $data = $this->cartsModel->getData($columnsToShow, $page, $pageSize, $search, $searchColumn, $sortColumn, $sortDirection);
            
        } else if($requestType === "ARTICLE") {
            $totalRecords = $this->articlesModel->countData($columnsToShow, $search, $searchColumn);
            $data = $this->articlesModel->getData($columnsToShow, $page, $pageSize, $search, $searchColumn, $sortColumn, $sortDirection);
        } else if($requestType === "WORKORDER") {
            $totalRecords = $this->workOrdersModel->countData($columnsToShow, $search, $searchColumn);
            $data = $this->workOrdersModel->getData($columnsToShow, $page, $pageSize, $search, $searchColumn, $sortColumn, $sortDirection);
        } else if($requestType === "CUTORDER") {
            $totalRecords = $this->cutOrdersModel->countData($columnsToShow, $search, $searchColumn);
            $data = $this->cutOrdersModel->getData($columnsToShow, $page, $pageSize, $search, $searchColumn, $sortColumn, $sortDirection);
        } else if($requestType === "ORDER") {
            // TO WORK
        } else if($requestType === "TASKHISTORY") {
            $status = array(
                "99" => "Lançada",
                "0" => "Exceção ao enviar",
                "1" => "Criada no robot",
                "2" => "A executar",
                "3" => "A enviar",
                "4" => "A cancelar",
                "5" => "Cancelada",
                "6" => "A reenviar",
                "9" => "Concluída",
                "10" => "Interrompida"
            );

            $priorityNames = array(
                "1" => "Prioritária",
                "10" => "Normal"
            );

            $totalRecords = $this->taskModel->getPendingTasksCount($columnsToShow, $search, $searchColumn);
            $data = $this->taskModel->getPendingTasksData($columnsToShow, $page, $pageSize, $search, $searchColumn, $sortColumn, $sortDirection);

            if(!empty($data)) {
                foreach($data as $key => $value) {
                    $data[$key]->estado = $status[$data[$key]->estado];
                    $data[$key]->prioridade = $priorityNames[$data[$key]->prioridade];
                }
            }
        }
        return $this->response->setJSON([
            "type" => "success",
            "message" => "Dados carregados",
            "data" => $data,
            "totalRecords" => $totalRecords
        ]);
    }
    
    public function postCartItem() : ResponseInterface {
        $request = service('request');

        $type           = $request->getPost("type");
        $barcodeData    = $request->getPost("data");

        if(!$type) {
            return $this->response->setJSON([
                "type" => "warning",
                "message" => "Tipo de pedido não identificado!"
            ]);
        }

        if(!$barcodeData) {
            return $this->response->setJSON([
                "type" => "warning",
                "message" => "Código de barras não detetado!"
            ]);
        }

        if($type == "CART") {
            $podCode            = trim($barcodeData);
            $cart = $this->cartsModel->getDataByCode($podCode);
            if(empty($cart)) {
                return $this->response->setJSON([
                    "type" => "warning",
                    "message" => "O carrinho não foi encontrado ou encontra-se associado a uma tarefa!"
                ]); 
            }
            return $this->response->setJSON([
                "type" => "success",
                "data" => $cart
            ]);
        } else if($type == "ARTICLE") {
            $barcodeArray       = explode(";", $barcodeData);
            $articleCode        = trim($barcodeArray[1]);
            $articleLot         = trim($barcodeArray[2]);
            $articleLength      = trim($barcodeArray[3]);
            $articleWidth       = trim($barcodeArray[4]);

            $article = $this->articlesModel->getDataByParam($articleCode, $articleLot);
            if(empty($article)) {
                return $this->response->setJSON([
                    "type" => "warning",
                    "message" => "O artigo não foi encontrado, encontra-se inativo ou corresponde a um artigo de serviço!"
                ]); 
            }
            return $this->response->setJSON([
                "type" => "success",
                "data" => $article
            ]);
        } else if($type == "CUTORDER") {
            $cutOrderNumber     = trim($barcodeData);
            $cutOrder = $this->cutOrdersModel->getDataByCode($cutOrderNumber);
            if(empty($cutOrder)) {
                return $this->response->setJSON([
                    "type" => "warning",
                    "message" => "A ordem de corte não foi encontrada!"
                ]); 
            }
            return $this->response->setJSON([
                "type" => "success",
                "data" => $cutOrder
            ]);
        } else if($type == "CUTORDERPU") {
            $cutOrderStamp    = str_replace(";", "", trim($barcodeData));
            $cutOrder = $this->cutOrdersModel->getDataByStamp($cutOrderStamp);
            if(empty($cutOrder)) {
                return $this->response->setJSON([
                    "type" => "warning",
                    "message" => "A ordem de corte não foi encontrada!"
                ]); 
            }
            return $this->response->setJSON([
                "type" => "success",
                "data" => $cutOrder
            ]);
        } else if($type == "CUTORDERTEC") {
            $barcodeArray       = explode(";", $barcodeData);
            $workOrderStamp     = trim($barcodeArray[0]);
            $workOrderNumber    = trim($barcodeArray[1]);
            
            $workOrder = $this->workOrdersModel->getDataByCode($workOrderNumber);
            if(empty($workOrder)) {
                return $this->response->setJSON([
                    "type" => "warning",
                    "message" => "A ordem de fabrico não foi encontrada!"
                ]); 
            }
            return $this->response->setJSON([
                "type" => "success",
                "data" => $workOrder
            ]);
        } else if($type == "WORKORDER") {
            $workOrderNumber    = trim($barcodeData);
            $workOrder = $this->workOrdersModel->getDataByCode($workOrderNumber);
            if(empty($workOrder)) {
                return $this->response->setJSON([
                    "type" => "warning",
                    "message" => "A ordem de fabrico não foi encontrada!"
                ]); 
            }
            return $this->response->setJSON([
                "type" => "success",
                "data" => $workOrder
            ]);
        }

        return $this->response->setJSON([
            "type" => "error",
            "message" => "Tipo de pedido não encontrado!"
        ]);
    }    

    public function getUnloadLocations($currentTerminal, $multi) : ResponseInterface {
        $unloadSpots = $this->spotsModel->getUnloadLocationsExcludingTerminal($currentTerminal);

        if($multi == 1) {
            foreach($unloadSpots as $key => $value) {
                $unloadDock = $unloadSpots[$key]->id;
                $unloadSpots[$key]->rule = "";
                $ruleInfo = $this->rulesModel->getRule($currentTerminal, $unloadDock);
                if(!empty($ruleInfo)) {
                    $loadDock = $ruleInfo->ponto1;
                    $unloadSpots[$key]->rule = $loadDock;
                } else {
                    $defaultLoadDock = $this->spotsModel->getDefaultLoadingDock($currentTerminal);
                    if(!empty($defaultLoadDock)) {
                        $unloadSpots[$key]->rule = $defaultLoadDock;
                    }
                }
            }
        }
        return $this->response->setJSON($unloadSpots); 
    }

    public function getLoadLocations($currentTerminal) : ResponseInterface {
        $loadDocks = $this->spotsModel->getLoadLocations($currentTerminal);
        return $this->response->setJSON($loadDocks); 
    }

    public function postUnloadCart() : ResponseInterface {
        $request = service('request');

        helper('utilis_helper');

        $podCode = $request->getPost("podCode");
        $unloadLocation = $request->getPost("unloadLocation");

        if(!$podCode) {
            return $this->response->setJSON([
                "type" => "warning",
                "message" => "Carrinho não indicado"
            ]);
        }

        if(!$unloadLocation) {
            return $this->response->setJSON([
                "type" => "warning",
                "message" => "Deve indicar a localização!"
            ]);
        }

        $requestData = array(
            "reqCode"       => newStamp("POD"),
            "podCode"       => $podCode,
            "positionCode"  => $unloadLocation,
            "podDir"        => "0",
            "indBind"       => "0"
        );

        $result = $this->webServicesModel->callWebservice(HIKROBOT_BIND_POD_BERTH, $requestData);

        if(!$result) {
            return $this->response->setJSON([
                "type" => "error",
                "message" => "Ocorreu um erro ao descarregar carrinho!"
            ]);
        }

        if(isset($result->code) && $result->code === "0") {
            return $this->response->setJSON([
                "type" => "success",
                "message" => sprintf("Carrinho %s descarregado com sucesso!", $podCode)
            ]);
        } 

        return $this->response->setJSON([
            "type" => "error",
            "message" => "Ocorreu um erro ao descarregar o carrinho. Detalhes do erro: " . json_encode($result)
        ]);

    }

    public function postSendTask() : ResponseInterface {
        $request = service('request');

        helper('utilis_helper');

        $terminalCode       = $request->getPost("terminalCode");
        $company            = $request->getPost("company");
        $cartCode           = $request->getPost("cartCode");
        $loadDock           = $request->getPost("loadDock");
        $unloadDock         = $request->getPost("unloadDock");
        $priority           = $request->getPost("priority");        
        $taskLines          = $request->getPost("taskd");        

        if(!$terminalCode) {
            return $this->response->setJSON([
                "type"      => "error",
                "message"   => "Não foi definido o ID do terminal!"
            ]);
        }

        if(empty($taskLines)) {
            return $this->response->setJSON([
                "type"      => "warning",
                "message"   => "Não foi indicado o conteúdo do carrinho!"
            ]);
        }

        if(!$priority) {
            $priority = 10;
        } 

        if(!$loadDock) {
            $defaultDock = $this->spotsModel->getDefaultLoadingDock($terminalCode);
            if(empty($defaultDock)) {
                return $this->response->setJSON([
                    "type"      => "error",
                    "message"   => "Não foi possível determinar o cais de carga do terminal! Por favor, contacte administrador!"
                ]);
            }
            $loadDock   = $defaultDock->ponto;
        }

        $taskStamp = newStamp("TSK");
        $result = $this->taskModel->addNewTask($taskStamp, $cartCode, $loadDock, $unloadDock, intval($priority), "TSK");
        if(!$result) {
            return $this->response->setJSON([
                "type" => "error",
                "message" => "Ocorreu um erro ao enviar a tarefa!"
            ]);
        }

        foreach($taskLines as $key => $value) {
            $taskLines[$key]["u_kidtaskdstamp"] = newStamp("TSD");
            $taskLines[$key]["u_kidtaskstamp"] = $taskStamp;          
        }

        $result = $this->taskLinesModel->insertBatch($taskLines);
        if(!$result) {
            return $this->response->setJSON([
                "type" => "error",
                "message" => "Ocorreu um erro ao adicionar as linhas da tarefa!"
            ]);
        }        
        return $this->response->setJSON([
            "type" => "success",
            "message" => "Tarefa enviada!"
        ]);
    }

    public function postSetTerminal() : ResponseInterface {
        $request = service('request');

        $terminal = $request->getPost("terminal");

        if(!$terminal) {
            return $this->response->setJSON([
                "type" => "error",
                "message" => "O campo do terminal é obrigatório!"
            ]);
        }

        $this->response->setCookie([
            "name"      => "terminalCode",
            "value"     => $terminal,
            "expire"    => 60 * 60 * 24 * 365 * 10, // 10 anos,
            "path"      => "/",
            "secure"    => false,
            "httponly"  => false
        ]); 

        return $this->response->setJSON([   
            "type" => "success",
            "message" => "Terminal configurado... a recarregar página...",
        ]);
    }


}
