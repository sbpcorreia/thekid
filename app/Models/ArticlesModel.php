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
                $builder->like($searchColumn, $searchColumn);
            }
        }
        $builder->where("inactivo", 0);
        $builder->where("stns", 0);
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
                $builder->like($searchColumn, $searchColumn);
            }
        }
        $builder->where("inactivo", 0);
        $builder->where("stns", 0);
        $builder->notLike("ref", "POLY", "right");
        if(!empty($sortColumn)) {
            $builder->orderBy($sortColumn, $sortDirection);
        }    

        $query = $builder->get($pageSize, ($pageSize) * ($page-1));
        return $query->getResult();    
    }

}