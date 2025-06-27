<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\CLIRequest;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Psr\Log\LoggerInterface;

/**
 * Class BaseController
 *
 * BaseController provides a convenient place for loading components
 * and performing functions that are needed by all your controllers.
 * Extend this class in any new controllers:
 *     class Home extends BaseController
 *
 * For security be sure to declare any new methods as protected or private.
 */
abstract class BaseController extends Controller
{
    /**
     * Instance of the main Request object.
     *
     * @var CLIRequest|IncomingRequest
     */
    protected $request;

    /**
     * An array of helpers to be loaded automatically upon
     * class instantiation. These helpers will be available
     * to all other controllers that extend BaseController.
     *
     * @var list<string>
     */
    protected $helpers = ['text', 'date', 'uri', 'html', 'form', 'security', 'number', 'url', 'access', 'filesystem', 'inflector', 'utilis'];

    /**
     * Be sure to declare properties for any property fetch you initialized.
     * The creation of dynamic property is deprecated in PHP 8.2.
     */
    // protected $session;

    protected $pageData = [];

    protected $navbarData = [];

    protected $terminalCode = "";
    
    protected $session;

    /**
     * @return void
     */
    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger)
    {
        // Do Not Edit This Line
        parent::initController($request, $response, $logger);

        // Preload any models, libraries, etc, here.

        // E.g.: $this->session = \Config\Services::session();
        $companyLogo = "/assets/images/lanema_grupo.svg";
        $companyName = "Grupo Lanema";

        $this->navbarData = array(
            'locale' 			=> str_replace("-", "_", $this->request->getLocale()),
			'companyLogo' 		=> $companyLogo,
			'companyName'		=> $companyName,
			'supportedLocales' 	=> array('pt-PT'),
			'baseTitle' 		=> 'Moço CPanel'
        );

        $this->pageData = array(
			'locale' 			=> str_replace("-", "_", $this->request->getLocale()),
			'companyLogo' 		=> $companyLogo,
			'companyName'		=> $companyName,
			'supportedLocales' 	=> array('pt-PT'),
			'baseTitle' 		=> 'Moço CPanel',
			'favicon'			=> site_url('/assets/images/favicon.ico'),
			'headerCss' 		=> array(
				'Bootstrap Bundle' 			=> site_url('/assets/css/bootstrap.min.css'),
				'Bootstrap Toaster' 		=> site_url('/assets/css/bootstrap-toaster.min.css'),
				'Bootstrap Icons'			=> site_url('/assets/css/bootstrap-icons/bootstrap-icons.min.css'),
				'Site'						=> site_url('/assets/css/site.css'),
				'Alertify'					=> site_url("/assets/css/alertify.min.css"),
				"Bootstrap Alertify"		=> site_url("/assets/css/themes/bootstrap.css"),
                "GridJsCss"                 => site_url("/assets/css/mermaid.min.css")				
			),
			'headerJs' => array(				
				'jQuery Lib' 				=> site_url('/assets/js/jquery.min.js'),
				'Bootstrap Bundle'			=> site_url('/assets/js/bootstrap.bundle.min.js'),				 
				'Alertify'					=> site_url('/assets/js/alertify.min.js'),
                'OnScan JS'                 => site_url("/assets/js/onscan.js"),
                'GridJs'                    => site_url('/assets/js/gridjs.production.min.js')
			),
			'footerJs' => array(
                'SolidBridgeVKeyboard'      => site_url('/assets/js/sb-virtual-keyboard.js'),
                'SolidBridgePopupMenu'      => site_url('/assets/js/sb-popup-menu.js'),
				'Bootstrap Toaster' 		=> site_url('/assets/js/bootstrap-toaster.min.js'),
                'SolidBridgeBrowlist'       => site_url('/assets/js/sb-browlist.js'),
                'SolidBridgeModalManager'   => site_url('/assets/js/sb-modal-manager.js'),
				'Site JS' 					=> site_url('/assets/js/site.js'),	
			),
		);
    }
}
