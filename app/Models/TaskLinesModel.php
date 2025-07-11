<?php

namespace App\Models;

use CodeIgniter\Model;

class TaskLinesModel extends Model {

    protected $table = "u_kidtaskd";

    protected $primaryKey = "u_kidtaskdstamp";

    protected $allowedFields = ["u_kidtaskdstamp", "u_kidtaskstamp", "ref", "design", "ststamp", "qtt", "tipo", "oristamp", "orindoc", "orinmdoc", "empresa", "ousrinis", "ousrdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    public function countData($taskStamp) {
        $builder = $this->db->table($this->table);
        $builder->selectCount("u_kidtaskdstamp", "count");
        $builder->where("u_kidtaskstamp", $taskStamp);
        $query = $builder->get();
        $res = $query->getRow();
        return $res->count;
    }

    public function getData($taskStamp, $page = 1, $pageSize = 20) {
        $builder = $this->db->table($this->table);
        $builder->select("*");
        $builder->where("u_kidtaskstamp", $taskStamp);
        $query = $builder->get($pageSize, ($pageSize) * ($page-1));
        return $query->getResult();  
    }

    
}