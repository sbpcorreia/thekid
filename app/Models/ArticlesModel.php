<?php

namespace App\Models;

use CodeIgniter\Model;

class ArticlesModel extends Model {

    protected $table = "st";

    protected $primaryKey = "ststamp";

    public function countData($columns, $search = "", $searchColumn = "") : int {
        $builder = $this->db->table($this->table);
        $builder->selectCount("ststamp", "count");
        if(!empty($search)) {
            if($searchColumn == "global") {
                foreach($columns as $key => $value) {
                    if($key == 0) {
                        $builder->like($columns[$key], $search, "both");
                    } else {
                        $builder->orLike($columns[$key], $search, "both");
                    }
                }
            } else {
                $builder->like($searchColumn, $search);
            }
        }
        $builder->where("inactivo", 0);
        $builder->where("stns", 0);
        $builder->whereNotIn("familia", array("Peças"));
        $builder->whereIn("usr4", array("PolyLanema"));
        $builder->notLike("ref", "POLY", "right");
        $query = $builder->get();
        $res = $query->getRow();
        return $res->count;
    }


    public function getData($columns, $page = 1, $pageSize = 20, $search = "", $searchColumn = "", $sortColumn = "", $sortDirection = "asc") {
        $builder = $this->db->table($this->table);
        $builder->select("ststamp AS id, ref, design, ststamp", false);

        if(!empty($search)) {
            if($searchColumn == "global") {
                foreach($columns as $key => $value) {
                    if($key == 0) {
                        $builder->like($columns[$key], $search, "both");
                    } else {
                        $builder->orLike($columns[$key], $search, "both");
                    }
                }
            } else {
                $builder->like($searchColumn, $search, "both");
            }
        }
        $builder->where("inactivo", 0);
        $builder->where("stns", 0);
        $builder->whereNotIn("familia", array("Peças"));
        $builder->whereIn("usr4", array("PolyLanema"));
        $builder->notLike("ref", "POLY", "right");
        if(!empty($sortColumn)) {
            $builder->orderBy($sortColumn, $sortDirection);
        }    

        $query = $builder->get($pageSize, ($pageSize) * ($page-1));
        return $query->getResult();    
    }

    public function getDataByParam($articleCode, $articleLot = "") {
        $builder = $this->db->table($this->table);
        $builder->select("st.ststamp AS id, st.ref, st.design, st.ststamp", false);
        if(!empty($articleLot)) {
            $builder->join("se", "se.ref=st.ref");
        }
        $builder->where("st.ref", $articleCode);
        if(!empty($articleLot)) {
            $builder->where("se.lote", $articleLot);
        }
        $builder->where("st.inactivo", 0);
        $builder->where("st.stns", 0);
        $builder->notLike("st.ref", "POLY", "right");
        $query = $builder->get();
        return $query->getResult();
    }

}