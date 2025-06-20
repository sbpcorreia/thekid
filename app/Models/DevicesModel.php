<?php

namespace App\Models;

use CodeIgniter\Model;

class DevicesModel extends Model {

    protected $table = "u_kiddevs";

    protected $primaryKey = "u_kiddevsstamp";

    protected $allowedFields = ["u_kiddevsstamp", "ip", "code", "nome", "ousrinis", "ourdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    public function getDeviceName($deviceIp) {
        $builder = $this->db->table($this->table);
        $builder->select("nome");
        $builder->where("ip", $deviceIp);
        $query = $builder->get();
        $result = $query->getRow();
        if(!empty($result)) {
            return $result->nome;
        }
        return "";
    }

    public function getDevice($deviceIp) {
        $builder = $this->db->table($this->table);
        $builder->where("ip", $deviceIp);
        $query = $builder->get();
        return $query->getRow();
    }

    public function updateDeviceCode($deviceStamp, $deviceNewCode) {
        $builder = $this->db->table($this->table);
        $builder->set("code", $deviceNewCode);
        $builder->where("u_kiddevsstamp", $deviceStamp);
        return $builder->update();
    }

}