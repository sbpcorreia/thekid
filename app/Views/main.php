<div class="main-content">
    <div class="row full-height">
        <div class="col-xs-12 col-md-6">
            <div class="card shadow-sm">
                <div class="card-header">Estado</div>
                <div class="card-body">
                    <div id="sb-robot-area"></div>
                </div>
            </div>
        </div>
        <div class="col-xs-12 col-md-6">
<?= view_cell("App\Controllers\Home::loadTaskArea", array("terminalCode" => $terminalCode, "company" => $company, "loadArea" => $loadArea, "unloadArea" => $unloadArea)); ?>
        </div>
    </div>
</div>
