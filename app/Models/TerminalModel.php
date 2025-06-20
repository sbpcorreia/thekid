<?php

namespace App\Models;

use CodeIgniter\Model;

class TerminalModel extends Model {

    protected $table = "u_kidterm";

    protected $primaryKey = "u_kidtermstamp";

    protected $allowedFields = ["u_kidtermstamp", "codigo", "descricao", "ponto", "ponto2", "ousrinis", "ousrdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    public function getTerminalInfo($terminalCode) {
        $builder = $this->db->table($this->table);
        $builder->select("u_kidterm.*, ponto1.empresa");
        $builder->where("codigo", $terminalCode);
        $builder->join("u_kidspots AS ponto1", "ponto1.ponto=u_kidterm.ponto", "LEFT", false);
        $query = $builder->get();
        return $query->getRow();
    }

    public function getTerminalList() {
        $builder = $this->db->table($this->table);
        $builder->select("u_kidterm.codigo, u_kidterm.descricao, u_kidterm.ponto, u_kidterm.ponto2, ponto1.empresa");
        $builder->join("u_kidspots AS ponto1", "ponto1.ponto=u_kidterm.ponto", "LEFT", false);
        $builder->join("u_kidspots AS ponto2", "ponto2.ponto=u_kidterm.ponto2", "LEFT", false);
        $builder->orderBy("ISNULL(ponto1.empresa, '')");
        $builder->orderBy("u_kidterm.codigo");
        $query = $builder->get();
        return $query->getResult();
    }
}