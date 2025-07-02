<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');
$routes->post("setTerminal", "Home::postSetTerminal");
$routes->post("tableData", "Home::postTableData");
$routes->get("unloadLocations", "Home::getUnloadLocations");
$routes->post("sendTask", "Home::postSendTask");
$routes->post("unloadCart", "Home::postUnloadCart");
$routes->post("cartItem", "Home::postCartItem");