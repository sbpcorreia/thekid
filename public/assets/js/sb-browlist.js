/**
 * Browlist - Biblioteca para seleção de registos com modal Bootstrap 5
 * @author Pedro Correia
 * @version 1.4.0 (Pesquisa por coluna adicionada)
 */

// Global counter for managing modal z-index levels for Browlist instances
let browlistActiveModalCount = 0;
const BROWLIST_BASE_ZINDEX = 1050; // Standard Bootstrap backdrop z-index

class Browlist {
    constructor(options = {}) {
        this.options = {
            // Configurações básicas            
            multipleSelection: false,
            hideSelectionColumn: false,
            modalTitle: 'Seleção de Registos',
            modalSize: 'xl', // sm, lg, xl
            recordIdField: 'id', // Campo que identifica unicamente um registo (usado para seleção)
            selectionColumnWidth: '40px', // NEW: Default width for selection column
            selectionElementSizeClass: '', // NEW: e.g., 'form-check-lg' or custom class for checkbox/radio
            rowHeightClass: '', // NEW: e.g., 'browlist-row-sm', 'browlist-row-lg'

            // Configurações de dados
            dataSource: null, // URL endpoint ou array de dados JSON
            httpMethod: 'GET', // GET ou POST
            httpPostType: 'json', // NOVO: 'json' ou 'formData'
            additionalParams: {}, // Parâmetros adicionais para o endpoint

            // Configurações da tabela
            columns: [], // Array de configurações das colunas
            pageSize: 10,
            pageSizeOptions: [5, 10, 25, 50, 100],
            searchable: true,
            sortable: true,

            // Callbacks
            onSave: null,
            onCancel: null,
            onDataLoad: null,
            onRowSelect: null,
            onCellEvent: null, // Callback para eventos de célula personalizados

            // Textos personalizáveis
            texts: {
                save: 'Gravar',
                cancel: 'Cancelar',
                search: 'Pesquisar...',
                noRecords: 'Nenhum registo encontrado.',
                showingEntries: 'A mostrar {start} a {end} de {total} registos',
                perPage: 'Apresentar',
                loading: 'A carregar...',
                error: 'Erro ao carregar dados.',
                selectAll: 'Selecionar todas as linhas visíveis',
                searchIn: 'Global' // NEW: Text for search column dropdown
            },
            
            // Ativar ou desativar clique na linha para seleção (exceto se clicar num elemento interativo)
            rowClickSelection: true, // NEW: Enable/disable row click selection,
            buttons: null
        };

        Object.assign(this.options, options);

        this.modalId = `browlist_modal_${Math.random().toString(36).substr(2, 9)}`;
        this.modalElement = null; // A instância da modal Bootstrap
        this.elements = {}; // Referências aos elementos DOM internos da modal

        this.data = []; // Dados carregados da fonte
        this.filteredData = []; // Dados após filtragem e pesquisa
        this.currentPage = 1;
        this.searchTerm = '';
        this.sortColumn = '';
        this.sortDirection = 'asc'; // 'asc' ou 'desc'
        this.searchColumn = 'global'; // 'global' ou nome da coluna (valor por defeito)
        this.selectedRecords = []; // Registos atualmente selecionados

        this.delegatedEventListeners = new Map(); // Para gerir listeners delegados e removê-los corretamente
        
        // Os estilos serão injetados uma única vez
        this.injectBrowlistStyles(); 
    }

