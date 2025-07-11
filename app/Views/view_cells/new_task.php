<form id="new-task-form" class="h-100">
    <div class="card h-100">    
        <div class="card-header">
            Adicionar tarefa
        </div>
        <div class="card-body">   
                 
            <input type="hidden" name="terminalCode" id="terminal-code" value="<?= $terminalCode ?? ""; ?>" />
            <input type="hidden" name="company" id="company" value="<?= $company ?? ""; ?>" />
            <input type="hidden" name="multiLoadDock" id="multi-load-dock" value="<?= $multiLoad; ?>" />
            <input type="hidden" name="canSendCartOnly" id="can-send-cart-only" value="<?= $canSendCartOnly; ?>" />
            
            <div id="cart-unloading-container" class="mb-2"></div>

            <div class="card location-cart shadow-sm">
                <div class="card-body d-flex align-items-center fs-2 gap-3">
                    <div class="w-100">                        
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-cart-fill fs-2"></i>
                            <input type="hidden" name="cartCode" id="cart-code" value="<?= $cartCode ?? ""; ?>" />
                            <span  id="cart-code-id"><?= $cartCode ?? "- Não definido -"; ?></span>
                        </div>
                    </div>
                    <div class="flex-shrink-1">
                        <button type="button" class="btn btn-success btn-lg shadow-sm" id="change-cart-button">
                            <i class="bi bi-arrow-down-up"></i>
                        </button>
                    </div>
                </div>
            </div> 
            <div class="row mt-4 mb-4 ">
                <div class="d-none-xs d-none-xs col-md-9 m-auto">
                    <hr>
                </div>
                <div class="col-xs-12 col-md-3 d-flex justify-content-end">
                    <button type="button" class="btn btn-primary btn-lg" id="add-item-button">
                        <i class="bi bi-plus"></i>
                        Adicionar
                    </button>
                </div>                
            </div>
            <div class="row flex-grow-1">
                <div class="col scrollable-area flex-fill" id="item-collection-container">
                </div>
            </div>
        </div>
        <div class="card-footer">
            <div class="d-flex justify-content-end gap-2">
                <button class="btn btn-success btn-lg" id="send-to-robot-button" name="action" value="sendNormal" type="submit">
                    <i class="bi bi-send"></i>
                    <span>Enviar</span>
                </button>
                <button class="btn btn-success btn-lg" id="send-priority-to-robot-button" name="action" value="sendUrgent" type="submit">
                    <i class="bi bi-send"></i>
                    <span>Enviar urgente</span>
                </button>
                <div class="vr"></div>
                <button class="btn btn-danger btn-lg" id="cancel-task-button" type="button">
                    <i class="bi bi-x"></i>
                    <span>Cancelar</span>
                </button>
            </div>
        </div>  
    </div>
</form>