/**
 * Browlist - Biblioteca para seleção de registos com modal Bootstrap 5
 * @author Pedro Correia
 * @version 1.2.0 (Com melhorias de eventos de célula delegados)
 */

class Browlist {
    constructor(options = {}) {
        this.options = {
            // Configurações básicas            
            multipleSelection: false,
            hideSelectionColumn: false,
            modalTitle: 'Seleção de Registos',
            modalSize: 'xl', // sm, lg, xl
            recordIdField: 'id', // Campo que identifica unicamente um registo (usado para seleção)

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

            // Textos personalizáveis
            texts: {
                save: 'Gravar',
                cancel: 'Cancelar',
                search: 'Pesquisar',
                searchType: 'Tipo de pesquisa',
                globalSearch: 'Pesquisa global',
                noResults: 'Nenhum resultado encontrado',
                noSearchResults: 'Nenhum resultado encontrado para a sua pesquisa.',
                loading: 'Carregando...',
                recordsPerPage: 'Registos por página',
                showing: 'Mostrar',
                to: 'de',
                of: 'de',
                entries: 'entradas',
                previous: 'Anterior',
                next: 'Próximo',
                errorLoadingData: 'Erro ao carregar dados.'
            },

            ...options
        };

        // Validação básica das opções essenciais
        if (!this.options.dataSource) {
            console.error('RecordSelector: A opção "dataSource" é obrigatória.');
            throw new Error('RecordSelector: dataSource is required.');
        }
        if (!Array.isArray(this.options.columns) || this.options.columns.length === 0) {
            console.error('RecordSelector: A opção "columns" deve ser um array não vazio de configurações de coluna.');
            throw new Error('RecordSelector: columns must be a non-empty array.');
        }
        this.options.columns.forEach((col, index) => {
            if (!col.field || !col.title) {
                console.warn(`RecordSelector: Coluna ${index} está mal configurada. Requer 'field' e 'title'.`, col);
            }
        });

         // Mescla as opções fornecidas com as predefinidas
        this.options = { ...this.options, ...options };

        this.data = [];
        this.filteredData = []; // Esta propriedade é mais relevante para carga de dados local. Para server-side, a filtragem é no servidor.
        
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalRecords = 0;
        this.selectedRecords = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.searchTerm = '';
        this.searchColumn = 'global';
        this.isServerSide = typeof this.options.dataSource === 'string';
        this.modalId = 'recordSelector_' + Date.now();
        this.modal = null;
        this.modalElement = null;
        this.searchTimeout = null; // Para debounce
        this.pageSizeTimeout = null; // Para debounce (se necessário)

        // Map para armazenar handlers de eventos delegados para remoção
        this.delegatedEventListeners = new Map();
    }

    /**
     * Abre a modal de seleção
     * @returns {Promise<void>}
     */
    async open() {
        try {
            this.createModal();
            await this.loadData();
            this.showModal();
        } catch (error) {
            console.error('RecordSelector: Erro ao abrir modal:', error);
            this.showError(this.options.texts.errorLoadingData + ' ' + error.message);
        }
    }

