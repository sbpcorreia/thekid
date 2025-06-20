<?php

namespace App\Models;

use CodeIgniter\Model;

class TaskModel extends Model {

    protected $table = "u_kidtask";

    protected $primaryKey = "u_kidtaskstamp";

    protected $allowedFields = ["u_kidtaskstamp", "data", "hora", "carrinho", "ptoori", "ptodes", "estado", "prioridade", "enviado", "pontos", "id", "dtini", "dtfim", "hini", "hfim", "tempo", "ousrinis", "ousrdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    public function getTaskByCartCode($cartCode) {
        $builder = $this->db->table($this->table);
        $builder->select("u_kidtaskstamp, id, ptoori, ptodes");
        $builder->where("carrinho", $cartCode);
        $builder->where("estado", 2);
        $query = $builder->get();
        return $query->getRow();
    }

    public function markTaskAsDone($taskStamp) {
        $builder = $this->db->table($this->table);
        $builder->set("dtfim", "CONVERT(DATE, GETDATE(), 104)", false);
        $builder->set("hfim", "CONVERT(VARCHAR(8),GETDATE(), 108)", false);
        $builder->set("estado", 4);
        $builder->where("u_kidtaskstamp", $taskStamp);
        return $builder->update();
    }

    public function markTaskAsStarted($taskStamp, $points = 0, $estimatedTime = 0) {
        $builder = $this->db->table($this->table);
        $builder->set("dtini", "CONVERT(DATE, GETDATE(), 104)", false);
        $builder->set("hini", "CONVERT(VARCHAR(8),GETDATE(), 108)", false);
        $builder->set("pontos", $points);
        $builder->set("tempo", $estimatedTime);
        $builder->where("u_kidtaskstamp", $taskStamp);
        return $builder->update();
    }

    public function addNewTask($taskStamp, $cartCode, $startLocation, $endLocation, $priority = 0, $user = "XAX") {
        $builder = $this->db->table($this->table);
        $builder->set("u_kidtaskstamp", $taskStamp);
        $builder->set("id", "ISNULL(MAX(id),0)+1", false);
        $builder->set("data", "CONVERT(DATE, GETDATE(),104)", false);
        $builder->set("hora", "CONVERT(VARCHAR(8), GETDATE(), 108)", false);
        $builder->set("carrinho", $cartCode);
        $builder->set("ptoori", $startLocation);
        $builder->set("ptodes", $endLocation);
        $builder->set("prioridade", $priority);
        $builder->set("ousrdata", "CONVERT(DATE,GETDATE(),104)", false);
        $builder->set("ousrhora", "CONVERT(VARCHAR(8), GETDATE(), 108)", false);
        $builder->set("ousrinis", $user);
        $builder->set("usrdata", "CONVERT(DATE,GETDATE(),104)", false);
        $builder->set("usrhora", "CONVERT(VARCHAR(8), GETDATE(), 108)", false);
        $builder->set("usrinis", $user);
        return $builder->insert();
    }

}