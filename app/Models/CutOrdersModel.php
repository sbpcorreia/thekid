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
        $builder->whereNotIn("estado", array(7,8));
        $query = $builder->get();
        $res = $query->getRow();
        return $res->count;
    }

    public function getData($columns, $page = 1, $pageSize = 20, $search = "", $searchColumn = "", $sortColumn = "", $sortDirection = "asc") {
        $builder = $this->db->table($this->table);
        $builder->select("u_ordemcortestamp AS id, numordem", false);

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
        $builder->whereNotIn("estado", array(7,8));
        if(!empty($sortColumn)) {
            $builder->orderBy($sortColumn, $sortDirection);
        }  
        $query = $builder->get($pageSize, ($pageSize) * ($page-1));
        return $query->getResult();    
    }
}