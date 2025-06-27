<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrdersModel extends Model {

    protected $table = 'u_tabof';

    protected $primaryKey = 'u_tabofstamp';

    public function getData() {
        $query = "SELECT * FROM TECNOLANEMA..u_tabof WHERE u_tabofstamp='SAC23060543478,865997795 '";
        return var_dump($this->db->query($query)->getResult());
       // return $query->getResult();
    }
}