    /**
     * Cria a estrutura HTML da modal
     * @private
     */
    createModal() {
        const modalHTML = `
            <div class="modal fade" id="${this.modalId}" tabindex="-1" role="dialog" aria-labelledby="${this.modalId}Label" aria-hidden="true">
                <div class="modal-dialog modal-${this.options.modalSize}" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${this.modalId}Label">${this.options.modalTitle}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${this.options.texts.cancel}"></button>
                        </div>
                        <div class="modal-body">
                            <div id="${this.modalId}_loading" class="text-center py-4" aria-live="polite">
                                <div class="spinner-border" role="status">
                                    <span class="visually-hidden">${this.options.texts.loading}</span>
                                </div>
                                <p class="mt-2">${this.options.texts.loading}</p>
                            </div>
                            <div id="${this.modalId}_content" style="display: none;">
                                ${this.createSearchSection()}
                                <div class="table-responsive">
                                    <table class="table table-striped table-hover" role="grid">
                                        <thead id="${this.modalId}_thead"></thead>
                                        <tbody id="${this.modalId}_tbody"></tbody>
                                    </table>
                                </div>
                                ${this.createPaginationSection()}
                            </div>
                            <div id="${this.modalId}_error" style="display: none;" class="alert alert-danger" role="alert"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="${this.modalId}_cancel">
                                ${this.options.texts.cancel}
                            </button>
                            <button type="button" class="btn btn-primary" id="${this.modalId}_save">
                                ${this.options.texts.save}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modalElement = document.getElementById(this.modalId);
        this.bindGlobalEvents(); // Bind events on modal elements
    }

    /**
     * Cria a seção de pesquisa
     * @private
     * @returns {string} HTML da seção de pesquisa
     */
    createSearchSection() {
        if (!this.options.searchable) return '';

        const searchableColumns = this.options.columns.filter(col => col.searchable !== false); // Se searchable for undefined ou true, considera como searchable
        const hasColumnSearch = searchableColumns.length > 0;

        let searchTypeOptions = `<option value="global">${this.options.texts.globalSearch}</option>`;

        if (hasColumnSearch) {
            searchableColumns.forEach(col => {
                searchTypeOptions += `<option value="${col.field}">${col.title}</option>`;
            });
        }

        return `
            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="input-group">
                        ${hasColumnSearch ? `
                            <label for="${this.modalId}_searchType" class="visually-hidden">${this.options.texts.searchType}</label>
                            <select class="form-select" id="${this.modalId}_searchType" aria-label="${this.options.texts.searchType}">
                                ${searchTypeOptions}
                            </select>
                        ` : ''}
                        <label for="${this.modalId}_search" class="visually-hidden">${this.options.texts.search}</label>
                        <input type="text" data-vk class="form-control" id="${this.modalId}_search"
                               placeholder="${this.options.texts.search}" aria-label="${this.options.texts.search}">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="d-flex align-items-center justify-content-end">
                        <label for="${this.modalId}_pageSize" class="me-2 text-nowrap">${this.options.texts.recordsPerPage}:</label>
                        <select class="form-select" id="${this.modalId}_pageSize" style="width: auto;" aria-label="${this.options.texts.recordsPerPage}">
                            ${this.options.pageSizeOptions.map(size =>
                                `<option value="${size}" ${size === this.options.pageSize ? 'selected' : ''}>${size}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Cria a seção de paginação
     * @private
     * @returns {string} HTML da seção de paginação
     */
    createPaginationSection() {
        return `
            <div class="row mt-3">
                <div class="col-md-6">
                    <div id="${this.modalId}_info" class="text-muted" aria-live="polite"></div>
                </div>
                <div class="col-md-6">
                    <nav aria-label="Navegação da Tabela">
                        <ul class="pagination justify-content-end" id="${this.modalId}_pagination"></ul>
                    </nav>
                </div>
            </div>
        `;
    }

    /**
     * Vincula eventos aos elementos da modal
     * @private
     */
    bindGlobalEvents() {
        const saveButton = document.getElementById(`${this.modalId}_save`);
        const cancelButton = document.getElementById(`${this.modalId}_cancel`);
        const searchInput = document.getElementById(`${this.modalId}_search`);
        const searchTypeSelect = document.getElementById(`${this.modalId}_searchType`);
        const pageSizeSelect = document.getElementById(`${this.modalId}_pageSize`);

        // Armazenar referências para remoção no destroy
        this.boundHandleSave = this.handleSave.bind(this);
        this.boundHandleCancel = this.handleCancel.bind(this);
        this.boundSearchInput = (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.loadData();
            }, 300);
        };
        this.boundSearchTypeChange = (e) => {
            this.searchColumn = e.target.value;
            this.currentPage = 1;
            this.loadData();
        };
        this.boundPageSizeChange = (e) => {
            clearTimeout(this.pageSizeTimeout);
            this.pageSizeTimeout = setTimeout(() => {
                this.options.pageSize = parseInt(e.target.value);
                this.currentPage = 1;
                this.loadData();
            }, 100);
        };
        this.boundHiddenModal = () => this.destroy();


        if (saveButton) saveButton.addEventListener('click', this.boundHandleSave);
        if (cancelButton) cancelButton.addEventListener('click', this.boundHandleCancel);

        // Pesquisa
        if (this.options.searchable && searchInput) {
            searchInput.addEventListener('input', this.boundSearchInput);
            if (searchTypeSelect) {
                searchTypeSelect.addEventListener('change', this.boundSearchTypeChange);
            }
        }

        // Tamanho da página
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', this.boundPageSizeChange);
        }

        // Evento de fechamento da modal (garante que destroy seja chamado)
        if (this.modalElement) {
            this.modalElement.addEventListener('hidden.bs.modal', this.boundHiddenModal);
        }
    }

    /**
     * Carrega os dados para a tabela
     * @private
     * @returns {Promise<void>}
     */
    async loadData() {
        try {
            this.showLoading(true);
            this.showError(null); // Limpa mensagens de erro anteriores

            if (this.isServerSide) {
                await this.loadDataFromServer();
            } else {
                this.loadDataFromJSON();
            }

            this.renderTable();
            this.renderPagination();
            this.updateInfo();

            try {
                if (this.options.onDataLoad) {
                    this.options.onDataLoad(this.data);
                }
            } catch (callbackError) {
                console.error("RecordSelector: Erro no callback onDataLoad:", callbackError);
            }

            this.showLoading(false);
            // Após carregar os dados, atualiza a seleção visual
            this.updateRowHighlight();
            this.updateSelectAllState();

        } catch (error) {
            console.error('RecordSelector: Erro ao carregar dados:', error);
            this.showError(this.options.texts.errorLoadingData + ' ' + error.message);
            this.showLoading(false);
        }
    }

    /**
     * Obtém os dados da fonte configurada.
     * @private
     */
    async loadDataFromServer() {
        if (!this.options.dataSource) {
            console.warn('Browlist: dataSource não configurado. Não é possível carregar dados.');
            return;
        }

        this.showLoading(true);

        try {
            let url = this.options.dataSource;
            let fetchOptions = {
                method: this.options.httpMethod,
                headers: {}, // Inicializa os headers
            };

            // Parâmetros base para a requisição
            const requestParams = {
                page: this.currentPage,
                pageSize: this.options.pageSize,
                search: this.searchTerm,
                searchColumn: this.searchColumn,
                sortColumn: this.sortColumn,
                sortDirection: this.sortDirection,
                ...this.options.additionalParams, // Adiciona os parâmetros adicionais
            };

            if (this.options.httpMethod.toUpperCase() === 'GET') {
                // Para GET, adiciona os parâmetros à URL como query string
                const params = new URLSearchParams(requestParams).toString();
                url = `${url}?${params}`;
            } else if (this.options.httpMethod.toUpperCase() === 'POST') {
                // Para POST, determina o tipo de corpo
                if (this.options.httpPostType === 'json') {
                    // Enviar como JSON (comportamento atual)
                    fetchOptions.headers['Content-Type'] = 'application/json';
                    fetchOptions.body = JSON.stringify(requestParams);
                } else if (this.options.httpPostType === 'formData') {
                    // NOVO: Enviar como FormData
                    const formData = new FormData();
                    for (const key in requestParams) {
                        if (Object.prototype.hasOwnProperty.call(requestParams, key)) {
                            // Se o valor for um objeto ou array, pode precisar de ser stringificado
                            // para ser enviado como parte de FormData
                            if (typeof requestParams[key] === 'object' && requestParams[key] !== null) {
                                formData.append(key, JSON.stringify(requestParams[key]));
                            } else {
                                formData.append(key, requestParams[key]);
                            }
                        }
                    }
                    fetchOptions.body = formData;
                    // fetch não precisa de 'Content-Type' para FormData, o browser define
                } else {
                    console.warn(`Browlist: httpPostType '${this.options.httpPostType}' não reconhecido. Usando JSON por padrão.`);
                    fetchOptions.headers['Content-Type'] = 'application/json';
                    fetchOptions.body = JSON.stringify(requestParams);
                }
            }

            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
            }

            const result = await response.json();

            if (this.options.onDataLoad && typeof this.options.onDataLoad === 'function') {
                this.options.onDataLoad(result);
            }

            this.data = result.data || [];
            this.totalRecords = result.totalRecords || 0;
            // A LINHA CHAVE PARA A CORREÇÃO: CALCULAR totalPages
            this.totalPages = Math.ceil(this.totalRecords / this.options.pageSize); //

            this.renderTable();
            this.renderPagination();
            this.updateSelectAllState(); // Atualiza o estado do checkbox "selecionar tudo"
            this.updateRowHighlight(); // Garante que as linhas selecionadas são realçadas após o carregamento

        } catch (error) {
            this.showError('Erro ao carregar os dados. Consulte o log.');
            console.error('Browlist: Erro ao carregar dados:', error);
            
            // Poderíamos exibir uma mensagem de erro na UI aqui
        } finally {
            this.showLoading(false);
        }
    }
    ///**
    // * Carrega dados do servidor via AJAX
    // * @private
    // * @returns {Promise<void>}
    // */
    //async loadDataFromServer() {
    //    const params = {
    //        page: this.currentPage,
    //        pageSize: this.options.pageSize,
    //        search: this.searchTerm,
    //        searchColumn: this.searchColumn,
    //        sortColumn: this.sortColumn,
    //        sortDirection: this.sortDirection,
    //        ...this.options.additionalParams
    //    };
//
    //    const url = new URL(this.options.dataSource);
//
    //    let response;
    //    if (this.options.httpMethod.toUpperCase() === 'POST') {
    //        response = await fetch(url, {
    //            method: 'POST',
    //            headers: {
    //                'Content-Type': 'application/json',
    //            },
    //            body: JSON.stringify(params)
    //        });
    //    } else {
    //        Object.keys(params).forEach(key => {
    //            if (params[key] !== null && params[key] !== '') { // Evita adicionar parâmetros vazios ou nulos
    //                url.searchParams.append(key, params[key]);
    //            }
    //        });
    //        response = await fetch(url);
    //    }
//
    //    if (!response.ok) {
    //        const errorText = await response.text(); // Tenta ler o corpo da resposta para mais detalhes
    //        throw new Error(`HTTP ${response.status}: ${response.statusText}. Detalhes: ${errorText.substring(0, 100)}...`);
    //    }
//
    //    const result = await response.json();
//
    //    // Espera-se que o servidor retorne: { data: [], totalRecords: number }
    //    this.data = result.data || [];
    //    this.totalRecords = result.totalRecords || 0;
    //    this.totalPages = Math.ceil(this.totalRecords / this.options.pageSize);
    //}

    /**
     * Carrega dados de um array JSON local
     * @private
     */
    loadDataFromJSON() {
        let data = Array.isArray(this.options.dataSource) ? [...this.options.dataSource] : []; // Cria uma cópia para não modificar o original

        // Filtrar
        if (this.searchTerm) {
            data = data.filter(row => {
                if (this.searchColumn === 'global') {
                    return this.options.columns.some(col => {
                        // Apenas procura em colunas que explicitamente permitam pesquisa (ou se 'searchable' não for definido como false)
                        if (col.searchable !== false) {
                            const value = this.getNestedValue(row, col.field);
                            return String(value || '').toLowerCase().includes(this.searchTerm.toLowerCase());
                        }
                        return false;
                    });
                } else {
                    const value = this.getNestedValue(row, this.searchColumn);
                    return String(value || '').toLowerCase().includes(this.searchTerm.toLowerCase());
                }
            });
        }

        // Ordenar
        if (this.sortColumn) {
            data.sort((a, b) => {
                const aVal = this.getNestedValue(a, this.sortColumn);
                const bVal = this.getNestedValue(b, this.sortColumn);

                // Tratamento para valores nulos/indefinidos e tipos diferentes
                if (aVal === null || aVal === undefined) return this.sortDirection === 'asc' ? -1 : 1;
                if (bVal === null || bVal === undefined) return this.sortDirection === 'asc' ? 1 : -1;

                let result = 0;
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    result = aVal.localeCompare(bVal);
                } else {
                    if (aVal < bVal) result = -1;
                    else if (aVal > bVal) result = 1;
                }

                return this.sortDirection === 'desc' ? -result : result;
            });
        }

        this.totalRecords = data.length;
        this.totalPages = Math.ceil(this.totalRecords / this.options.pageSize);

        // Ajusta a página atual se esta for maior que o total de páginas após filtragem/ordenação
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
            this.currentPage = this.totalPages;
        } else if (this.totalPages === 0) {
            this.currentPage = 1; // Se não houver dados, volta à página 1
        }

        // Paginar
        const start = (this.currentPage - 1) * this.options.pageSize;
        this.data = data.slice(start, start + this.options.pageSize);
    }

    /**
     * Renderiza a tabela (cabeçalho e corpo)
     * @private
     */
    renderTable() {
        this.renderTableHeader();
        this.renderTableBody();
    }

    /**
     * Renderiza o cabeçalho da tabela
     * @private
     */
    renderTableHeader() {
        const thead = document.getElementById(`${this.modalId}_thead`);
        if (!thead) return;

        let headerHTML = '<tr>';

        // Modificação aqui
        if (!this.options.hideSelectionColumn) { // Se não for para ocultar a coluna de seleção
            if (this.options.multipleSelection) {
                headerHTML += `
                    <th scope="col" style="width: 40px;">
                        <input type="checkbox" class="form-check-input" id="${this.modalId}_selectAll" aria-label="Selecionar todas as linhas visíveis">
                    </th>
                `;
            } else {
                headerHTML += '<th scope="col" style="width: 40px;"></th>'; // Coluna para o radio button
            }
        }


        this.options.columns.forEach(col => {
            const sortable = col.sortable !== false && this.options.sortable;
            const sortIcon = this.getSortIcon(col.field);
            const ariaSort = (this.sortColumn === col.field)
                ? (this.sortDirection === 'asc' ? 'ascending' : 'descending')
                : 'none';

            headerHTML += `
                <th scope="col" ${sortable ? `style="cursor: pointer;" data-sort="${col.field}" aria-sort="${ariaSort}"` : ''}>
                    ${col.title}
                    ${sortable ? sortIcon : ''}
                </th>
            `;
        });

        headerHTML += '</tr>';
        thead.innerHTML = headerHTML;

        // ... restante da função
        // Evento select all (também deve ser condicional)
        if (this.options.multipleSelection && !this.options.hideSelectionColumn) { // Adicionar !this.options.hideSelectionColumn
            const selectAllCheckbox = document.getElementById(`${this.modalId}_selectAll`);
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', (e) => {
                    this.toggleSelectAll(e.target.checked);
                });
                this.delegatedEventListeners.set(selectAllCheckbox, (e) => {
                    this.toggleSelectAll(e.target.checked);
                });
            }
        }
    }

    /**
     * Renderiza o corpo da tabela
     * @private
     */
    renderTableBody() {
        const tbody = document.getElementById(`${this.modalId}_tbody`);
        if (!tbody) return;

        // Remover listeners de eventos delegados antigos antes de renderizar um novo tbody
        this.clearDelegatedEventListeners();

        if (this.data.length === 0) {
            const message = this.searchTerm ? this.options.texts.noSearchResults : this.options.texts.noResults;
            // Ajustar o colspan se a coluna de seleção estiver oculta
            const colspan = this.options.columns.length + (this.options.hideSelectionColumn ? 0 : 1);
            tbody.innerHTML = `
                <tr>
                    <td colspan="${colspan}" class="text-center text-muted py-4">
                        ${message}
                    </td>
                </tr>
            `;
            return;
        }

        let bodyHTML = '';
        this.data.forEach((row, index) => {
            const recordId = this.getNestedValue(row, this.options.recordIdField);
            const isSelected = this.selectedRecords.some(selected =>
                this.getNestedValue(selected, this.options.recordIdField) === recordId
            );

            bodyHTML += `<tr data-index="${index}" data-record-id="${recordId}" ${isSelected ? 'class="table-active"' : ''}>`;

            // Coluna de seleção (Modificação aqui)
            if (!this.options.hideSelectionColumn) { // Se não for para ocultar a coluna de seleção
                if (this.options.multipleSelection) {
                    bodyHTML += `
                        <td role="gridcell">
                            <input type="checkbox" class="form-check-input row-select"
                                   data-index="${index}" ${isSelected ? 'checked' : ''}
                                   aria-label="Selecionar linha">
                        </td>
                    `;
                } else {
                    bodyHTML += `
                        <td role="gridcell">
                            <input type="radio" class="form-check-input row-select"
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
                        console.error(`RecordSelector: Erro ao renderizar coluna '${col.field}':`, renderError);
                        cellContent = `[Erro ao renderizar]`;
                    }
                } else {
                    cellContent = this.getNestedValue(row, col.field) || '';
                }

                bodyHTML += `<td role="gridcell">${cellContent}</td>`;
            });

            bodyHTML += '</tr>';
        });

        tbody.innerHTML = bodyHTML;

        // Eventos de seleção (delegados) - também deve ser condicional
        if (!this.options.hideSelectionColumn) { // Adicionar !this.options.hideSelectionColumn
            const rowSelectHandler = (e) => {
                if (e.target.classList.contains('row-select')) {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    this.toggleRowSelection(index, e.target.checked, e.target);
                }
            };
            tbody.addEventListener('change', rowSelectHandler);
            this.delegatedEventListeners.set(tbody, rowSelectHandler);
        }

        this.bindCustomCellEvents(tbody);
    }
    
    /**
     * Vincula eventos personalizados aos elementos da tabela usando delegação.
     * @private
     * @param {HTMLElement} tbody - O elemento tbody da tabela.
     */
    bindCustomCellEvents(tbody) {
        this.options.columns.forEach(col => {
            if (col.onCellEvent && typeof col.onCellEvent === 'object') {
                for (const eventSelector in col.onCellEvent) {
                    if (Object.prototype.hasOwnProperty.call(col.onCellEvent, eventSelector)) {
                        const [eventType, selector] = eventSelector.split(/ (.+)/); // Divide em "eventType" e "selector"

                        if (!eventType || !selector) {
                            console.warn(`RecordSelector: Formato inválido para onCellEvent: "${eventSelector}" na coluna "${col.field}". Esperado "eventType seletorCSS".`);
                            continue;
                        }

                        // Criar um handler delegado para cada tipo de evento e seletor
                        const delegatedHandler = (event) => {
                            // Verifica se o target do evento corresponde ao seletor ou está dentro dele
                            const matchingElement = event.target.closest(selector);
                            if (matchingElement && tbody.contains(matchingElement)) {
                                const rowElement = matchingElement.closest('tr');
                                if (rowElement) {
                                    const rowIndex = parseInt(rowElement.getAttribute('data-index'));
                                    const rowData = this.data[rowIndex];
                                    if (rowData) {
                                        try {
                                            col.onCellEvent[eventSelector](event, rowData, rowIndex);
                                        } catch (callbackError) {
                                            console.error(`RecordSelector: Erro no callback onCellEvent para "${eventSelector}" na coluna "${col.field}":`, callbackError);
                                        }
                                    }
                                }
                            }
                        };

                        // Adiciona o listener delegado ao tbody
                        tbody.addEventListener(eventType, delegatedHandler);
                        // Armazenar para remoção. A chave é uma string única para o evento/seletor.
                        this.delegatedEventListeners.set(`${eventType}-${selector}`, { element: tbody, handler: delegatedHandler, eventType: eventType });
                    }
                }
            }
        });
    }

    /**
     * Alterna a seleção de uma linha.
     * @private
     * @param {number} index - O índice do registo em `this.data`.
     * @param {boolean} selected - True para selecionar, false para deselecionar.
     * @param {HTMLElement} currentInput - O input (checkbox/radio) que acionou o evento.
     */
    toggleRowSelection(index, selected, currentInput = null) {
        const row = this.data[index];
        if (!row) return;

        const recordId = this.getNestedValue(row, this.options.recordIdField);
        if (recordId === undefined || recordId === null) {
            console.warn(`RecordSelector: O campo de ID único ('${this.options.recordIdField}') não foi encontrado no registo. A seleção pode não ser consistente.`, row);
            // Continua, mas com aviso
        }

        if (this.options.multipleSelection) {
            if (selected) {
                if (recordId !== undefined && recordId !== null && !this.selectedRecords.some(r => this.getNestedValue(r, this.options.recordIdField) === recordId)) {
                    this.selectedRecords.push(row);
                } else if ((recordId === undefined || recordId === null) && !this.selectedRecords.some(r => JSON.stringify(r) === JSON.stringify(row))) {
                     this.selectedRecords.push(row); // Fallback para JSON.stringify se ID não existe
                }
            } else {
                if (recordId !== undefined && recordId !== null) {
                    this.selectedRecords = this.selectedRecords.filter(r =>
                        this.getNestedValue(r, this.options.recordIdField) !== recordId
                    );
                } else {
                    this.selectedRecords = this.selectedRecords.filter(r =>
                        JSON.stringify(r) !== JSON.stringify(row) // Fallback para JSON.stringify se ID não existe
                    );
                }
            }
        } else {
            this.selectedRecords = selected ? [row] : [];
            // Desmarcar outros radio buttons manualmente se for o caso
            if (currentInput && currentInput.type === 'radio' && selected) {
                 document.querySelectorAll(`#${this.modalId} .row-select[type="radio"]`).forEach(input => {
                    if (input !== currentInput) input.checked = false;
                });
            }
        }

        this.updateSelectAllState();
        this.updateRowHighlight();

        try {
            if (this.options.onRowSelect) {
                this.options.onRowSelect(this.selectedRecords, row, selected);
            }
        } catch (callbackError) {
            console.error("RecordSelector: Erro no callback onRowSelect:", callbackError);
        }
    }

    /**
     * Alterna a seleção de todas as linhas visíveis.
     * @private
     * @param {boolean} selectAll - True para selecionar todas, false para deselecionar.
     */
    toggleSelectAll(selectAll) {
        if (!this.options.multipleSelection) return;

        const currentVisibleRecordIds = new Set(this.data.map(row => this.getNestedValue(row, this.options.recordIdField)));

        if (selectAll) {
            // Adiciona todos os registos visíveis que ainda não estão selecionados
            this.data.forEach(row => {
                const recordId = this.getNestedValue(row, this.options.recordIdField);
                if (recordId !== undefined && recordId !== null) {
                    if (!this.selectedRecords.some(r => this.getNestedValue(r, this.options.recordIdField) === recordId)) {
                        this.selectedRecords.push(row);
                    }
                } else {
                    // Fallback para objetos sem ID (menos ideal)
                    if (!this.selectedRecords.some(r => JSON.stringify(r) === JSON.stringify(row))) {
                        this.selectedRecords.push(row);
                    }
                }
            });
        } else {
            // Remove apenas os registos visíveis da seleção
            if (this.options.recordIdField) {
                this.selectedRecords = this.selectedRecords.filter(selectedRec => {
                    const selectedRecId = this.getNestedValue(selectedRec, this.options.recordIdField);
                    // Manter o registo selecionado se não for um dos registos atualmente visíveis
                    return !currentVisibleRecordIds.has(selectedRecId);
                });
            } else {
                // Se não houver recordIdField, a remoção é mais complexa, potencialmente removendo
                // todas as seleções que correspondem aos JSON.stringify dos registos visíveis.
                // Para simplificar e evitar problemas com objetos complexos, considerar
                // que esta funcionalidade é melhor com um recordIdField.
                // Para um cenário sem recordIdField, teríamos que comparar cada objeto.
                // O exemplo abaixo é uma abordagem simplificada que pode não ser totalmente robusta:
                const currentVisibleRecordsJSON = new Set(this.data.map(row => JSON.stringify(row)));
                this.selectedRecords = this.selectedRecords.filter(selectedRec => {
                    return !currentVisibleRecordsJSON.has(JSON.stringify(selectedRec));
                });
            }
        }

        // Atualiza os checkboxes da UI e o destaque das linhas
        document.querySelectorAll(`#${this.modalId} .row-select[type="checkbox"]`).forEach(input => {
            const index = parseInt(input.getAttribute('data-index'));
            const row = this.data[index];
            const recordId = this.getNestedValue(row, this.options.recordIdField);
            
            let isSelected = false;
            if (recordId !== undefined && recordId !== null) {
                isSelected = this.selectedRecords.some(r => this.getNestedValue(r, this.options.recordIdField) === recordId);
            } else {
                isSelected = this.selectedRecords.some(r => JSON.stringify(r) === JSON.stringify(row));
            }
            input.checked = isSelected;
        });

        this.updateSelectAllState(); // Assegura que o estado final é consistente
        this.updateRowHighlight(); // Garante que as linhas selecionadas são realçadas
    }

    /**
     * Atualiza o estado do checkbox "Selecionar Tudo".
     * @private
     */
    updateSelectAllState() {
        if (!this.options.multipleSelection || this.options.hideSelectionColumn) return; // Adicionar this.options.hideSelectionColumn

        const selectAllCheckbox = document.getElementById(`${this.modalId}_selectAll`);
        if (!selectAllCheckbox) return;

        const rowCheckboxes = document.querySelectorAll(`#${this.modalId} .row-select[type="checkbox"]`);
        const checkedBoxes = document.querySelectorAll(`#${this.modalId} .row-select[type="checkbox"]:checked`);

        if (rowCheckboxes.length === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
            selectAllCheckbox.disabled = true;
        } else {
            selectAllCheckbox.disabled = false;
            if (checkedBoxes.length === 0) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = false;
            } else if (checkedBoxes.length === rowCheckboxes.length) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = true;
            } else {
                selectAllCheckbox.indeterminate = true;
                selectAllCheckbox.checked = false;
            }
        }
    }

    /**
     * Atualiza o destacamento visual das linhas selecionadas.
     * @private
     */
    updateRowHighlight() {
        document.querySelectorAll(`#${this.modalId} tbody tr`).forEach(tr => {
            const recordIdAttr = tr.getAttribute('data-record-id');
            const index = parseInt(tr.getAttribute('data-index'));

            let isSelected = false;
            if (recordIdAttr !== 'undefined' && recordIdAttr !== 'null') {
                isSelected = this.selectedRecords.some(r => String(this.getNestedValue(r, this.options.recordIdField)) === recordIdAttr);
            } else {
                const row = this.data[index];
                if (row) {
                    isSelected = this.selectedRecords.some(r => JSON.stringify(r) === JSON.stringify(row));
                }
            }

            tr.classList.toggle('table-active', isSelected);

            // Também atualiza o estado do checkbox/radio da linha (apenas se a coluna de seleção não estiver oculta)
            if (!this.options.hideSelectionColumn) { // Adicionar esta condição
                const input = tr.querySelector('.row-select');
                if (input) {
                    input.checked = isSelected;
                }
            }
        });
    }


    /**
     * Renderiza os controles de paginação.
     * @private
     */
    renderPagination() {
        const pagination = document.getElementById(`${this.modalId}_pagination`);
        if (!pagination) return;

        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        // Limpar listeners de paginação anteriores
        this.clearPaginationEventListeners();

        let paginationHTML = '';

        // Botão Anterior
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}" aria-label="${this.options.texts.previous}">
                    ${this.options.texts.previous}
                </a>
            </li>
        `;

        // Números das páginas (lógica de exibição de 5 páginas ao redor da atual)
        const maxPagesToShow = 5; // Total de páginas a mostrar (e.g., 1 ... 3 4 [5] 6 7 ... 10)
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

        // Ajusta startPage e endPage para que o número de páginas exibidas seja constante, se possível
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }


        if (startPage > 1) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link" aria-hidden="true">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}" ${i === this.currentPage ? 'aria-current="page"' : ''}>
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link" aria-hidden="true">...</span></li>`;
            }
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${this.totalPages}">${this.totalPages}</a>
                </li>
            `;
        }

        // Botão Próximo
        paginationHTML += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}" aria-label="${this.options.texts.next}">
                    ${this.options.texts.next}
                </a>
            </li>
        `;

        pagination.innerHTML = paginationHTML;

        // Eventos de paginação
        pagination.querySelectorAll('a.page-link[data-page]').forEach(link => {
            const handler = (e) => {
                e.preventDefault(); // Impede o comportamento padrão do link
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
                    this.currentPage = page;
                    this.loadData();
                }
            };
            link.addEventListener('click', handler);
            this.delegatedEventListeners.set(link, handler); // Armazenar para limpeza
        });
    }

    /**
     * Atualiza as informações de paginação (e.g., "Mostrando X a Y de Z entradas").
     * @private
     */
    updateInfo() {
        const info = document.getElementById(`${this.modalId}_info`);
        if (!info) return;

        let start = 0;
        let end = 0;

        if (this.totalRecords > 0) {
            start = (this.currentPage - 1) * this.options.pageSize + 1;
            end = Math.min(this.currentPage * this.options.pageSize, this.totalRecords);
        }

        info.textContent = `${this.options.texts.showing} ${start} ${this.options.texts.to} ${end} ${this.options.texts.of} ${this.totalRecords} ${this.options.texts.entries}`;
    }

    /**
     * Obtém o ícone de ordenação apropriado.
     * @private
     * @param {string} field - O campo da coluna.
     * @returns {string} O HTML do ícone.
     */
    getSortIcon(field) {
        if (this.sortColumn !== field) {
            return '<i class="bi bi-arrow-down-up ms-1 text-muted"></i>';
        }

        return this.sortDirection === 'asc'
            ? '<i class="bi bi-arrow-up ms-1"></i>'
            : '<i class="bi bi-arrow-down ms-1"></i>';
    }

    /**
     * Obtém um valor aninhado de um objeto usando um path de string (e.g., "endereco.rua").
     * @private
     * @param {object} obj - O objeto.
     * @param {string} path - O caminho da propriedade.
     * @returns {*} O valor da propriedade ou undefined se não encontrado.
     */
    getNestedValue(obj, path) {
        if (!obj || !path) return undefined;
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Define um valor aninhado em um objeto usando um path de string (cria objetos intermediários se necessário).
     * @private
     * @param {object} obj - O objeto.
     * @param {string} path - O caminho da propriedade.
     * @param {*} value - O valor a ser definido.
     */
    setNestedValue(obj, path, value) {
        if (!obj || !path) return;
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    /**
     * Mostra ou esconde o indicador de carregamento.
     * @private
     * @param {boolean} show - True para mostrar, false para esconder.
     */
    showLoading(show) {
        const loading = document.getElementById(`${this.modalId}_loading`);
        const content = document.getElementById(`${this.modalId}_content`);
        const error = document.getElementById(`${this.modalId}_error`);

        if (loading) loading.style.display = show ? 'block' : 'none';
        if (content) content.style.display = show ? 'none' : 'block';
        if (error) error.style.display = 'none'; // Limpa erros ao carregar
    }

    /**
     * Mostra uma mensagem de erro.
     * @private
     * @param {string|null} message - A mensagem de erro a ser exibida. Passar null para limpar.
     */
    showError(message) {
        const loading = document.getElementById(`${this.modalId}_loading`);
        const content = document.getElementById(`${this.modalId}_content`);
        const error = document.getElementById(`${this.modalId}_error`);

        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'none';

        if (error) {
            error.textContent = message || '';
            error.style.display = message ? 'block' : 'none';
        }
    }

    /**
     * Mostra a modal usando a API do Bootstrap.
     * @private
     */
    showModal() {
        if (this.modalElement) {
            this.modal = new bootstrap.Modal(this.modalElement, {
                backdrop: 'static', // Não permite fechar clicando fora
                keyboard: false     // Não permite fechar com a tecla ESC
            });
            this.modal.show();
        }
    }

    /**
     * Manipula o evento de clique no botão "Gravar".
     * @private
     */
    handleSave() {
        let shouldClose = true;
        try {
            if (this.options.onSave) {
                // Se onSave retornar explicitamente 'false', não fecha a modal
                const result = this.options.onSave(this.selectedRecords);
                if (result === false) {
                    shouldClose = false;
                }
            }
        } catch (error) {
            console.error("RecordSelector: Erro no callback onSave:", error);
            // Decide se fecha ou não em caso de erro no callback. Por padrão, deixamos fechar.
        }

        if (shouldClose) {
            this.close();
        }
    }

    /**
     * Manipula o evento de clique no botão "Cancelar".
     * @private
     */
    handleCancel() {
        let shouldClose = true;
        try {
            if (this.options.onCancel) {
                // Se onCancel retornar explicitamente 'false', não fecha a modal
                const result = this.options.onCancel();
                if (result === false) {
                    shouldClose = false;
                }
            }
        } catch (error) {
            console.error("RecordSelector: Erro no callback onCancel:", error);
            // Decide se fecha ou não em caso de erro no callback. Por padrão, deixamos fechar.
        }

        if (shouldClose) {
            this.close();
        }
    }

    /**
     * Fecha a modal.
     * @public
     */
    close() {
        if (this.modal) {
            this.modal.hide();
        }
    }

    /**
     * Limpa todos os event listeners delegados armazenados no Map.
     * @private
     */
    clearDelegatedEventListeners() {
        this.delegatedEventListeners.forEach((value, key) => {
            if (typeof key === 'string' && value.element && value.handler) { // Eventos de célula
                value.element.removeEventListener(value.eventType, value.handler);
            } else if (value && typeof value === 'function' && key instanceof HTMLElement) { // Eventos de elementos específicos (th, input selectAll)
                key.removeEventListener('click', value); // Pode ser 'change' ou 'click'
                key.removeEventListener('change', value);
                key.removeEventListener('input', value);
            }
        });
        this.delegatedEventListeners.clear(); // Limpa o mapa
    }

    /**
     * Limpa apenas os listeners de paginação
     * @private
     */
    clearPaginationEventListeners() {
        const pagination = document.getElementById(`${this.modalId}_pagination`);
        if (pagination) {
            // Remove todos os listeners atualmente registrados no elemento de paginação
            // Iterar sobre uma cópia das chaves pois o mapa pode ser modificado durante a iteração
            const listenersToRemove = Array.from(this.delegatedEventListeners.keys()).filter(key => {
                const value = this.delegatedEventListeners.get(key);
                return (key instanceof HTMLElement && pagination.contains(key) && typeof value === 'function');
            });
            listenersToRemove.forEach(key => {
                const handler = this.delegatedEventListeners.get(key);
                key.removeEventListener('click', handler);
                this.delegatedEventListeners.delete(key);
            });
        }
    }

    /**
     * Destroi a modal e remove-a da DOM, limpando eventos.
     * @private
     */
    destroy() {
        // Limpar timeouts
        clearTimeout(this.searchTimeout);
        clearTimeout(this.pageSizeTimeout);

        // Remover listeners de eventos globais
        const saveButton = document.getElementById(`${this.modalId}_save`);
        const cancelButton = document.getElementById(`${this.modalId}_cancel`);
        const searchInput = document.getElementById(`${this.modalId}_search`);
        const searchTypeSelect = document.getElementById(`${this.modalId}_searchType`);
        const pageSizeSelect = document.getElementById(`${this.modalId}_pageSize`);
        const selectAllCheckbox = document.getElementById(`${this.modalId}_selectAll`);

        if (saveButton && this.boundHandleSave) saveButton.removeEventListener('click', this.boundHandleSave);
        if (cancelButton && this.boundHandleCancel) cancelButton.removeEventListener('click', this.boundHandleCancel);
        if (searchInput && this.boundSearchInput) searchInput.removeEventListener('input', this.boundSearchInput);
        if (searchTypeSelect && this.boundSearchTypeChange) searchTypeSelect.removeEventListener('change', this.boundSearchTypeChange);
        if (pageSizeSelect && this.boundPageSizeChange) pageSizeSelect.removeEventListener('change', this.boundPageSizeChange);
        if (selectAllCheckbox && this.delegatedEventListeners.has(selectAllCheckbox)) {
            selectAllCheckbox.removeEventListener('change', this.delegatedEventListeners.get(selectAllCheckbox));
        }

        // Remover o listener do modal element
        if (this.modalElement && this.boundHiddenModal) {
            this.modalElement.removeEventListener('hidden.bs.modal', this.boundHiddenModal);
        }

        // Limpar todos os event listeners delegados (tabela, paginação etc.)
        this.clearDelegatedEventListeners();


        if (this.modalElement) {
            this.modalElement.remove();
        }
        this.modal = null;
        this.modalElement = null;

        // Limpar referências para garbage collection
        this.data = [];
        this.filteredData = [];
        this.selectedRecords = [];
    }

    /**
     * Obtém os registos atualmente selecionados.
     * @public
     * @returns {Array<object>} Um array de objetos de registo selecionados.
     */
    getSelectedRecords() {
        return [...this.selectedRecords]; // Retorna uma cópia para evitar modificações externas diretas
    }

    /**
     * Define os registos que devem estar selecionados na modal.
     * Útil para pré-selecionar itens ao abrir a modal.
     * @public
     * @param {Array<object>} records - Um array de objetos de registo a serem pré-selecionados.
     */
    setSelectedRecords(records) {
        // Certifica-se de que a seleção é baseada no ID único
        this.selectedRecords = [];
        if (Array.isArray(records)) {
            records.forEach(rec => {
                const recordId = this.getNestedValue(rec, this.options.recordIdField);
                if (recordId !== undefined && recordId !== null) {
                    // Adiciona apenas se o ID não estiver já presente
                    if (!this.selectedRecords.some(r => this.getNestedValue(r, this.options.recordIdField) === recordId)) {
                        this.selectedRecords.push(rec);
                    }
                } else {
                    // Fallback para objetos sem ID (menos ideal, mas funciona se não houver ID)
                    if (!this.selectedRecords.some(r => JSON.stringify(r) === JSON.stringify(rec))) {
                        this.selectedRecords.push(rec);
                    }
                }
            });
        }
        // Assegura que a UI reflete a seleção definida
        this.updateRowHighlight();
        this.updateSelectAllState();
    }
}

// Expõe a classe globalmente para fácil acesso
window.Browlist = Browlist;