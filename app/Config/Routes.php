<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');
$routes->post("setTerminal", "Home::postSetTerminal");
$routes->post("tableData", "Home::postTableData");
$routes->get("unloadLocations/(:any)/(:num)", "Home::getUnloadLocations/$1/$2");
$routes->post("sendTask", "Home::postSendTask");
$routes->post("unloadCart", "Home::postUnloadCart");
$routes->post("cartItem", "Home::postCartItem");
$routes->get("loadLocations/(:any)", "Home::getLoadLocations/$1");
$routes->post("cancelTask", "Home::postCancelTask");
$routes->post("changePriority", "Home::postChangePriority");
$routes->post("changeRobotStatus", "Home::postChangeRobotStatus");