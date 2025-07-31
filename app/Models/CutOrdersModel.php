<?php

namespace App\Models;

use CodeIgniter\Model;

class CutOrdersModel extends Model {

    protected $table = "u_ordemcorte";

    protected $primaryKey = "u_ordemcortestamp";

    public function countData($columns, $search = "", $searchColumn = "") {
        $builder = $this->db->table($this->table);
        $builder->selectCount("u_ordemcortestamp", "count");
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

    public function getData($columns, $page = 1, $pageSize = 20, $search = "", $searchColumn = "", $sortColumn = "", $sortDirection = "asc") {
        $builder = $this->db->table($this->table);
        $builder->select("u_ordemcortestamp AS id, numordem, u_ordemcortestamp [oristamp], 'Ordem de corte' [orinmdoc]", false);
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
            $builder->orderBy("numordem", "ASC");
        }
        
        $query = $builder->get($pageSize, ($pageSize) * ($page-1));
        return $query->getResult();    
    }

    public function getDataByCode($cutOrderNumer) {
        $builder = $this->db->table($this->table);
        $builder->select("u_ordemcortestamp AS id, numordem [orindoc], u_ordemcortestamp [oristamp], 'Ordem de corte' [orinmdoc]", false);
        $builder->where("numordem", $cutOrderNumer);
        $query = $builder->get();
        return $query->getRow();
    }

    public function getDataByStamp($cutOrderStamp) {
        $builder = $this->db->table($this->table);
        $builder->select("u_ordemcortestamp AS id, numordem [orindoc], u_ordemcortestamp [oristamp], 'Ordem de corte' [orinmdoc]", false);
        $builder->where("u_ordemcortestamp", $cutOrderStamp);
        $query = $builder->get();
        return $query->getRow();
    }

    public function getProdJAByStamp($bostamp) {
        $builder = $this->db->table("bo");
        $builder->select("bostamp AS id, obrano [orindoc], bostamp [oristamp], 'Ordem de corte JA' [orinmdoc]");
        $builder->where("bostamp", $bostamp);
        $query = $builder->get();
        return $query->getRow();
    }
}