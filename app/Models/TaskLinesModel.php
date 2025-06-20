<?php

namespace App\Models;

use CodeIgniter\Model;

class TaskLinesModel extends Model {

    protected $table = "u_kidtaskd";

    protected $primaryKey = "u_kidtaskdstamp";

    protected $allowedFields = ["u_kidtaskdstamp", "u_kidtaskstamp", "ref", "design", "ststamp", "qtt", "tipo", "oristamp", "orindoc", "orinmdoc", "empresa", "ousrinis", "ousrdata", "ousrhora", "usrinis", "usrdata", "usrhora"];

    
}