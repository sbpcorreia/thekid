<?php

namespace App\Controllers;

use App\Models\ArticlesModel;
use App\Models\CartsModel;
use App\Models\CutOrdersModel;
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
    public function index()
    {
        $company = $origin = "";
        $terminalCode = $this->request->getCookie("terminalCode");

        $terminalModel = new TerminalModel();
        //log_message("error", json_encode($terminalCode));

        $config             = new \Config\WebSocket;
        $addressToListen  = $config->addressToListen;
        $portToListen     = $config->portToListen;

        $terminalList = $terminalModel->getTerminalList();

        $this->pageData["javascriptData"] = array(
            "site_url"  => site_url(),
            "ws_url"    => sprintf("ws://%s:%d", $addressToListen, $portToListen)
        );

        $this->navbarData["terminalCode"] = $terminalCode;
        $this->navbarData["terminalList"] = $terminalList;

        if(!empty($terminalCode)) {
            $terminal = $terminalModel->getTerminalInfo($terminalCode);
            if($terminal != null) {
                $this->navbarData["terminalDescription"] = $terminal->descricao;
                
                $company = $terminal->empresa;
                $origin = $terminal->ponto;
            }
        }

        $viewData = array(
            "terminalCode"  => $terminalCode,
            "company"       => strtoupper($company),
            "origin"        => $origin
        );
        
        echo view("base/header", $this->pageData);
        echo view("base/navbar", $this->navbarData);
        echo view("base/prebody");
        echo view("main", $viewData);
        echo view("base/postbody");
        echo view("base/footer", $this->pageData);
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

        $columnsToShow = array_column((array) $inputData->columnsToShow, "field");
        $requestType = $inputData->requestType;
        $pageSize = $inputData->pageSize;
        $page = $inputData->page;
        $search = $inputData->search;
        $searchColumn = $inputData->searchColumn;
        $sortColumn = $inputData->sortColumn;
        $sortDirection = $inputData->sortDirection;
        $totalRecords = 0;

        if($requestType === "CART") {
            $cartsModel = new CartsModel();
            $totalRecords = $cartsModel->countData($columnsToShow, $search, $searchColumn);
            $data = $cartsModel->getData($columnsToShow, $page, $pageSize, $search, $searchColumn, $sortColumn, $sortDirection);
            
        } else if($requestType === "ARTICLE") {
            $articlesModel = new ArticlesModel();
            $totalRecords = $articlesModel->countData($columnsToShow, $search, $searchColumn);
            $data = $articlesModel->getData($columnsToShow, $page, $pageSize, $search, $searchColumn, $sortColumn, $sortDirection);
        } else if($requestType === "WORKORDER") {
            // TO WORK
        } else if($requestType === "CUTORDER") {
            $cutOrdersModel = new CutOrdersModel();
            $totalRecords = $cutOrdersModel->countData($columnsToShow, $search, $searchColumn);
            $data = $cutOrdersModel->getData($columnsToShow, $page, $pageSize, $search, $searchColumn, $sortColumn, $sortDirection);

        } else if($requestType === "ORDER") {
            // TO WORK
        }
        return $this->response->setJSON([
            "type" => "success",
            "message" => "Dados carregados",
            "data" => $data,
            "totalRecords" => $totalRecords
        ]);
    }
    
    public function loadTaskArea($terminalCode, $company, $origin) {
        $viewData = array(
            "terminalCode"  => $terminalCode,
            "company"       => $company,
            "origin"        => $origin
        );
        return view("view_cells/new_task", $viewData);
    }

    public function getUnloadLocations() : ResponseInterface {
        $spotsModel = new SpotModel();

        $unloadSpots = $spotsModel->getUnloadLocations();

        return $this->response->setJSON($unloadSpots); 
    }

    public function postSendTask() : ResponseInterface {
        $request = service('request');

        helper('utilis_helper');

        $terminalCode = $request->getPost("terminalCode");
        $origin = $request->getPost("origin");
        $destination = $request->getPost("destination");
        $cartCode = $request->getPost("cartCode");
        $company = $request->getPost("company");
        $taskLines = $request->getPost("taskd");

        if(!$terminalCode) {
            return $this->response->setJSON([
                "type" => "error",
                "message" => "Não foi definido o ID do terminal!"
            ]);
        }

        if(empty($taskLines)) {
            return $this->response->setJSON([
                "type" => "warning",
                "message" => "Não foi indicado o conteúdo do carrinho!"
            ]);
        }
        //return $this->response->setJSON($taskLines);

        $taskModel = new TaskModel();
        $taskLinesModel = new TaskLinesModel();

        $taskStamp = newStamp("TSK");
        $result = $taskModel->addNewTask($taskStamp, $cartCode, $origin, $destination, 0, "TSK");
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

        $result = $taskLinesModel->insertBatch($taskLines);
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
