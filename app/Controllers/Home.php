<?php

namespace App\Controllers;

use App\Models\TerminalModel;
use App\Models\WebServiceModel;
use CodeIgniter\HTTP\ResponseInterface;



class Home extends BaseController
{
    public function index()
    {
        $company = "";
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
            }
        }

        $viewData = array(
            "terminalCode"  => $terminalCode,
            "company"       => strtoupper($company)
        );
        
        echo view("base/header", $this->pageData);
        echo view("base/navbar", $this->navbarData);
        echo view("base/prebody");
        echo view("main", $viewData);
        echo view("base/postbody");
        echo view("base/footer", $this->pageData);
    }

    
    public function loadTaskArea($terminalCode, $company) {
        $viewData = array(
            "terminalCode"  => $terminalCode,
            "company"       => $company
        );
        return view("view_cells/new_task", $viewData);
    }

    public function loadAMRData() {

        $timestamp = newStamp("QAS");
        $ws = new WebServiceModel();
        $result = $ws->callWebservice(HIKROBOT_QUERY_AGV_STATUS, array("reqCode" => $timestamp, "mapCode" => "LA"));
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
