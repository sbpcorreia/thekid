<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrdersModel extends Model {

    protected $table = 'u_tabof';

    protected $primaryKey = 'u_tabofstamp';

    public function countData($columns, $search = "", $searchColumn = "") {
        $query = "SELECT COUNT(u_tabof.u_tabofstamp) AS count ";
        $query .= "FROM TECNOLANEMA..u_tabof (NOLOCK) ";
        $query .= "WHERE u_tabof.idto IN (4) ";
        if(!empty($search)) {
            if($searchColumn == "global") {
                $query .= "AND (";
                foreach($columns as $key => $value) {
                    if($key > 0) {
                        $query .= "OR ";
                    }
                    $query .= "$columns[$key] = '%{$search}%' ";
                }
                $query .= "(";
            } else {
                $query .= " AND $searchColumn LIKE '%{$searchColumn}%' ";
            }            
        }
        $result = $this->db->query($query)->getRow();
        return $result->count;
    }


    public function getData($columns, $page = 1, $pageSize = 20, $search = "", $searchColumn = "", $sortColumn = "", $sortDirection = "asc") {
        $offset = ($pageSize) * ($page-1);
        $query = "SELECT u_tabof.u_tabofstamp AS id, u_tabof.u_tabofstamp AS oristamp, u_tabof.numof AS orindoc, 'Ordem de Fabrico' AS orinmdoc ";
        $query .= "FROM TECNOLANEMA..u_tabof (NOLOCK) ";
        $query .= "WHERE u_tabof.idto IN (4) ";
        if(!empty($search)) {
            if($searchColumn == "global") {
                $query .= "AND (";
                foreach($columns as $key => $value) {
                    if($key > 0) {
                        $query .= "OR ";
                    }
                    $query .= "$columns[$key] = '%{$search}%' ";
                }
                $query .= "(";
            } else {
                $query .= " AND $searchColumn LIKE '%{$searchColumn}%' ";
            }            
        }
        if(!empty($sortColumn)) {
            $query .= "ORDER BY $sortColumn $sortDirection ";
        } else {
            $query .= "ORDER BY u_tabof.numof ";
        }

        $query .= "OFFSET {$offset} ROWS FETCH NEXT {$pageSize} ROWS ONLY ";

        return $this->db->query($query)->getResult();
    }
}