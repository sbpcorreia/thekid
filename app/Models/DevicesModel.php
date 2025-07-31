<?php

namespace App\Models;

use CodeIgniter\Model;

class DevicesModel extends Model {

    protected $table = "u_kiddevs";

    protected $primaryKey = "u_kiddevsstamp";

    protected $allowedFields = ["u_kiddevsstamp", "ip", "code", "nome", "ousrinis", "ourdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    public function getDeviceName($deviceIp, $deviceCode = "") {
        $builder = $this->db->table($this->table);
        $builder->select("nome");
        $builder->groupStart();
        $builder->where("ip", $deviceIp);
        if(!empty($deviceCode)) {
            $builder->orWhere("code", $deviceCode);
        }
        $builder->groupEnd();
        $query = $builder->get();
        $result = $query->getRow();
        if(!empty($result)) {
            return $result->nome;
        }
        return "";
    }

    public function getDeviceList() {
        $builder = $this->db->table($this->table);
        $builder->select("nome, ip, code, casa");
        $query = $builder->get();
        return $query->getResult();
    }

    public function getDevice($deviceIp, $deviceCode = "") {
        $builder = $this->db->table($this->table);
        $builder->select("nome, ip, code");
        $builder->groupStart();
        $builder->where("ip", $deviceIp);
        if(!empty($deviceCode)) {
            $builder->orWhere("code", $deviceCode);
        }
        $builder->groupEnd();
        $query = $builder->get();
        return $query->getRow();
    }

    public function updateDeviceCode($deviceStamp, $deviceNewCode) {
        $builder = $this->db->table($this->table);
        $builder->set("code", $deviceNewCode);
        $builder->where("u_kiddevsstamp", $deviceStamp);
        return $builder->update();
    }

    public function updateDeviceIp($deviceStamp, $deviceNewIp) {
        $builder = $this->db->table($this->table);
        $builder->set("ip", $deviceNewIp);
        $builder->where("u_kiddevsstamp", $deviceStamp);
        return $builder->update();
    }

}