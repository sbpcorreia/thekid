<?php

namespace App\Models;

use CodeIgniter\Model;

class SpotModel extends Model {

    protected $table = "u_kidspots";

    protected $primaryKey = "u_kidspotsstamp";

    protected $allowedFields = ["u_kidspotsstamp", "ponto", "descricao", "tipo", "empresa", "terminal", "ousrinis", "ousrdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    public function getSpotInfo($spotCode) {
        $builder = $this->db->table($this->table);
        $builder->where("ponto", $spotCode);
        $query = $builder->get();
        return $query->getRow();
    }

    public function getUnloadLocations($terminal, $except = "") {
        $builder = $this->db->table($this->table);
        $builder->select("ponto AS id, '(' + ponto + ') ' descricao AS name");
        $builder->whereIn("tipo", array(2,3));
        $builder->where("terminal", $terminal);
        if($except) {
            $builder->where("ponto!=", $except);
        }
        $query = $builder->get();
        return $query->getResult();
    }

    public function getUnloadLocationsExcludingTerminal($terminal) {
        $builder = $this->db->table($this->table);
        $builder->select("ponto AS id, '(' + ponto + ') ' + descricao AS name");
        $builder->whereIn("tipo", array(2,3));
        $builder->where("terminal!=", $terminal);
        $query = $builder->get();
        return $query->getResult();
    }

    public function getLoadLocations($terminal) {
        $builder = $this->db->table($this->table);
        $builder->select("ponto AS id, '(' + ponto + ') ' + descricao AS name");
        $builder->whereIn("tipo", array(1,3));
        $builder->where("terminal", $terminal);
        $query = $builder->get();
        return $query->getResult();
    }

    public function getDefaultLoadingDock($terminal) {
        $builder = $this->db->table($this->table);
        $builder->select("ponto");
        $builder->where("terminal", $terminal);
        $builder->whereIn("tipo", array(1,3));
        $builder->orderBy("ponto", "ASC");
        $query = $builder->get();
        return $query->getRow();
    }

    public function getDefaultUnloadDock($terminal) {
        $builder = $this->db->table($this->table);
        $builder->select("ponto");
        $builder->where("terminal", $terminal);
        $builder->whereIn("tipo", array(2,3));
        $builder->orderBy("ponto", "ASC");
        $query = $builder->get();
        return $query->getRow();
    }
}