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
        $builder->join("u_kidtask", "u_kidtask.carrinho=u_kidcart.codigo AND u_kidtask.estado NOT IN (5,9)", "left");
        $builder->where("u_kidtask.u_kidtaskstamp IS NULL", "", false);
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
        $builder->select("u_kidcartstamp AS id, codigo, descricao", false);
        $builder->join("u_kidtask", "u_kidtask.carrinho=u_kidcart.codigo AND u_kidtask.estado NOT IN (5,9)", "left");
        $builder->where("u_kidtask.u_kidtaskstamp IS NULL", "", false);
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
        }    
        $query = $builder->get($pageSize, ($pageSize) * ($page-1));
        return $query->getResult();        
    }

    public function getDataByCode($cartCode) {
        $builder = $this->db->table($this->table);
        $builder->select("u_kidcartstamp AS id, codigo, descricao", false);
        $builder->join("u_kidtask", "u_kidtask.carrinho=u_kidcart.codigo AND u_kidtask.estado NOT IN (5,9)", "left");
        $builder->where("u_kidtask.u_kidtaskstamp IS NULL", "", false);
        $builder->where("u_kidcart.codigo", $cartCode);
        $query = $builder->get();
        return $query->getRow();
    }
}