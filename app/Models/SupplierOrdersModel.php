<?php

namespace App\Models;

use CodeIgniter\Model;

class SupplierOrdersModel extends Model {

    public function countData($columns, $search = "", $searchColumn = "") {
        $query = "SELECT COUNT(u_tabof.u_tabofstamp) AS count ";
        $query .= "FROM TECNOLANEMA..u_tabof (NOLOCK) ";
        $query .= "WHERE u_tabof.idto IN (4) ";
        if(!empty($search)) {
            if($searchColumn === "global") {
                $query .= "AND numof LIKE '%". $search. "%'";
            } else {
                $query .= "AND $searchColumn LIKE '%". $search. "%'";
            }
        }
               
        $result = $this->db->query($query)->getRow();
        return $result->count;
    }


    public function getData($columns, $page = 1, $pageSize = 20, $search = "", $searchColumn = "", $sortColumn = "", $sortDirection = "asc") {
        $offset = ($pageSize) * ($page-1);
        $query = "SELECT u_tabof.u_tabofstamp AS id, u_tabof.u_tabofstamp [oristamp], u_tabof.numof, 'Ordem de Fabrico' AS orinmdoc ";
        $query .= "FROM TECNOLANEMA..u_tabof (NOLOCK) ";
        $query .= "WHERE u_tabof.idto IN (4) ";
        if(!empty($search)) {
            if($searchColumn === "global") {
                $query .= "AND numof LIKE '%". $search. "%'";
            } else {
                $query .= "AND $searchColumn LIKE '%". $search. "%'";
            }
        }    
        $query .= "ORDER BY u_tabof.numof ";
        

        $query .= "OFFSET {$offset} ROWS FETCH NEXT {$pageSize} ROWS ONLY ";

        return $this->db->query($query)->getResult();
    }

    public function getDataByCode($workOrderNumber) {
        $query = "SELECT u_tabof.u_tabofstamp AS id, u_tabof.u_tabofstamp AS oristamp, u_tabof.numof AS orindoc, 'Ordem de Fabrico' AS orinmdoc ";
        $query .= "FROM TECNOLANEMA..u_tabof (NOLOCK) ";
        $query .= sprintf("WHERE u_tabof.numof=%s", $workOrderNumber); 
        return $this->db->query($query)->getRow();
    }

}