<form id="new-task" class="h-100">
    <div class="card h-100">    
        <div class="card-header">
            Adicionar tarefa
        </div>
        <div class="card-body">   
                 
            <input type="hidden" name="terminalCode" id="terminal-code" value="<?= $terminalCode ?? ""; ?>" />
            <input type="hidden" name="loadArea" id="loadArea" value="<?= $loadArea ?? ""; ?>" />
            <input type="hidden" name="unloadArea" id="unloadArea" value="<?= $unloadArea ?? ""; ?>" />
            <input type="hidden" name="company" id="company" value="<?= $company ?? ""; ?>" />
            
            <div id="cart-unloading-container" class="mb-2"></div>

            <div class="card location-cart shadow-sm">
                <div class="card-body d-flex align-items-center fs-2 gap-3">
                    <div class="w-100">                        
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-cart-fill fs-2"></i>
                            <input type="hidden" id="cart-to-unload" value="" />
                            <input type="hidden" name="cartCode" id="cart-code" value="<?= $cartCode ?? ""; ?>" />
                            <span  id="cart-code-id"><?= $cartCode ?? "- Não definido -"; ?></span>
                        </div>
                    </div>
                    <div class="flex-shrink-1">
                        <button type="button" class="btn btn-success btn-lg shadow-sm rounded-pill" id="change-cart">
                            <i class="bi bi-arrow-down-up"></i>
                        </button>
                        <button type="button" class="btn btn-danger btn-lg shadow-sm rounded-pill d-none" id="reset-cart">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>
            </div> 
            <div class="row mt-4 mb-4 ">

                <div class="d-none-xs d-none-xs col-md-9 m-auto">
                    <hr>
                </div>
                <div class="col-xs-12 col-md-3 d-flex justify-content-end">
                    <button type="button" class="btn btn-primary btn-lg rounded-pill" id="add-item">
                        <i class="bi bi-plus"></i>
                        Adicionar
                    </button>
                </div>                
            </div>
            <div class="row flex-grow-1">
                <div class="col scrollable-area flex-fill" id="item-collection">
                </div>
            </div>
        </div>
        <div class="card-footer">
            <div class="d-flex justify-content-end">
                <button class="btn btn-success btn-lg rounded-pill" id="send-to-robot" type="submit">
                    <i class="bi bi-send"></i>
                    <span>Enviar</span>
                </button>
            </div>
        </div>  
    </div>
</form>