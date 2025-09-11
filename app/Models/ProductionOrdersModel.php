<?php

namespace App\Models;

use CodeIgniter\Database\RawSql;
use CodeIgniter\Model;

class ProductionOrdersModel extends Model {

    public function countData($columns, $search = "", $searchColumn = "") {

        $sqlQuery = "SELECT COUNT(bo.bostamp) AS count
        FROM TECNOLANEMA..bo (NOLOCK) 
        JOIN TECNOLANEMA..bo2 (NOLOCK) ON bo2.bo2stamp=bo.bostamp 
        WHERE bo.ndos=155 
        AND bo.fechada=0 
        AND bo2.anulado=0";

        if(!empty($search)) {
            if($searchColumn == "global") {
                $sqlQuery .= " AND";
                $filter = "(";
                foreach($columns as $key => $value) {
                    if(!empty($filter)) {
                        $filter .= " OR";
                    } 
                    $filter .= " " . $columns[$key] . " LIKE '%" . trim($search) . "%'";
                }
                $filter .= ")";
                $sqlQuery .= $filter;
            } else {
                $sqlQuery .= " AND " . $searchColumn . " LIKE '%". $search . "%'";
            }
        }

        $query = $this->db->query($sqlQuery);
        $res = $query->getRow();
        return $res->count;

    }

    public function getData($columns, $page = 1, $pageSize = 20, $search = "", $searchColumn = "", $sortColumn = "", $sortDirection = "ASC") {
        $sqlQuery = "SELECT bo.bostamp AS id, LTRIM(bo.obrano) + '/' + LTRIM(bo.boano) AS obrano, bo.obrano [orindoc], bo.bostamp [oristamp], 'Encomenda Produção (Tecno)' [orinmdoc] 
        FROM TECNOLANEMA..bo (NOLOCK) 
        JOIN TECNOLANEMA..bo2 (NOLOCK) ON bo2.bo2stamp=bo.bostamp 
        WHERE bo.ndos=155 
        AND bo.fechada=0
        AND bo2.anulado=0";
        if(!empty($search)) {
            if($searchColumn == "global") {
                $sqlQuery .= " AND";
                $filter = "(";
                foreach($columns as $key => $value) {
                    if(!empty($filter)) {
                        $filter .= " OR";
                    } 
                    $filter .= " " . $columns[$key] . " LIKE '%" . trim($search) . "%'";
                }
                $filter .= ")";
                $sqlQuery .= $filter;
            } else {
                $sqlQuery .= " AND " . $searchColumn . " LIKE '%". $search . "%'";
            }
        }
        $sqlQuery .= " ORDER BY";
        if(!empty($sortColumn)) {
            $sqlQuery .= " " . $sortColumn . " " . $sortDirection;    
        } else {
            $sqlQuery .= " bo.boano DESC, bo.obrano DESC";
        }

        $sqlQuery .= " OFFSET ".(($pageSize) * ($page-1))." ROWS FETCH NEXT ".$pageSize." ROWS ONLY";
        $query = $this->db->query($sqlQuery);
        return $query->getResult();
    }

    public function getDataByStamp($prodOrderStamp) {
        $query = "SELECT bo.bostamp AS id, bo.bostamp AS oristamp, bo.obrano AS orindoc, bo.nmdos AS orinmdoc ";
        $query .= "FROM TECNOLANEMA..bo (NOLOCK) ";
        $query .= sprintf("WHERE bo.bostamp=%s", $prodOrderStamp); 
        return $this->db->query($query)->getRow();
    }


}