<?php

namespace App\Models;

use CodeIgniter\Database\RawSql;
use CodeIgniter\Model;

class TaskModel extends Model {

    protected $table = "u_kidtask";

    protected $primaryKey = "u_kidtaskstamp";

    protected $allowedFields = ["u_kidtaskstamp", "data", "hora", "carrinho", "ptoori", "ptodes", "estado", "prioridade", "enviado", "pontos", "dtini", "dtfim", "hini", "hfim", "tempo", "ousrinis", "ousrdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

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
        $builder->whereNotIn("estado", array(9,99));
        $query = $builder->get();
        return $query->getResultArray();
    }

    public function getCreatedTasks() {
        $builder = $this->db->table($this->table);
        $builder->whereIn("estado", array(99));
        $query = $builder->get();
        return $query->getResult();
    }

    public function updateTaskStatus($taskStamp, $status, $points = 0, $estimatedTime = 0, $user = "XAX") {
        $builder = $this->db->table($this->table);
        if($status == 2) {
            $builder->set("dtini", "CONVERT(DATE, GETDATE(), 104)", false);
            $builder->set("hini", "CONVERT(VARCHAR(8),GETDATE(), 108)", false);
        }     
        if($status == 9) {
            $builder->set("dtfim", "CONVERT(DATE, GETDATE(), 104)", false);
            $builder->set("hfim", "CONVERT(VARCHAR(8),GETDATE(), 108)", false);
        }   
        $builder->set("estado", $status);
        if(!$points > 0) {
            $builder->set("pontos", $points);
        }
        if($estimatedTime > 0) {
            $builder->set("tempo", $estimatedTime);
        }        
        $builder->set("usrdata", "CONVERT(DATE, GETDATE(), 104)", false);
        $builder->set("usrhora", "CONVERT(VARCHAR(8), GETDATE(), 108)", false);
        $builder->where("u_kidtaskstamp", $taskStamp);
        return $builder->update();
    }

    public function addNewTask($taskStamp, $cartCode, $startLocation, $endLocation, $priority = 0, $user = "XAX") {
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
        $builder->set("ousrdata", "CONVERT(DATE,GETDATE(),104)", false);
        $builder->set("ousrhora", "CONVERT(VARCHAR(8), GETDATE(), 108)", false);
        $builder->set("ousrinis", $user);
        $builder->set("usrdata", "CONVERT(DATE,GETDATE(),104)", false);
        $builder->set("usrhora", "CONVERT(VARCHAR(8), GETDATE(), 108)", false);
        $builder->set("usrinis", $user);
        return $builder->insert();
    }

    

}