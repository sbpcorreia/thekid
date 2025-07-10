<?php

namespace App\Models;

use CodeIgniter\Model;

class TerminalModel extends Model {

    protected $table = "u_kidterm";

    protected $primaryKey = "u_kidtermstamp";

    protected $allowedFields = ["u_kidtermstamp", "codigo", "descricao", "ousrinis", "ousrdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    public function getTerminalInfo($terminalCode) {
        $builder = $this->db->table($this->table);
        $builder->select("u_kidterm.*");
        $builder->where("codigo", $terminalCode);
        $query = $builder->get();
        return $query->getRow();
    }

    public function getTerminalList() {
        $builder = $this->db->table($this->table);
        $builder->select("u_kidterm.codigo, u_kidterm.descricao, u_kidterm.empresa");
        $builder->orderBy("u_kidterm.codigo");
        $query = $builder->get();
        return $query->getResult();
    }
}