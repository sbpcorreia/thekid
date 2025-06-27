<?php

namespace App\Models;

use CodeIgniter\Model;

class WebServiceModel extends Model {

    private $url;
    private $url2;

    function __construct()
    {
        $config     = new \Config\WebServices;
        $ipAddress  = $config->ipAddress;
        $port       = $config->port;
        $this->url  = sprintf("http://%s%s/rcms-dps/rest/", $ipAddress, !empty($port) ? ":" . $port : "");
        $this->url2 = sprintf("http://%s%s/rcms/services/rest/hikRpcService/", $ipAddress, !empty($port) ? ":" . $port : "");
        
    }

    public function callWebservice($method, $body = array(), $object = true) {
        $url        = sprintf("%s%s", $method == HIKROBOT_QUERY_AGV_STATUS ? $this->url : $this->url2, $method); 
        $ch         = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            "Content-Type: application/json",
            "Accept: application/json"
        ));
        if(!empty($body)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $result     = curl_exec($ch);
        $http_code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        //$other = curl_error($ch);
        curl_close($ch);

        
        if($http_code === 200) {
            return json_decode($result, !$object);

        }
        return false;
    }
}