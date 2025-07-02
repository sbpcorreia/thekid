<?php

namespace App\Models;

use CodeIgniter\Model;

class SpotModel extends Model {

    protected $table = "u_kidspots";

    protected $primaryKey = "u_kidspotsstamp";

    protected $allowedFields = ["u_kidspotsstamp", "ponto", "descricao", "tipo", "empresa", "ousrinis", "ousrdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    public function getSpotInfo($spotCode) {
        $builder = $this->db->table($this->table);
        $builder->where("ponto", $spotCode);
        $query = $builder->get();
        return $query->getRow();
    }

    public function getUnloadLocations($except = "") {
        $builder = $this->db->table($this->table);
        $builder->select("ponto AS id, descricao AS name");
        $builder->where("tipo", 2);
        if($except) {
            $builder->where("ponto!=", $except);
        }
        $query = $builder->get();
        return $query->getResult();
    }
}