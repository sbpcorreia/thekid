<?php

namespace App\Models;

use CodeIgniter\Database\RawSql;
use CodeIgniter\Model;

class TaskModel extends Model {

    protected $table = "u_kidtask";

    protected $primaryKey = "u_kidtaskstamp";

    protected $allowedFields = ["u_kidtaskstamp", "data", "hora", "carrinho", "ptoori", "ptodes", "estado", "prioridade", "erro", "ultmsg", "enviocarro", "enviado", "pontos", "dtini", "dtfim", "hini", "hfim", "tempo", "ousrinis", "ousrdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    public function getTaskByCartCode($cartCode) {
        $builder = $this->db->table($this->table);
        $builder->select("u_kidtaskstamp, id, ptoori, ptodes");
        $builder->where("carrinho", $cartCode);
        $builder->where("estado", 2);
        $query = $builder->get();
        return $query->getRow();
    }

    public function getPendingTasks() {
        $builder = $this->db->table($this->table);
        $query = $builder->get();
        return $query->getResultArray();
    }

    public function getPendingTasksCount($columns, $search = "", $searchColumn = "") {
        $builder = $this->db->table($this->table);
        $builder->selectCount("u_kidtaskstamp", "count");
        if(!empty($search)) {
            if($searchColumn == "global") {
                $builder->groupStart();
                foreach($columns as $key => $value) {                    
                    $builder->orLike($columns[$key], $search, "both");                    
                }
                $builder->groupEnd();
            } else {
                $builder->like($searchColumn, $search, "both");
            }
        }
        $query = $builder->get();
        $res = $query->getRow();
        return $res->count;
    }

    public function getPendingTasksData($columns, $page = 1, $pageSize = 20, $search = "", $searchColumn = "", $sortColumn = "", $sortDirection = "asc") {
        $builder = $this->db->table($this->table);
        $builder->select("u_kidtaskstamp, id, CONVERT(DATE, data, 104) AS data, hora, carrinho, ponto1.ponto AS ptoori, ponto2.ponto AS ptodes, ponto1.descricao AS ptoorinom, ponto2.descricao AS ptodesnom, estado, prioridade, estado AS estadonum, prioridade AS prioridadenum, enviocarro");
        $builder->join("u_kidspots AS ponto1", "ponto1.ponto=u_kidtask.ptoori", "left");
        $builder->join("u_kidspots AS ponto2", "ponto2.ponto=u_kidtask.ptodes", "left");
        if(!empty($search)) {
            if($searchColumn == "global") {
                $builder->groupStart();
                foreach($columns as $key => $value) {
                    $builder->orLike($columns[$key], $search, "both");                    
                }
                $builder->groupEnd();
            } else {
                $builder->like($searchColumn, $search, "both");
            }
        }
        if(!empty($sortColumn)) {
            $builder->orderBy($sortColumn, $sortDirection);
        } else {
            $builder->orderBy("id", "DESC");
        }
        $query = $builder->get($pageSize, ($pageSize) * ($page-1));
        return $query->getResult();  
    }


    public function getCreatedTasks() {
        $builder = $this->db->table($this->table);
        $builder->whereIn("estado", array(99));
        $query = $builder->get();
        return $query->getResult();
    }

    public function updateTaskStatus($taskStamp, $status = -1, $points = 0, $estimatedTime = 0, $errorCode = "", $message = "", $priority = -1) {
        $builder = $this->db->table($this->table);
        if($status == 2) {
            $builder->set("dtini", "CONVERT(DATE, GETDATE(), 104)", false);
            $builder->set("hini", "CONVERT(VARCHAR(8),GETDATE(), 108)", false);
        }     
        if($status == 9) {
            $builder->set("dtfim", "CONVERT(DATE, GETDATE(), 104)", false);
            $builder->set("hfim", "CONVERT(VARCHAR(8),GETDATE(), 108)", false);
        }   
        if($status > -1) {
            $builder->set("estado", $status);
        }        
        if(!$points > 0) {
            $builder->set("pontos", $points);
        }
        if($estimatedTime > 0) {
            $builder->set("tempo", $estimatedTime);
        }        
        if(!empty($errorCode)) {
            $builder->set("erro", $errorCode);
        }
        if(!empty($message)) {
            $builder->set("ultmsg", $message);
        }
        if($priority > -1) {
            $builder->set("prioridade", $priority);
        }
        $builder->set("usrdata", "CONVERT(DATE, GETDATE(), 104)", false);
        $builder->set("usrhora", "CONVERT(VARCHAR(8), GETDATE(), 108)", false);
        $builder->where("u_kidtaskstamp", $taskStamp);
        return $builder->update();
    }

    public function addNewTask($taskStamp, $cartCode, $startLocation, $endLocation, $priority = 0, $user = "XAX", $sendCartOnly = false) {
        $builder = $this->db->table($this->table);
        $builder->set("u_kidtaskstamp", $taskStamp);
        $builder->set("id", new RawSql("(SELECT MAX(id)+1 FROM u_kidtask)"));
        $builder->set("data", "CONVERT(DATE, GETDATE(),104)", false);
        $builder->set("hora", "CONVERT(VARCHAR(8), GETDATE(), 108)", false);
        $builder->set("carrinho", $cartCode);
        $builder->set("ptoori", $startLocation);
        $builder->set("ptodes", $endLocation);
        $builder->set("prioridade", $priority);
        $builder->set("estado", 99);
        $builder->set("enviocarro", $sendCartOnly);
        $builder->set("ousrdata", "CONVERT(DATE,GETDATE(),104)", false);
        $builder->set("ousrhora", "CONVERT(VARCHAR(8), GETDATE(), 108)", false);
        $builder->set("ousrinis", $user);
        $builder->set("usrdata", "CONVERT(DATE,GETDATE(),104)", false);
        $builder->set("usrhora", "CONVERT(VARCHAR(8), GETDATE(), 108)", false);
        $builder->set("usrinis", $user);
        return $builder->insert();
    }

    

}