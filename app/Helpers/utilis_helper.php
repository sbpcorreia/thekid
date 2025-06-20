<?php
/**
 * Gera um novo stamp
 * @param string $userInitials As iniciais do utilizador
 * @return string O novo stamp
 */
function newStamp($userInitials = "") {
    return substr(str_replace(".", "", strtoupper(uniqid($userInitials, true))), 0, 32);
}