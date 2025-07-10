<?php

namespace App\Models;

use CodeIgniter\Model;

class RulesModel extends Model {

    protected $table = "u_kidrules";

    protected $primaryKey = "u_kidrulesstamp";

    protected $allowedFields = ["u_kidrulesstamp", "ponto1", "ponto2", "terminal", "id", "ousrinis", "ousrdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    public function getRule($terminalCode, $unloadDock) {
        $builder = $this->db->table($this->table);
        $builder->select("ponto1");
        $builder->where("terminal", $terminalCode);
        $builder->where("ponto2", $unloadDock);
        $query = $builder->get();
        return $query->getRow();
    }

}