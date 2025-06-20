<div class="card">
    <div class="card-header">
        Adicionar tarefa
    </div>
    <div class="card-body">
        <form id="new-task">
            <input type="hidden" name="terminalCode" id="terminal-code" value="<?= $terminalCode ?? ""; ?>" />
            <input type="hidden" name="origin" id="origin" value="<?= $origin ?? ""; ?>" />
            <input type="hidden" name="cartCode" id="cart-code" value="<?= $cartCode ?? ""; ?>" />
            <input type="hidden" name="company" id="company" value="<?= $company ?? ""; ?>" />

            <div class="card location-cart shadow-sm">
                <div class="card-body d-flex align-items-center fs-2 gap-3">
                    <div class="w-100">
                        <i class="bi bi-cart-fill fs-2"></i>
                        <span id="cart-code-span" id="cart-code-id"><?= $cartCode ?? "- Não definido -"; ?></span>
                    </div>
                    <div class="flex-shrink-1">
                        <button type="button" class="btn btn-success btn-lg shadow-sm rounded-pill" id="change-cart">
                            <i class="bi bi-arrow-down-up"></i>
                        </button>
                    </div>
                </div>
            </div> 
            <div class="row mt-4 mb-4">

                <div class="d-none-xs d-none-xs col-md-9 m-auto">
                    <hr>
                </div>
                <div class="col-xs-12 col-md-3 d-flex justify-content-end">
                    <button type="button" class="btn btn-primary btn-lg rounded-pill" id="add-cart-item">
                        <i class="bi bi-plus"></i>
                        Adicionar
                    </button>
                </div>



                
            </div>
            

        </form>        
    </div>
</div>