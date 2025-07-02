<nav class="navbar bg-body-tertiary border-bottom shadow-sm sticky-top">
    <div class="container-fluid">
        <a href="#" class="me-auto">
            <img src="<?= site_url($companyLogo); ?>" alt="<?= $companyName; ?>" width="120" />
        </a>
        <div class="row g-3 fs-2 align-items-center">
            <div class="col-auto">
                <a href="#" class="link-dark" id="robot-map" data-bs-toggle="tooltip" title="Localização do robot">
                    <i class="bi bi-geo-fill"></i>
                </a>
            </div>
            
            <div class="col-auto">
                <a href="#" class="link-dark" data-bs-toggle="tooltip" title="Histórico">
                    <i class="bi bi-clock-history"></i>
                </a>
            </div>
            <div class="col-auto">
                <span class="link-dark">
                    <i class="bi bi-pc-display"></i>
                </span>
            </div>
            <div class="col-auto">
                <input type="text" class="form-control form-control-lg" data-vk readonly value="<?= $terminalDescription ?? ""; ?>">
            </div>
            <div class="col-auto">
                <a href="#" class="link-dark" id="open-config-section" data-bs-toggle="tooltip" title="Configuração">
                    <i class="bi bi-gear-fill"></i>
                </a>
            </div>            
        </div>
    </div>    
</nav>
<div class="offcanvas offcanvas-end<?= $terminalCode == null || empty($terminalCode) ? " show" : ""; ?>" data-bs-backdrop="static" tabindex="-1" id="config-section" aria-labelledby="config-section-label">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title" id="config-section-label">Configurações</h5>
<?php if(isset($terminalCode) && !empty($terminalCode)) : ?>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
<?php endif; ?>
    </div>
    <div class="offcanvas-body">
        <form id="config-form" class="d-flex flex-column h-100">
            <div class="flex-grow-1">            
                <div class="row">
                    <div class="col">
                    <?php if(!empty($terminalList)) : ?>
                        <label for="terminal" class="form-label">Terminal</label>
                        <select name="terminal" class="form-select">
                            <option value=""></option>
<?php foreach($terminalList as $key => $value) : ?>
<?php if($key == 0 || $value->empresa != $terminalList[$key-1]->empresa) : ?>
                            <optgroup label="<?= $value->empresa; ?>">
<?php endif; ?>
                                <option value="<?= $value->codigo; ?>"<?= $terminalCode === $value->codigo ? " selected" : ""; ?>><?= sprintf("(%s) %s", $value->codigo, $value->descricao); ?></option>
<?php if($key == 0 || $value->empresa != $terminalList[$key-1]->empresa) : ?>
                            </optgroup>
<?php endif; ?>
<?php endforeach; ?>
                        </select>
                        <?php else : ?>
                            <div class="alert alert-warning" role="alert">
                            Não existem terminais configurados! Contacte administrador!
                            </div>
                        <?php endif; ?>
                    </div>
                </div>            
            </div>
            <div class="mt-3">
                <div class="d-flex justify-content-end gap-2 border-top pt-3">
                <?php if(!empty($terminalList)) : ?>
                    <button class="btn btn-success btn-lg">
                        <i class="bi bi-save"></i>
                        <span>Guardar</span>
                    </button>
                <?php endif; ?>
                </div>
            </div>
        </form>
    </div>
</div>