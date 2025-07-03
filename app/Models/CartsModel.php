<?php

namespace App\Models;

use CodeIgniter\Model;
use stdClass;

class CartsModel extends Model {
    protected $table = "u_kidcart";

    protected $primaryKey = "u_kidcartstamp";

    protected $allowedFields = ["u_kidcartstamp", "codigo", "descricao", "ousrinis", "ousrdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    public function countData($columns, $search = "", $searchColumn = "") : int {
        $builder = $this->db->table($this->table);
        $builder->selectCount("u_kidcartstamp", "count");
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
        $builder->join("u_kidtask", "u_kidtask.carrinho=u_kidcart.codigo", "left");
        $builder->groupStart();
        $builder->whereIn("u_kidtask.estado", array(9,5));
        $builder->orWhere("u_kidtask.u_kidtaskstamp IS NULL", "", false);
        $builder->groupEnd();
        $query = $builder->get();
        $res = $query->getRow();
        return $res->count;
    }

    public function getData($columns, $page = 1, $pageSize = 20, $search = "", $searchColumn = "", $sortColumn = "", $sortDirection = "asc") {
        $builder = $this->db->table($this->table);
        $builder->select("u_kidcartstamp AS id, codigo, descricao", false);

        if(!empty($search)) {
            if($searchColumn == "global") {
                $builder->groupStart();
                foreach($columns as $key => $value) {
                    $builder->orLike($columns[$key], $search, "both");                    
                }
                $builder->groupEnd();
            } else {
                $builder->like($searchColumn, $searchColumn);
            }
        }
        if(!empty($sortColumn)) {
            $builder->orderBy($sortColumn, $sortDirection);
        }    
        $builder->join("u_kidtask", "u_kidtask.carrinho=u_kidcart.codigo", "left");
        $builder->groupStart();
        $builder->whereIn("u_kidtask.estado", array(9,5));
        $builder->orWhere("u_kidtask.u_kidtaskstamp IS NULL", "", false);
        $builder->groupEnd();
        $query = $builder->get($pageSize, ($pageSize) * ($page-1));
        return $query->getResult();        
    }

    public function getDataByCode($cartCode) {
        $builder = $this->db->table($this->table);
        $builder->select("u_kidcartstamp AS id, codigo, descricao", false);
        $builder->join("u_kidtask", "u_kidtask.carrinho=u_kidcart.codigo", "left");
        $builder->where("u_kidcart.codigo", $cartCode);
        $builder->groupStart();
        $builder->whereIn("u_kidtask.estado", array(9,5));
        $builder->orWhere("u_kidtask.u_kidtaskstamp IS NULL", "", false);
        $builder->groupEnd();
        $query = $builder->get();
        return $query->getRow();
    }
}