    /**
     * Injeta estilos CSS específicos da biblioteca no <head> do documento.
     * @private
     */
    injectBrowlistStyles() {
        if (document.getElementById('browlist-styles')) {
            return; // Styles already injected
        }

        const style = document.createElement('style');
        style.id = 'browlist-styles';
        style.textContent = `
            /* Estilos para o tamanho dos elementos de seleção */
            .browlist-form-check-sm {
                transform: scale(0.8); /* Reduzir tamanho */
            }

            .browlist-form-check-lg {
                transform: scale(1.2); /* Aumentar tamanho */
            }

            /* Estilos para a altura das linhas da tabela */
            .browlist-row-sm td {
                padding-top: 0.25rem; /* Reduzir padding para linhas menores */
                padding-bottom: 0.25rem;
                line-height: 1; /* Ajustar line height */
                vertical-align: middle;
            }

            .browlist-row-lg td {
                padding-top: 0.75rem; /* Aumentar padding para linhas maiores */
                padding-bottom: 0.75rem;
                line-height: 1.5; /* Ajustar line height */
                vertical-align: middle;
            }

            /* Garante que os checkboxes/rádios estão centrados verticalmente */
            .browlist-modal .form-check-input.row-select {
                vertical-align: middle;
                margin-top: 0; /* Remove default margin that might misalign */
            }

            .browlist-modal .table-active {
                background-color: #e2e6ea; /* Cor de fundo para linha selecionada */
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Cria e anexa a estrutura HTML da modal ao corpo do documento e adiciona os event listeners.
     * Esta função agora é chamada a cada vez que a modal é mostrada.
     * @private
     */
    renderModalAndAddListeners() {
        // Build options for the search column dropdown
        const searchColumnOptions = `
            <option value="global">${this.options.texts.searchIn}</option>
            ${this.options.columns.filter(col => col.searchable !== false)
                .map(col => `<option value="${col.field}">${col.title}</option>`)
                .join('')}
        `;

        const modalHTML = `
            <div class="modal fade browlist-modal" id="${this.modalId}" tabindex="-1" aria-labelledby="${this.modalId}Label" aria-hidden="true">
                <div class="modal-dialog modal-${this.options.modalSize}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${this.modalId}Label">${this.options.modalTitle}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6 d-flex align-items-center">
                                    <div class="input-group flex-grow-1 me-2">
                                        <select class="form-select" id="${this.modalId}_searchColumnSelect">
                                            ${searchColumnOptions}
                                        </select>
                                        <input type="text" class="form-control" id="${this.modalId}_searchInput" placeholder="${this.options.texts.search}" data-vk>
                                        <button class="btn btn-outline-secondary" type="button" id="${this.modalId}_searchButton"><i class="bi bi-search"></i></button>
                                    </div>
                                    
                                </div>
                                <div class="col-md-6 text-end">
                                    <label for="${this.modalId}_pageSizeSelect" class="form-label d-inline-block me-2">${this.options.texts.perPage}</label>
                                    <select class="form-select w-auto d-inline-block" id="${this.modalId}_pageSizeSelect">
                                        ${this.options.pageSizeOptions.map(size => `<option value="${size}" ${this.options.pageSize === size ? 'selected' : ''}>${size}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-striped table-hover browlist-table">
                                    <thead id="${this.modalId}_tableHeader">
                                        </thead>
                                    <tbody id="${this.modalId}_tableBody">
                                        </tbody>
                                </table>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <small id="${this.modalId}_info" class="text-muted"></small>
                                <nav>
                                    <ul class="pagination mb-0" id="${this.modalId}_pagination">
                                        </ul>
                                </nav>
                            </div>
                        </div>
                        <div class="modal-footer"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        

        const modalDomElement = document.getElementById(this.modalId);

        this.modalElement = new bootstrap.Modal(modalDomElement, {
            keyboard: false
        });

        this.renderModalButtons();

        this.elements = {
            tableHeader: document.getElementById(`${this.modalId}_tableHeader`),
            tableBody: document.getElementById(`${this.modalId}_tableBody`),
            searchInput: document.getElementById(`${this.modalId}_searchInput`),
            searchButton: document.getElementById(`${this.modalId}_searchButton`),
            searchColumnSelect: document.getElementById(`${this.modalId}_searchColumnSelect`), // NEW element
            pageSizeSelect: document.getElementById(`${this.modalId}_pageSizeSelect`),
            info: document.getElementById(`${this.modalId}_info`),
            pagination: document.getElementById(`${this.modalId}_pagination`),
            saveButton: document.getElementById(`${this.modalId}_saveButton`),
            selectAllCheckbox: document.getElementById(`${this.modalId}_selectAll`)
        };

        // Initialize searchColumnSelect with current this.searchColumn value
        if (this.elements.searchColumnSelect) {
            this.elements.searchColumnSelect.value = this.searchColumn;
        }

        // Adicionar event listeners agora que os elementos existem
        this.elements.searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.loadData();
            }
        });

        this.elements.searchButton.addEventListener('click', () => {
            this.searchTerm = this.elements.searchInput.value;
            this.currentPage = 1;
            this.loadData();
        });

        // NEW: Event listener for search column selection
        if (this.elements.searchColumnSelect) {
            this.elements.searchColumnSelect.addEventListener('change', (e) => {
                this.searchColumn = e.target.value;
                this.currentPage = 1;
                this.loadData();
            });
        }

        this.elements.pageSizeSelect.addEventListener('change', (e) => {
            this.options.pageSize = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadData();
        });

        

        // Listener para o evento 'hidden.bs.modal'
        modalDomElement.addEventListener('hidden.bs.modal', () => {
            browlistActiveModalCount = Math.max(0, browlistActiveModalCount - 1);
            this._updateAllModalZIndexes(); // Re-evaluate z-indexes for remaining modals
            // Limpa o estado interno da modal
            this.resetState();
            if (typeof this.options.onCancel === 'function') {
                this.options.onCancel();
            }
            // Remove os event listeners delegados que foram adicionados ao tableBody
            this.delegatedEventListeners.forEach((listener, element) => {
                element.removeEventListener('change', listener);
                element.removeEventListener('click', listener);
            });
            this.delegatedEventListeners.clear();

            // Destrói a instância da modal Bootstrap
            if (this.modalElement) {
                this.modalElement.dispose();
                this.modalElement = null;
            }
            // Remove o elemento HTML da modal da DOM
            modalDomElement.remove();
            // Limpa as referências aos elementos para evitar usos indevidos
            this.elements = {}; 
        });
        // Listener para o evento 'shown.bs.modal'
        modalDomElement.addEventListener('shown.bs.modal', () => {
            browlistActiveModalCount++; // Keep track of Browlist specific modals
            this._updateAllModalZIndexes(); // Re-evaluate and set z-indexes for all active modals
            this.loadData();
        });
    }

    /**
     * Helper function to manage z-index for all Bootstrap modals, ensuring proper stacking.
     * @private
     */
    _updateAllModalZIndexes() {
        // Get all currently active Bootstrap modals and backdrops
        const activeModals = document.querySelectorAll('.modal.show');
        const activeBackdrops = document.querySelectorAll('.modal-backdrop');

        // Sort modals by their "order" of appearance (roughly based on when they were added)
        // This is tricky, so we'll rely on the order of the 'show' class which indicates active modals.
        // The last one in the DOM will typically be the newest.

        let currentModalZIndex = BROWLIST_BASE_ZINDEX + 5; // Start with Bootstrap's default modal Z-index
        let currentBackdropZIndex = BROWLIST_BASE_ZINDEX; // Start with Bootstrap's default backdrop Z-index

        // For each active modal, assign a higher z-index
        activeModals.forEach((modalElement, index) => {
            // Assign z-index to the modal itself
            modalElement.style.zIndex = currentModalZIndex + (index * 20); // Increment by 20 to give space

            // Find the corresponding backdrop. This is the trickiest part.
            // Bootstrap appends backdrops directly to body. They typically appear in order.
            // Assuming the backdrops are appended in the same order as modals become active.
            if (activeBackdrops[index]) {
                activeBackdrops[index].style.zIndex = currentBackdropZIndex + (index * 20);
            }
        });
    }

    /**
    * Renderiza os botões no rodapé da modal, permitindo personalização e adição de extras.
    * @private
    */
    renderModalButtons() {
        const modal = document.getElementById(this.modalId);
        if(!modal) {
            console.error("Modal não encontrada");
        }

       const footer = modal.querySelector('.modal-footer');
       if (!footer) {
           console.error("Rodapé da modal não encontrado para renderizar botões.");
           return;
       }
       footer.innerHTML = ''; // Limpa botões existentes
    
       // Botões padrão da Browlist
       const defaultButtons = [{
           text: 'Selecionar',
           icon: 'bi-check2',
           variant: 'success',
           hidden : false,
           action: async () => {
                if (typeof this.options.onSave === 'function') {
                    this.options.onSave(this.selectedRecords);
                }
                this.hide();              
           }
       }, {
           text: 'Cancelar',
           icon: 'bi-x-lg',
           variant: 'danger',
           hidden : false,
           action: async () => {
               this.hide();        
               if (typeof this.options.onCancel === 'function') {
                   this.options.onCancel();
               }
           }
       }];
    
       let finalButtons = [...defaultButtons]; // Começa com uma cópia dos botões padrão
    
       // Se customButtons for fornecido, mesclar com os botões padrão
       if (this.options.buttons && Array.isArray(this.options.buttons)) {
           // Usamos map para criar um novo array, permitindo estender ou substituir
           // Se o índice existir nos botões padrão, mesclamos. Caso contrário, é um botão extra.
           finalButtons = this.options.buttons.map((customBtn, index) => {
               const defaultBtn = defaultButtons[index];
               if (defaultBtn) {
                   return {
                       ...defaultBtn, // Começa com todas as propriedades do botão padrão
                       ...customBtn, // Sobrescreve com as propriedades do botão personalizado
                       // Se a ação não for definida no botão personalizado, mantém a ação padrão
                       action: customBtn.action === undefined ? defaultBtn.action : customBtn.action
                   };
               }
               // Se não houver um botão padrão correspondente, é um botão extra
               return customBtn;
           });
        
           // Se o usuário forneceu MENOS botões personalizados do que os padrão,
           // garantimos que os botões padrão restantes ainda sejam incluídos.
           if (this.options.buttons.length < defaultButtons.length) {
               for (let i = this.options.buttons.length; i < defaultButtons.length; i++) {
                   finalButtons.push(defaultButtons[i]);
               }
           }
       }
    
       // Renderizar os botões finais
       finalButtons.forEach(button => {
           const btn = document.createElement('button');
           btn.classList.add('btn');
           if(button.hidden) {
                btn.classList.add("d-none");
           }
           if (button.variant) {
               btn.classList.add(`btn-${button.variant}`);
           }
           if (button.icon) {
               btn.innerHTML = `<i class="bi ${button.icon}"></i> ${button.text}`;
           } else {
               btn.textContent = button.text;
           }
        
           if (button.dataBsDismiss) {
               btn.setAttribute('data-bs-dismiss', button.dataBsDismiss);
           }
        
           if (button.action) {
               btn.addEventListener('click', () => {
                   Promise.resolve(button.action()).catch(error => {
                       console.error("Erro na ação do botão da modal Browlist:", error);
                   });
               });
           }
           footer.appendChild(btn);
       });
    }

    /**
     * Resets the internal state of the Browlist.
     * @private
     */
    resetState() {
        this.currentPage = 1;
        this.searchTerm = '';
        this.sortColumn = '';
        this.sortDirection = 'asc';
        this.searchColumn = 'global'; // Reset search column to global
        // A UI elements may not exist if modal is already removed, check before setting value
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        if (this.elements.searchColumnSelect) {
            this.elements.searchColumnSelect.value = 'global';
        }
        this.selectedRecords = []; // Clear selections
    }

    /**
     * Abre a modal.
     * Agora, a modal é renderizada e seus listeners são adicionados a cada chamada.
     * @public
     */
    show() {
        // Renderiza a modal e anexa listeners antes de mostrá-la
        this.renderModalAndAddListeners();
       // this.renderModalButtons();
        this.modalElement.show();
    }

    /**
     * Esconde a modal.
     * @public
     */
    hide() {
        if (this.modalElement) {
            this.modalElement.hide();
        }
    }

    /**
     * Define os registos que devem estar selecionados na modal.
     * Útil para pré-selecionar itens ao abrir a modal.
     * @public
     * @param {Array<object>} records - Um array de objetos de registo a serem pré-selecionados.
     */
    setSelectedRecords(records) {
        this.selectedRecords = [];
        if (Array.isArray(records)) {
            records.forEach(rec => {
                const recordId = this.getNestedValue(rec, this.options.recordIdField);
                if (recordId !== undefined && recordId !== null) {
                    if (!this.selectedRecords.some(r => this.getNestedValue(r, this.options.recordIdField) === recordId)) {
                        this.selectedRecords.push(rec);
                    }
                } else {
                    if (!this.selectedRecords.some(r => JSON.stringify(r) === JSON.stringify(rec))) {
                        this.selectedRecords.push(rec);
                    }
                }
            });
        }
        // updateRowHighlight e updateSelectAllState serão chamados após loadData
        // quando a modal é renderizada e os dados são carregados.
    }


    /**
     * Carrega os dados da fonte configurada (URL ou array local).
     * @private
     */
    async loadData() {
        // Assegura que this.elements.tableBody existe antes de tentar manipulá-lo
        if (!this.elements.tableBody) return;

        this.elements.tableBody.innerHTML = `<tr><td colspan="${this.options.columns.length + (this.options.hideSelectionColumn ? 0 : 1)}" class="text-center">${this.options.texts.loading}</td></tr>`;
        this.elements.info.textContent = '';
        this.elements.pagination.innerHTML = '';

        try {
            let fetchedData;
            if (typeof this.options.dataSource === 'string') {
                // Fonte de dados é uma URL
                const url = new URL(this.options.dataSource);

                // Determinar o nome real do campo para ordenação
                let serverSortColumn = this.sortColumn;
                if (this.sortColumn) {
                    const sortColumnDef = this.options.columns.find(c => c.field === this.sortColumn);
                    if (sortColumnDef && sortColumnDef.dataField) {
                        serverSortColumn = sortColumnDef.dataField;
                    }
                }
                
                // Determinar o nome real do campo para pesquisa (agora é this.searchColumn)
                let serverSearchColumnName = this.searchColumn; // 'global' ou o 'field' da coluna
                let effectiveSearchTerm = this.searchTerm;
                
                if (serverSearchColumnName !== 'global') {
                    const searchColumnDef = this.options.columns.find(c => c.field === serverSearchColumnName);
                    if (searchColumnDef && searchColumnDef.dataField) {
                        serverSearchColumnName = searchColumnDef.dataField; // Use dataField if defined for server
                    }
                }


                const params = {
                    page: this.currentPage,
                    pageSize: this.options.pageSize,
                    searchTerm: effectiveSearchTerm,
                    searchColumn: serverSearchColumnName, // NEW: Envia o nome da coluna de pesquisa para o servidor
                    sortColumn: serverSortColumn, 
                    sortDirection: this.sortDirection,
                    ...this.options.additionalParams
                };

                let requestOptions = {
                    method: this.options.httpMethod,
                    headers: {
                        'Accept': 'application/json',
                    }
                };

                if (this.options.httpMethod.toUpperCase() === 'POST') {
                    if (this.options.httpPostType === 'json') {
                        requestOptions.headers['Content-Type'] = 'application/json';
                        requestOptions.body = JSON.stringify(params);
                    } else if (this.options.httpPostType === 'formData') {
                        const formData = new URLSearchParams();
                        for (const key in params) {
                            formData.append(key, params[key]);
                        }
                        requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                        requestOptions.body = formData.toString();
                    }
                } else { // GET
                    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
                }

                const response = await fetch(url.toString(), requestOptions);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                fetchedData = await response.json();
                this.data = fetchedData.data || [];
                this.totalRecords = fetchedData.totalRecords || this.data.length;

            } else if (Array.isArray(this.options.dataSource)) {
                // Fonte de dados é um array local
                this.data = this.options.dataSource;
                this.loadDataFromJSON(); // Process local data
                return; // loadDataFromJSON already handles rendering
            } else {
                this.data = [];
                this.totalRecords = 0;
            }

            this.renderTable();
            this.renderPagination();
            this.updateInfo();
            this.updateSelectAllState(); // Update select all checkbox state
            if (typeof this.options.onDataLoad === 'function') {
                this.options.onDataLoad(this.data);
            }

        } catch (error) {
            console.error('Browlist: Erro ao carregar dados:', error);
            if (this.elements.tableBody) { // Check again in case modal was already removed
                this.elements.tableBody.innerHTML = `<tr><td colspan="${this.options.columns.length + (this.options.hideSelectionColumn ? 0 : 1)}" class="text-center text-danger">${this.options.texts.error}</td></tr>`;
            }
            this.totalRecords = 0;
            this.renderPagination(); // Clear pagination
            this.updateInfo(); // Clear info
        }
    }

    /**
     * Processa dados quando a fonte é um array JSON local.
     * Aplica filtragem, ordenação e paginação localmente.
     * @private
     */
    loadDataFromJSON() {
        let data = [...this.data]; // Trabalha numa cópia dos dados originais

        // 1. Filtrar
        if (this.searchTerm && this.options.searchable) {
            data = data.filter(row => {
                if (this.searchColumn === 'global') {
                    return this.options.columns.some(col => {
                        if (col.searchable !== false) {
                            // Use dataField for actual data lookup during search
                            const searchDataField = col.dataField || col.field;
                            const value = this.getNestedValue(row, searchDataField);
                            return String(value || '').toLowerCase().includes(this.searchTerm.toLowerCase());
                        }
                        return false;
                    });
                } else {
                    // When searching a specific column, you'll need to determine its dataField
                    const targetColumn = this.options.columns.find(c => c.field === this.searchColumn);
                    if (targetColumn) {
                        const searchDataField = targetColumn.dataField || targetColumn.field;
                        const value = this.getNestedValue(row, searchDataField);
                        return String(value || '').toLowerCase().includes(this.searchTerm.toLowerCase());
                    }
                    return false; // Column not found or not searchable
                }
            });
        }
        this.filteredData = data; // Armazena dados filtrados para a paginação e contagem total

        // 2. Ordenar
        if (this.sortColumn && this.options.sortable) {
            data.sort((a, b) => {
                const sortColumnDef = this.options.columns.find(c => c.field === this.sortColumn);
                const sortDataField = sortColumnDef ? (sortColumnDef.dataField || sortColumnDef.field) : this.sortColumn;

                const aVal = this.getNestedValue(a, sortDataField);
                const bVal = this.getNestedValue(b, sortDataField);

                // Lógica de comparação para diferentes tipos de dados
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return this.sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
                // Fallback para comparação numérica ou outros tipos
                if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // 3. Paginação
        const startIndex = (this.currentPage - 1) * this.options.pageSize;
        const endIndex = startIndex + this.options.pageSize;
        this.data = data.slice(startIndex, endIndex); // Atualiza this.data para conter apenas a página atual
        this.totalRecords = this.filteredData.length; // O total de registos é o dos dados filtrados

        this.renderTable();
        this.renderPagination();
        this.updateInfo();
        this.updateSelectAllState();
        if (typeof this.options.onDataLoad === 'function') {
            this.options.onDataLoad(this.data);
        }
    }


    /**
     * Renderiza o cabeçalho da tabela.
     * @private
     */
    renderTableHeader() {
        // Assegura que this.elements.tableHeader existe antes de tentar manipulá-lo
        if (!this.elements.tableHeader) return;

        let headerHTML = '<tr>';
        if (!this.options.hideSelectionColumn) {
            if (this.options.multipleSelection) {
                headerHTML += `
                    <th scope="col" style="width: ${this.options.selectionColumnWidth};">
                        <input type="checkbox" class="form-check-input ${this.options.selectionElementSizeClass}" id="${this.modalId}_selectAll" aria-label="${this.options.texts.selectAll}">
                    </th>
                `;
            } else {
                headerHTML += `<th scope="col" style="width: ${this.options.selectionColumnWidth};"></th>`;
            }
        }

        this.options.columns.forEach(col => {
            let sortIndicator = '';
            let sortClass = '';
            if (this.options.sortable && col.sortable !== false) {
                if (this.sortColumn === col.field) {
                    sortIndicator = this.sortDirection === 'asc' ? ' &#9650;' : ' &#9660;'; // Triângulo para cima/baixo
                }
                sortClass = 'sortable';
            }
            headerHTML += `<th scope="col" class="${sortClass}" data-field="${col.field}">${col.title}${sortIndicator}</th>`;
        });
        headerHTML += '</tr>';
        this.elements.tableHeader.innerHTML = headerHTML;

        // Adiciona listeners para ordenação
        if (this.options.sortable) {
            this.elements.tableHeader.querySelectorAll('th.sortable').forEach(th => {
                th.addEventListener('click', (e) => {
                    const field = e.target.dataset.field;
                    if (this.sortColumn === field) {
                        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.sortColumn = field;
                        this.sortDirection = 'asc';
                    }
                    this.loadData();
                });
            });
        }

        // Listener para o checkbox "selecionar todos"
        if (this.options.multipleSelection && !this.options.hideSelectionColumn) {
            // Re-obtem o elemento, pois ele é criado a cada renderização da modal
            this.elements.selectAllCheckbox = document.getElementById(`${this.modalId}_selectAll`); 
            if (this.elements.selectAllCheckbox) {
                // Remove listeners anteriores para evitar duplicação
                const existingListener = this.delegatedEventListeners.get(this.elements.selectAllCheckbox);
                if (existingListener) {
                    this.elements.selectAllCheckbox.removeEventListener('change', existingListener);
                }

                const selectAllHandler = (e) => this.toggleAllRowsSelection(e.target.checked);
                this.elements.selectAllCheckbox.addEventListener('change', selectAllHandler);
                this.delegatedEventListeners.set(this.elements.selectAllCheckbox, selectAllHandler);
            }
        }
    }

    /**
     * Renderiza o corpo da tabela com os dados atuais.
     * @private
     */
    renderTableBody() {
        // Assegura que this.elements.tableBody existe antes de tentar manipulá-lo
        if (!this.elements.tableBody) return;

        let bodyHTML = '';
        if (this.data.length === 0) {
            bodyHTML = `<tr><td colspan="${this.options.columns.length + (this.options.hideSelectionColumn ? 0 : 1)}" class="text-center">${this.options.texts.noRecords}</td></tr>`;
        } else {
            this.data.forEach((row, index) => {
                const recordId = this.getNestedValue(row, this.options.recordIdField);
                // Check if the current row's recordId is in the selectedRecords array
                const isSelected = this.selectedRecords.some(selected =>
                    this.getNestedValue(selected, this.options.recordIdField) === recordId
                );

                bodyHTML += `<tr data-index="${index}" data-record-id="${recordId}"
                                 class="${isSelected ? 'table-active' : ''} ${this.options.rowHeightClass}">`;

                // Coluna de seleção (checkbox/radio)
                if (!this.options.hideSelectionColumn) {
                    if (this.options.multipleSelection) {
                        bodyHTML += `
                            <td role="gridcell" style="width: ${this.options.selectionColumnWidth};">
                                <input type="checkbox" class="form-check-input row-select ${this.options.selectionElementSizeClass}"
                                       data-index="${index}" ${isSelected ? 'checked' : ''}
                                       aria-label="Selecionar linha">
                            </td>
                        `;
                    } else {
                        bodyHTML += `
                            <td role="gridcell" style="width: ${this.options.selectionColumnWidth};">
                                <input type="radio" class="form-check-input row-select ${this.options.selectionElementSizeClass}"
                                       name="record_select_${this.modalId}" data-index="${index}" ${isSelected ? 'checked' : ''}
                                       aria-label="Selecionar linha">
                            </td>
                        `;
                    }
                }

                // Colunas de dados
                this.options.columns.forEach(col => {
                    let cellContent;
                    if (col.render && typeof col.render === 'function') {
                        try {
                            cellContent = col.render.call(this, row, col.field, index);
                        } catch (renderError) {
                            console.error(`Browlist: Erro ao renderizar coluna '${col.field}':`, renderError);
                            cellContent = `[Erro]`;
                        }
                    } else {
                        cellContent = this.getDisplayValue(row, col) || '';
                    }
                    bodyHTML += `<td role="gridcell">${cellContent}</td>`;
                });
                bodyHTML += '</tr>';
            });
        }
        this.elements.tableBody.innerHTML = bodyHTML;

        // Remove previous delegated event listeners before adding new ones, excluding selectAllCheckbox's listener
        const selectAllListener = this.delegatedEventListeners.get(this.elements.selectAllCheckbox);
        this.delegatedEventListeners.forEach((listener, element) => {
            if (element !== this.elements.selectAllCheckbox) {
                 element.removeEventListener('change', listener);
                 element.removeEventListener('click', listener);
            }
        });
        this.delegatedEventListeners.clear();
        if (selectAllListener) {
            this.delegatedEventListeners.set(this.elements.selectAllCheckbox, selectAllListener);
        }

        // NEW: Event listener for checkbox/radio change (delegated to tableBody)
        if (!this.options.hideSelectionColumn) {
            const rowSelectHandler = (e) => {
                if (e.target.classList.contains('row-select')) {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    this.toggleRowSelection(index, e.target.checked, e.target);
                }
            };
            this.elements.tableBody.addEventListener('change', rowSelectHandler);
            this.delegatedEventListeners.set(this.elements.tableBody, rowSelectHandler);
        }

        // NEW: Event listener for row clicks (delegated to tableBody)
        if (this.options.rowClickSelection) {
            const rowClickHandler = (e) => {
                // Prevent row selection if a specific interactive element inside the row was clicked
                if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('[data-no-row-select]')) {
                    return; 
                }

                const rowElement = e.target.closest('tr');
                if (rowElement && !this.options.hideSelectionColumn) {
                    const index = parseInt(rowElement.getAttribute('data-index'));
                    const rowSelectorInput = rowElement.querySelector('.row-select');

                    if (rowSelectorInput) {
                        const newCheckedState = !rowSelectorInput.checked;
                        rowSelectorInput.checked = newCheckedState; // Update the UI of the input
                        this.toggleRowSelection(index, newCheckedState, rowSelectorInput);
                    }
                }
            };
            this.elements.tableBody.addEventListener('click', rowClickHandler);
            this.delegatedEventListeners.set(this.elements.tableBody, rowClickHandler);
        }

        this.bindCustomCellEvents(this.elements.tableBody);
        this.updateRowHighlight(); // Re-apply highlight after rendering
    }

    /**
     * Renderiza a tabela completa (cabeçalho e corpo).
     * @private
     */
    renderTable() {
        this.renderTableHeader();
        this.renderTableBody();
    }

    /**
     * Renderiza os controlos de paginação.
     * @private
     */
    renderPagination() {
        // Assegura que this.elements.pagination existe antes de tentar manipulá-lo
        if (!this.elements.pagination) return;

        const totalPages = Math.ceil(this.totalRecords / this.options.pageSize);
        let paginationHTML = '';

        if (totalPages > 1) {
            paginationHTML += `<li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                                    <a class="page-link" href="#" data-page="prev" aria-label="Anterior">&laquo;</a>
                                </li>`;

            let startPage = Math.max(1, this.currentPage - 2);
            let endPage = Math.min(totalPages, this.currentPage + 2);

            if (endPage - startPage < 4) {
                if (startPage === 1) endPage = Math.min(totalPages, startPage + 4);
                if (endPage === totalPages) startPage = Math.max(1, endPage - 4);
            }

            if (startPage > 1) {
                paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
                if (startPage > 2) {
                    paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                paginationHTML += `<li class="page-item ${this.currentPage === i ? 'active' : ''}">
                                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                                   </li>`;
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
                paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
            }

            paginationHTML += `<li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                                    <a class="page-link" href="#" data-page="next" aria-label="Próxima">&raquo;</a>
                                </li>`;
        }

        this.elements.pagination.innerHTML = paginationHTML;

        // Adiciona listeners aos botões de paginação (delegados ao elemento pagination)
        const paginationHandler = (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            if (page === 'prev') {
                this.currentPage = Math.max(1, this.currentPage - 1);
            } else if (page === 'next') {
                this.currentPage = Math.min(totalPages, this.currentPage + 1);
            } else if (page) { // Garante que é um número de página válido
                this.currentPage = parseInt(page);
            }
            this.loadData();
        };

        // Remove listener anterior para evitar duplicação
        const existingListener = this.delegatedEventListeners.get(this.elements.pagination);
        if (existingListener) {
            this.elements.pagination.removeEventListener('click', existingListener);
        }
        this.elements.pagination.addEventListener('click', paginationHandler);
        this.delegatedEventListeners.set(this.elements.pagination, paginationHandler);
    }

    /**
     * Atualiza as informações de registos exibidos.
     * @private
     */
    updateInfo() {
        // Assegura que this.elements.info existe antes de tentar manipulá-lo
        if (!this.elements.info) return;

        const start = (this.currentPage - 1) * this.options.pageSize + 1;
        const end = Math.min(this.currentPage * this.options.pageSize, this.totalRecords);
        const total = this.totalRecords;

        if (total === 0) {
            this.elements.info.textContent = '';
        } else {
            this.elements.info.textContent = this.options.texts.showingEntries
                .replace('{start}', start)
                .replace('{end}', end)
                .replace('{total}', total);
        }
    }

    /**
     * Alterna a seleção de uma linha da tabela.
     * @private
     * @param {number} index - O índice da linha na `this.data` atualmente exibida.
     * @param {boolean} isChecked - True se o item deve ser selecionado, false para desmarcar.
     * @param {HTMLElement} inputElement - O elemento input (checkbox/radio) que disparou o evento.
     */
    toggleRowSelection(index, isChecked, inputElement) {
        const record = this.data[index];
        const recordId = this.getNestedValue(record, this.options.recordIdField);

        if (!recordId) {
            console.warn('Browlist: O campo de ID do registo não foi encontrado ou é nulo/indefinido. A seleção pode não ser persistente.');
        }

        if (this.options.multipleSelection) {
            if (isChecked) {
                // Adiciona se não estiver já presente (evita duplicados por ID)
                if (!this.selectedRecords.some(r => this.getNestedValue(r, this.options.recordIdField) === recordId)) {
                    this.selectedRecords.push(record);
                }
            } else {
                // Remove
                this.selectedRecords = this.selectedRecords.filter(r =>
                    this.getNestedValue(r, this.options.recordIdField) !== recordId
                );
            }
        } else {
            // Single selection
            this.selectedRecords = isChecked ? [record] : [];
            // Desmarca todos os outros rádios se for seleção única
            if (this.elements.tableBody) { // Check if tableBody exists
                this.elements.tableBody.querySelectorAll(`.row-select[name="record_select_${this.modalId}"]`).forEach(radio => {
                    if (radio !== inputElement) {
                        radio.checked = false;
                    }
                });
            }
        }
        this.updateRowHighlight();
        this.updateSelectAllState();

        if (typeof this.options.onRowSelect === 'function') {
            this.options.onRowSelect(record, isChecked, this.selectedRecords);
        }
    }

    /**
     * Alterna a seleção de todas as linhas visíveis na página atual.
     * @private
     * @param {boolean} selectAll - True para selecionar todos, false para desmarcar.
     */
    toggleAllRowsSelection(selectAll) {
        if (!this.elements.tableBody) return; // Check if tableBody exists

        this.elements.tableBody.querySelectorAll('.row-select').forEach(input => {
            const index = parseInt(input.getAttribute('data-index'));
            const record = this.data[index];
            const recordId = this.getNestedValue(record, this.options.recordIdField);

            if (this.options.multipleSelection) {
                input.checked = selectAll; // Update UI
                if (selectAll) {
                    if (!this.selectedRecords.some(r => this.getNestedValue(r, this.options.recordIdField) === recordId)) {
                        this.selectedRecords.push(record);
                    }
                } else {
                    this.selectedRecords = this.selectedRecords.filter(r =>
                        this.getNestedValue(r, this.options.recordIdField) !== recordId
                    );
                }
            }
        });
        this.updateRowHighlight();
        if (typeof this.options.onRowSelect === 'function') {
            this.options.onRowSelect(null, selectAll, this.selectedRecords);
        }
    }

    /**
     * Atualiza o estado da checkbox "Selecionar Todos".
     * @private
     */
    updateSelectAllState() {
        if (this.elements.selectAllCheckbox && this.options.multipleSelection && !this.options.hideSelectionColumn) {
            const visibleRowCheckboxes = Array.from(this.elements.tableBody.querySelectorAll('.row-select'));
            const allVisibleSelected = visibleRowCheckboxes.length > 0 && visibleRowCheckboxes.every(cb => cb.checked);
            const anyVisibleSelected = visibleRowCheckboxes.some(cb => cb.checked);

            this.elements.selectAllCheckbox.checked = allVisibleSelected;
            this.elements.selectAllCheckbox.indeterminate = !allVisibleSelected && anyVisibleSelected;
        }
    }

    /**
     * Aplica/remove a classe de destaque nas linhas selecionadas.
     * @private
     */
    updateRowHighlight() {
        if (!this.elements.tableBody) return; // Check if tableBody exists

        this.elements.tableBody.querySelectorAll('tr').forEach(rowElement => {
            const recordId = rowElement.getAttribute('data-record-id');
            const isSelected = this.selectedRecords.some(selected =>
                String(this.getNestedValue(selected, this.options.recordIdField)) === String(recordId)
            );
            if (isSelected) {
                rowElement.classList.add('table-active');
            } else {
                rowElement.classList.remove('table-active');
            }
            // Ensure the input state matches the selection
            const input = rowElement.querySelector('.row-select');
            if (input) {
                input.checked = isSelected;
            }
        });
    }

    /**
     * Obtém o valor de uma propriedade aninhada de um objeto.
     * Ex: getNestedValue(obj, 'address.street')
     * @private
     * @param {object} obj - O objeto.
     * @param {string} path - O caminho da propriedade (ex: 'prop.subprop').
     * @returns {*} O valor da propriedade ou undefined se não encontrado.
     */
    getNestedValue(obj, path) {
        if (!obj || !path) return undefined;
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    /**
     * Obtém o valor a ser exibido para uma célula, considerando dataField ou field.
     * @private
     * @param {object} row - O objeto de dados da linha.
     * @param {object} column - O objeto de configuração da coluna.
     * @returns {*} O valor da propriedade ou undefined se não encontrado.
     */
    getDisplayValue(row, column) {
        const dataPath = column.dataField || column.field;
        return this.getNestedValue(row, dataPath);
    }

    /**
     * Binda eventos personalizados definidos em `onCellEvent` para células específicas.
     * Utiliza delegação de eventos.
     * @private
     * @param {HTMLElement} parentElement - O elemento pai onde os eventos serão delegados (e.g., this.elements.tableBody).
     */
    bindCustomCellEvents(parentElement) {
        if (typeof this.options.onCellEvent !== 'function' || !parentElement) {
            return;
        }

        // Remove listeners que podem ter sido adicionados anteriormente para este parentElement
        const existingListener = this.delegatedEventListeners.get(parentElement);
        if (existingListener) {
            parentElement.removeEventListener('click', existingListener);
        }

        const cellEventHandler = (e) => {
            const cell = e.target.closest('td');
            const row = e.target.closest('tr');
            if (!cell || !row) return;

            const rowIndex = parseInt(row.getAttribute('data-index'));
            const record = this.data[rowIndex];
            const cellIndex = Array.from(row.children).indexOf(cell);

            // Adjust cellIndex if selection column is present
            let effectiveCellIndex = cellIndex;
            if (!this.options.hideSelectionColumn) {
                effectiveCellIndex = cellIndex - 1;
            }

            if (effectiveCellIndex >= 0 && effectiveCellIndex < this.options.columns.length) {
                const column = this.options.columns[effectiveCellIndex];
                // Pass the event, the record, the column field, and the column definition
                this.options.onCellEvent.call(this, e, record, column.field, column);
            }
        };

        parentElement.addEventListener('click', cellEventHandler);
        // Store the listener reference for proper removal when modal is hidden/re-rendered
        this.delegatedEventListeners.set(parentElement, cellEventHandler);
    }
}


// Expõe a classe globalmente se necessário, ou use módulos ES6
window.Browlist = Browlist;