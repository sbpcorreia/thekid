// Cache de elementos DOM e configurações
const RobotUI = {
    cache: {
        target: null,
        robotElements: new Map(),
        statusMessageEl: null // Cache para o elemento da mensagem de status
    },
    
    config: {
        batteryThresholds: { high: 60, low: 20 },
        chargingStatuses: new Set([7, 36]),
        statusColors: { 5: 'bg-danger', 1: 'bg-success' }
    },

    // Inicialização com cache do elemento target e da mensagem de status
    init() {
        this.cache.target = document.getElementById("sb-robot-area");
        this.cache.statusMessageEl = document.getElementById("robot-status-message"); // Captura a mensagem
        return this.cache.target !== null;
    },

    /**
     * Exibe ou oculta a mensagem de status (ex: "A conectar...").
     * @param {boolean} show - Se true, exibe a mensagem; se false, oculta.
     */
    toggleStatusMessage(show) {
        if (this.cache.statusMessageEl) {
            this.cache.statusMessageEl.classList.toggle('d-none', !show);
        }
    },

    // Determinação do ícone da bateria otimizada
    getBatteryIcon(level, status) {
        if (this.config.chargingStatuses.has(status)) return "battery-charging";
        if (level > this.config.batteryThresholds.high) return "battery-full";
        if (level > this.config.batteryThresholds.low) return "battery-half";
        return "battery-low";
    },

    // Helper para criar elementos DOM de forma eficiente
    createElement(tag, options = {}) {
        const element = document.createElement(tag);
        
        if (options.className) element.className = options.className;
        if (options.id) element.id = options.id;
        if (options.text !== undefined) element.textContent = options.text;
        if (options.html !== undefined) element.innerHTML = options.html;
        if (options.src) element.src = options.src;
        if (options.dataset) {
            Object.entries(options.dataset).forEach(([key, value]) => {
                element.dataset[key] = value;
            });
        }
        
        return element;
    },

    // Atualização otimizada de elementos existentes
    updateExistingRobot(item, data) {
        const { robotName, battery, online, robotCode, posX, posY, 
                       status, statusText, podCode, info, robotDir, speed } = data;
        
        const remain = info?.estimatedTimeRemaining ?? 0;
        const progress = info?.progressPercent ?? 0;
        const showProgress = remain > 0;

        // Batch DOM updates para melhor performance
        const updates = [
            ['.robot-image', el => el.classList.toggle('img-grayscale', !online)],
            ['.robot-battery-indicator', el => el.src = `${sbData.site_url}assets/images/${this.getBatteryIcon(battery, status)}.svg`],
            ['.robot-battery-level', el => el.textContent = `(${battery}%)`],
            ['.robot-name', el => el.innerHTML = this.formatRobotName(robotCode, robotName, online)],
            ['.robot-location-text', el => el.textContent = `X: ${posX}, Y: ${posY} (${robotDir}°)`],
            ['.robot-status-text', el => el.textContent = `(${status}) ${statusText}`],
            ['.robot-pod-text', el => el.textContent = podCode || "- Sem carrinho -"],
            ['.robot-speed-text', el => el.textContent = `${speed} mm/s`],
            ['.robot-task-text', el => el.textContent = "Desconhecido" ],
            ['.robot-task-from-text', el => el.textContent = " - "],
            ['.robot-task-to-text', el => el.textContent = " - "],
            ['.robot-eta', el => {
                el.classList.toggle('d-none', !showProgress);
                if (showProgress) {
                    el.querySelector('.robot-eta-text').textContent = `ETA: ${this.formatSecondsToMMSS(remain)}`;
                }
            }],
            ['.robot-progress', el => {
                el.classList.toggle('d-none', !showProgress);
                if (showProgress) {
                    const progressBar = el.querySelector('.robot-progress-status');
                    if (progressBar) {
                        progressBar.style.width = `${progress}%`;
                        progressBar.textContent = `${progress}%`;
                        this.updateProgressBarColor(progressBar, status);
                    }
                }
            }]
        ];

        // Aplicar todas as atualizações de uma vez
        updates.forEach(([selector, updateFn]) => {
            const element = item.querySelector(selector);
            if (element) updateFn(element);
        });
    },

    // Helper para formatação do nome do robot
    formatRobotName(robotCode, robotName, online) {
        const name = robotName ? `(#${robotCode}) ${robotName}` : `#${robotCode}`;
        return online ? name : `${name} (Offline)`;
    },

    // Atualização otimizada da cor da barra de progresso
    updateProgressBarColor(progressBar, status) {
        // Remove classes bg-* existentes de forma eficiente
        progressBar.className = progressBar.className.replace(/\bbg-\w+/g, '');
        
        const colorClass = this.config.statusColors[status];
        if (colorClass) {
            progressBar.classList.add(colorClass);
        }
    },

    formatSecondsToMMSS(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },

    // Criação de novo item de robot otimizada
    createNewRobot(data, index, arrayLength) {
        const { robotName, battery, online, robotCode, posX, posY, 
                       status, statusText, podCode, info, robotDir, speed } = data;
        
        const remain = info?.estimatedTimeRemaining ?? 0;
        const progress = info?.progressPercent ?? 0;
        const showProgress = remain > 0;

        // Container principal
        const item = this.createElement('div', {
            className: `row p-2 robot-item${index + 1 < arrayLength ? " border-bottom" : ""}`,
            id: `robot-${robotCode}`,
            dataset: { robotCode }
        });

        // Coluna da imagem
        const imageCol = this.createElement('div', { className: 'col-xs-12 col-md-4 border-end' });
        const robotImage = this.createElement('img', {
            className: `robot-image img-fluid${!online ? ' img-grayscale' : ''}`,
            src: `${sbData.site_url}assets/images/robot.png`
        });
        imageCol.appendChild(robotImage);

        // Coluna de informações
        const infoCol = this.createElement('div', { className: 'col-xs-12 col-md-8' });

        // Header com nome e bateria
        const header = this.createRobotHeader(robotCode, robotName, online, battery, status);
        infoCol.appendChild(header);

        // Seções de informação
        const sections = [
            this.createInfoSection('bi-activity', 'robot-status', `(${status}) ${statusText}`, 'robot-status-text'),
            this.createInfoSection('bi-compass-fill', 'robot-location', `X: ${posX}, Y: ${posY} (${robotDir}°)`, 'robot-location-text'),
            this.createInfoSection('bi bi-speedometer', 'robot-speed', `${speed} mm/s`, 'robot-speed-text'),
            this.createInfoSection('bi bi-cart-fill', 'robot-pod', podCode || "- Sem carrinho -", 'robot-pod-text'),
            this.createInfoSection('bi-clipboard2-check-fill', 'robot-task', 'Desconhecido', 'robot-task-text'),
            this.createInfoSection('bi bi-arrow-up-right-square-fill', 'robot-task-from', ' - ', 'robot-task-from-text'),
            this.createInfoSection('bi bi-arrow-down-right-square-fill', 'robot-task-to', ' - ', 'robot-task-to-text')
        ];

        sections.forEach(section => infoCol.appendChild(section));

        // ETA e progresso
        if (showProgress) {
            infoCol.appendChild(this.createETASection(remain));
            infoCol.appendChild(this.createProgressSection(progress, status));
        }

        item.appendChild(imageCol);
        item.appendChild(infoCol);

        return item;
    },

    // Criação do header otimizada
    createRobotHeader(robotCode, robotName, online, battery, status) {
        const header = this.createElement('div', { className: 'd-flex justify-content-between align-items-center' });
        
        const name = this.createElement('h4', {
            className: 'fw-bold robot-name',
            html: this.formatRobotName(robotCode, robotName, online)
        });

        const batteryWrap = this.createElement('div');
        const batteryIcon = this.createElement('img', {
            className: 'robot-battery-indicator',
            src: `${sbData.site_url}assets/images/${this.getBatteryIcon(battery, status)}.svg`
        });
        const batteryLevel = this.createElement('span', {
            className: 'fs-6 p-1 fw-bold robot-battery-level',
            text: `(${battery}%)`
        });

        batteryWrap.appendChild(batteryIcon);
        batteryWrap.appendChild(batteryLevel);
        header.appendChild(name);
        header.appendChild(batteryWrap);

        return header;
    },

    // Criação de seção de informação
    createInfoSection(iconClass, wrapperClass, text, textClass = '', visible = true) {
        const wrapper = this.createElement('div', { 
            className: `d-flex gap-2 mb-2${wrapperClass ? ` ${wrapperClass}` : ''}${visible ? '' : ' d-none'}` 
        });
        
        const icon = this.createElement('i', { className: `bi ${iconClass}` });
        const textElement = this.createElement('span', { 
            className: textClass,
            text: text 
        });
        
        wrapper.appendChild(icon);
        wrapper.appendChild(textElement);
        return wrapper;
    },

    // Criação da seção ETA
    createETASection(remain) {
        return this.createElement('div', {
            className: 'fs-2 fw-bold robot-eta text-center',
            html: `<span class="robot-eta-text">ETA: ${this.formatSecondsToMMSS(remain)}</span>`
        });
    },

    // Criação da seção de progresso
    createProgressSection(progress, status) {
        const wrapper = this.createElement('div', { className: 'robot-progress text-center pt-2 pb-2' });
        const progressBar = this.createElement('div', { className: 'progress robot-progress-bar' });
        
        const progressInner = this.createElement('div', {
            className: 'progress-bar progress-bar-striped progress-bar-animated robot-progress-status',
            text: `${progress}%`
        });
        
        progressInner.style.width = `${progress}%`;
        progressInner.setAttribute('role', 'progressbar');
        progressInner.setAttribute('aria-valuenow', progress);
        progressInner.setAttribute('aria-valuemin', '0');
        progressInner.setAttribute('aria-valuemax', '100');
        
        this.updateProgressBarColor(progressInner, status);
        
        progressBar.appendChild(progressInner);
        wrapper.appendChild(progressBar);
        return wrapper;
    },

    // Processamento de um robot individual (mantido para compatibilidade, mas o `updateRobotsList` é mais abrangente)
    processRobot(data, index, arrayLength) {
        const robotCode = data.robotCode;
        let item = this.cache.robotElements.get(robotCode);
        
        if (!item) {
            item = document.getElementById(`robot-${robotCode}`);
            if (item) {
                this.cache.robotElements.set(robotCode, item);
            }
        }

        if (item) {
            this.updateExistingRobot(item, data);
        } else {
            const newItem = this.createNewRobot(data, index, arrayLength);
            // Anexar o novo item ao target (sb-robot-area), removendo a mensagem de status se ela estiver visível
            this.toggleStatusMessage(false); // Certifica-se de que a mensagem está oculta
            this.cache.target.appendChild(newItem);
            this.cache.robotElements.set(robotCode, newItem);
        }
    },

    /**
     * Gerencia a lista completa de robôs. Adiciona novos, atualiza existentes e remove os que não estão mais presentes.
     * @param {Array<Object>} newRobotsData - Array de objetos com os dados dos robôs mais recentes.
     */
    updateRobotsList(newRobotsData) {
        // 1. Lida com a mensagem de "conectando/sem dados"
        if (newRobotsData.length === 0) {
            // Se não há dados, mostra a mensagem e limpa a área dos robôs (se houver)
            this.toggleStatusMessage(true);
            this.cache.target.innerHTML = ''; // Limpa todos os robôs existentes
            this.cache.robotElements.clear(); // Limpa o cache
            return;
        } else {
            // Se há dados, garante que a mensagem esteja oculta
            this.toggleStatusMessage(false);
        }

        // 2. Remove robôs que não estão mais nos dados recebidos
        const currentRobotCodes = new Set(newRobotsData.map(r => r.robotCode));
        for (const [code, element] of this.cache.robotElements) {
            if (!currentRobotCodes.has(code)) {
                element.remove(); // Remove do DOM
                this.cache.robotElements.delete(code); // Remove do cache
            }
        }

        // 3. Adiciona ou atualiza os robôs com base nos novos dados
        newRobotsData.forEach((robotData, index) => {
            this.processRobot(robotData, index, newRobotsData.length);
        });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    
    let socket;
    alertify.defaults.transition = "fade";
	alertify.defaults.theme.ok = "btn btn-sm btn-success";
	alertify.defaults.theme.cancel = "btn btn-sm btn-danger";
	alertify.defaults.theme.input = "form-control ajs-input";
    Toast.setPlacement(TOAST_PLACEMENT.BOTTOM_LEFT);

    const BROWLIST_DEFINITIONS = {
        "ARTICLE": {
            modalTitle: 'Selecionar Artigo',
            columns: [
                { field: 'ref', title: 'Referência', sortable: true, searchable: true },
                { field: 'design', title: 'Designação', sortable: true, searchable: true }
            ],
            requestType: 'ARTICLE' // Exemplo: um tipo de requisição mais específico
        },
        "CUTORDER": {
            modalTitle: 'Selecionar Ordem de Corte',
            columns: [
                { field: 'numordem', title: 'Ordem de Corte Nº', sortable: true, searchable: true }
            ],
            requestType: 'CUTORDER' // Exemplo: um tipo de requisição mais específico
        },
        "WORKORDER": { // Adicionei este com base no seu código anterior de TECNOLANEMA
            modalTitle: 'Selecionar Ordem de Fabrico',
            columns: [
                { field: 'numordem', title: 'Ordem de Fabrico Nº', sortable: true, searchable: true }
            ],
            requestType: 'WORKORDER'
        }
        // Adicione mais tipos aqui conforme necessário
    };

    if (!RobotUI.init()) {
         console.error("Erro ao inicializar RobotUI. Elemento 'sb-robot-area' não encontrado.");
         return;
    }

    // ATIVA A DETEÇÃO DE CÓDIGOS DE BARRA NA PÁGINA
    onScan.attachTo(document, {
        keyCodeMapper: function (oEvent) {
            var iCode = oEvent.which || oEvent.keyCode;

            // Letras, números e símbolos
            switch (true) {
                case iCode >= 48 && iCode <= 90: // letras e números padrão
                case iCode >= 96 && iCode <= 105: // números no teclado numérico
                case iCode >= 106 && iCode <= 111: // operações no teclado numérico
                case [186, 187, 188, 189, 190, 191, 192, 219, 220, 221, 222].includes(iCode): // símbolos adicionais
                    if (oEvent.key !== undefined && oEvent.key !== '') {
                        let value = oEvent.key;
                        // Remove símbolo & (Unicode 38) do início, se existir
                        if (value.charCodeAt(0) === 38) {
                            value = value.slice(1);
                        }
                        return value;
                    }

                    var sDecoded = String.fromCharCode(iCode);
                    sDecoded = oEvent.shiftKey ? sDecoded.toUpperCase() : sDecoded.toLowerCase();

                    // Remove símbolo & (Unicode 38) do início, se existir
                    if (sDecoded.charCodeAt(0) === 38) {
                        sDecoded = sDecoded.slice(1);
                    }


                    return sDecoded;
            }

            return '';
        },
        ignoreKeyCodes: [],
        onScan: function(barcode) {
            barcode = barcode.replace(/\\\d{5,6}/g, '');
            // Remove caracteres de controle invisíveis (ASCII 0-31 e 127)
            barcode = barcode.replace(/[\x00-\x1F\x7F]/g, '');
            // Remove espaços extras no começo/fim, se quiser
            barcode = barcode.trim();
            // Remove caracteres não-ASCII
            //const cleaned = barcode.replace(/[^\x20-\x7E]/g, '');
            console.log('Barcode limpo:', barcode);
        },  
        reactToPaste: false
    });

    function detectBarcode(scanCode, quantity) {
        console.log(scanCode, quantity);
    }

    // Função principal otimizada
    function generateRobotItem(data) {
        if(data.type != 'robot_data_update') return;

        // Processamento em lote dos robots
        const robots = data.api_data;

        // Usar requestAnimationFrame para melhor performance visual
        requestAnimationFrame(() => {
            RobotUI.updateRobotsList(robots);
        });
    }

    function detectRack(data) {

        if (data.type !== 'rack_info_at_pos_code') {
            return;
        }
        
        const rackToUnloadEl = document.getElementById('cart-to-unload');
        const rackInfoEl = document.getElementById("cart-code");
        const itemAreaEl = document.getElementById('item-collection');

        if (!rackInfoEl || !rackToUnloadEl) {
            console.warn("Elementos 'cart-to-unload' ou 'cart-code-id' não encontrados.");
            return;
        }

        const rackInfoHasValue = rackInfoEl.value !== "";
        const rackToUnloadIsEmpty = rackToUnloadEl.value === "";
        const itemAreaHasContent = itemAreaEl && itemAreaEl.innerHTML.trim() !== "";

        if ((rackInfoHasValue && rackToUnloadIsEmpty) || (!rackInfoHasValue && itemAreaHasContent)) {
            return;
        }

        // Atualiza o valor e dispara o evento apenas se todas as validações passarem.
        rackToUnloadEl.value = data.podCode;
        rackToUnloadEl.dispatchEvent(new Event("change"));
    }

    // Função utilitária para limpeza (opcional)
    function clearRobotCache() {
        RobotUI.cache.robotElements.clear();
    }

    function attachEvents() {
        const browlistColumns = [
            {
                field: 'codigo',
                title: 'Código',
                sortable: true,
                searchable: true
            },
            {
                field: 'descricao',
                title: 'Descrição',
                sortable: true,
                searchable: true
            }
        ];
        // Seleciona os elementos UMA ÚNICA VEZ fora do event listener
        const configForm = document.getElementById("config-form");
        const rackToUnloadEl = document.getElementById('cart-to-unload');
        const rackCodeEl = document.getElementById('cart-code');
        const changePodButton = document.getElementById('change-cart');
        const resetPodButton = document.getElementById('reset-cart');
        const addButton = document.getElementById('add-item');
        const sendButton = document.getElementById('sent-to-robot');
        const rackCodeSpan = document.getElementById('cart-code-id');
        const companyEl = document.getElementById('company');
        const newTaskFrm = document.getElementById("new-task");
        const itemArea = document.getElementById("item-collection");

        if (typeof Browlist === 'undefined') {
            console.error('A classe Browlist não está definida. Certifique-se de que a biblioteca Browlist foi carregada.');
            return; // Sai da função se Browlist não estiver disponível
        }

        const browlistModal = new Browlist({
            multipleSelection: false,
            modalTitle: 'Selecionar carrinho',
            dataSource: `${sbData.site_url}tableData`, // Certifique-se que sbData está disponível no escopo
            additionalParams: {
                columnsToShow: browlistColumns,
                requestType: 'CART',
            },
            httpMethod: 'POST',
            columns: browlistColumns, // Reutiliza as colunas definidas
            pageSize: 10,
            searchable: true,
            sortable: true,
            onSave: (selectedRecords) => {
                if (selectedRecords && selectedRecords[0].codigo) {
                    console.log(selectedRecords[0].codigo);
                    // rackCodeEl e rackCodeSpan devem ser os elementos corretos que você quer atualizar.
                    // Certifique-se que 'rackCodeEl' é o input de valor e 'rackCodeSpan' é o elemento de exibição.
                    if (rackCodeEl) {
                        rackCodeEl.value = selectedRecords[0].codigo;
                    } else {
                        console.warn("Elemento 'rackCodeEl' não encontrado para atualizar o valor.");
                    }
                
                    if (rackCodeSpan) {
                        rackCodeSpan.innerText = selectedRecords[0].codigo;
                        // Se rackCodeSpan for um <input>, use .value em vez de .innerText
                        // rackCodeSpan.value = selectedRecords.codigo;
                    } else {
                        console.warn("Elemento 'rackCodeSpan' não encontrado para atualizar o texto.");
                    }
                }
            }
        });

        if(configForm) {
            configForm.addEventListener("submit", async (e) => { // Use 'async' para await se for o caso
                e.preventDefault();
                e.stopPropagation();

                const form = e.target;
                const formData = new FormData(form);
                const formDataJson = Object.fromEntries(formData.entries());

                if (!validateConfigForm(formDataJson)) {
                    return;
                }

                try {
                    const response = await fetch(`${sbData.site_url}setTerminal`, {
                        method: 'POST',
                        body: formData 
                    });


                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ message: `Erro HTTP: ${response.status}` }));
                        throw new Error(errorData.message || `Erro do servidor com status ${response.status}`);
                    }

                    const data = await response.json();

                    showApiResponseToast(data);
                    
                    // --- A MAGIA ACONTECE AQUI ---
                    // Só depois de o JSON ser processado, a página recarrega
                    window.location.reload();                

                    
                } catch (error) {
                    Toast.create("Erro", "Ocorreu um erro ao submeter o formulário! Tente novamente!", TOAST_STATUS.DANGER, 5000);
                    console.error("Erro ao submeter os dados de configuração:", error);
                }
            });
        }        

        

        // Verifica se todos os elementos foram encontrados.
        // Se algum não existir, a função não será adicionada ou causará erros.
        if (rackToUnloadEl && changePodButton && resetPodButton && addButton && sendButton && rackCodeSpan) {
            rackToUnloadEl.addEventListener('change', (e) => {
                // e.target refere-se ao elemento que disparou o evento (rackToUnloadEl neste caso)
                const hasValue = e.target.value !== '';
            
                // Função auxiliar para aplicar ou remover atributos/classes
                const toggleElements = (shouldHideChange, shouldDisableButtons, newValue) => {
                    // Alterna a visibilidade dos botões
                    changePodButton.classList.toggle('d-none', shouldHideChange);
                    resetPodButton.classList.toggle('d-none', !shouldHideChange); // O oposto de shouldHideChange
                
                    // Alterna o estado de disabled
                    if (shouldDisableButtons) {
                        addButton.setAttribute('disabled', 'disabled');
                        sendButton.setAttribute('disabled', 'disabled');
                    } else {
                        addButton.removeAttribute('disabled');
                        sendButton.removeAttribute('disabled');
                    }
                
                    // Atualiza o valor do span/input do código do rack
                    rackCodeSpan.value = newValue;
                };
            
                if (hasValue) {
                    // Se tem valor: Esconder changePodButton, desabilitar add/send, atualizar rackCodeSpan
                    toggleElements(true, true, e.target.value);
                } else {
                    // Se não tem valor: Mostrar changePodButton, habilitar add/send, limpar rackCodeSpan
                    toggleElements(false, false, '');
                }
            });
        }

        if(rackCodeEl) {
            rackCodeEl.addEventListener("change", (e) => {
                const hasValue = e.target.value !== '';

                if(hasValue) {
                    rackCodeSpan.value = e.target.value;
                } else {
                    rackCodeSpan.value = "";
                }
            });
        }

        if(changePodButton && rackCodeEl && rackCodeSpan) {
            changePodButton.addEventListener("click", (e) => {
                e.stopPropagation();
                e.preventDefault();               

                browlistModal.open();
            });
        }

        if(resetPodButton) {
            resetPodButton.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                SbModal.confirm("Tem a certeza que quer descarregar este carrinho?", () => {
                    rackToUnloadEl.value = "";
                    rackToUnloadEl.dispatchEvent(new Event("change"));
                }, undefined);
            });
        }
        
        if(addButton && companyEl) {
            addButton.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                openItemModal();
            });
        }
        
        if(newTaskFrm) {
            newTaskFrm.addEventListener("submit", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const formData = new FormData(newTaskFrm);

                if(rackToUnloadEl.value !== "") {
                    Toast.create("Aviso", "Não é possível enviar a tarefa enquando o carrinho não for descarregado!", TOAST_STATUS.WARNING, 5000);
                    return;
                }
                if(rackCodeEl.value == "") {
                    Toast.create("Aviso", "Deve indicar o carrinho onde estão as peças!", TOAST_STATUS.WARNING, 5000);
                    return;
                }
                
                if(itemArea.childElementCount == 0) {
                    Toast.create("Aviso", "Deve indicar o pelo menos uma peça!", TOAST_STATUS.WARNING, 5000);
                    return;
                }

                
                showUnloadLocationsSelectionModal(formData);
                
            });
        }
        //let changePodButton = document.getElementById("change-cart");
        
    }

    // Simulação de uma API
    async function fetchDestinationsFromAPI() {
        const apiUrl = `${sbData.site_url}unloadLocations`; // O seu endpoint da API

        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            // Verifica se a resposta da rede foi bem-sucedida (status 200-299)
            if (!response.ok) {
                // Lança um erro se a resposta não for OK
                const errorText = await response.text(); // Tenta ler o corpo da resposta como texto de erro
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json(); // Analisa o corpo da resposta como JSON
            return data; // Retorna os dados (que esperamos que seja um array de categorias)

        } catch (error) {
            console.error('Erro ao fazer fetch das categorias:', error);
            // Você pode relançar o erro, ou retornar um array vazio, dependendo do comportamento desejado
            throw error; // Propaga o erro para que a função chamadora possa tratá-lo
        }
    }

    async function showUnloadLocationsSelectionModal(formData) {
        const selectId = `categorySelect-${Date.now()}`; // ID único para o select

        // HTML inicial da modal com um select vazio e um placeholder
        let modalContent = `
            <p>Por favor, selecione o local de descarga:</p>
            <select id="${selectId}" class="form-select">
                <option value="">A carregar locais...</option>
            </select>
        `;

        // Opções de botões para a modal
        const buttons = [
            {
                text: 'Selecionar local',
                icon: 'bi-check-circle',
                variant: 'success',
                action: async () => {
                    const selectElement = document.getElementById(selectId);
                    const selectedValue = selectElement.value;
                    const selectedText = selectElement.options[selectElement.selectedIndex].text;

                    if (selectedValue) {
                        formData.append("destination", selectedValue);


                        // Supondo que você tem um endpoint de API para upload em '/api/upload-product'
                        const result = await sendFormDataToServer(`${sbData.site_url}sendTask`, formData, 'POST');           
                        
                        showApiResponseToast(result);
                        if(result.type === "success") {
                            resetForm();
                        } 
                        return;
                        

                    } else {
                        Toast.create("Aviso", "Deve indicar um local de descarga válido!", TOAST_STATUS.WARNING, 5000);
                        return false;
                    }
                }
            },
            {
                text: 'Cancelar',
                icon: 'bi-x-lg',
                variant: 'danger',
                dataBsDismiss: 'modal' // Este botão fecha a modal automaticamente
            }
        ];

        // Abre a modal inicialmente com o conteúdo de "carregando..."
        SbModal.custom({
            title: 'Local de descarga',
            content: modalContent,
            buttons: buttons,
            showDefaultCloseButton: false
        });

        // --- Parte onde o fetch e o preenchimento acontecem ---
        try {
            const categories = await fetchDestinationsFromAPI(); // Faz a requisição à API

            const selectElement = document.getElementById(selectId);
            if (selectElement) {
                selectElement.innerHTML = '<option value=""></option>'; // Limpa e adiciona a opção padrão
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    selectElement.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            //// Exemplo: Mostrar um erro na modal ou fechá-la e mostrar um toast
            //const selectElement = document.getElementById(selectId);
            //if (selectElement) {
            //     selectElement.innerHTML = '<option value="">Erro ao carregar</option>';
            //     selectElement.disabled = true;
            //}
            //alert('Não foi possível carregar as categorias. Tente novamente.');
            SbModal.closeModal(); // Opcional: fechar a modal em caso de erro fatal
        }
    }

    function resetForm() {
        const cartToUnloadEl = document.getElementById("cart-to-unload");
        const cartCodeEl = document.getElementById("cart-code");
        const cartCodeSpanEl = document.getElementById("cart-code-id");
        const cartItems = document.querySelectorAll(".item-cart-content");

        if(cartToUnloadEl && cartCodeEl && cartCodeSpanEl && cartItems) {
            cartToUnloadEl.value = "";
            cartCodeEl.value = "";
            cartCodeEl.dispatchEvent(new Event("change"));
            cartCodeSpanEl.innerText = "- Não definido -";

            cartItems.forEach(item => {
                const removeButton = item.querySelector(".remove-from-cart");
                if(removeButton) {
                    removeButton.dispatchEvent(new Event("click"));
                }
            });
        }
    }

    /**
     * Envia um objeto FormData para um endpoint da API.
     * Especialmente útil para uploads de arquivos e dados de formulário complexos.
     *
     * @param {string} url - O caminho relativo ou absoluto para o endpoint da API.
     * @param {FormData} formData - O objeto FormData contendo os dados a serem enviados.
     * @param {string} [method='POST'] - O método HTTP a ser usado (POST, PUT, etc.). GET não é recomendado para FormData.
     * @param {object} [additionalHeaders={}] - Cabeçalhos adicionais, como 'Authorization'.
     * @param {boolean} [returnJson=true] - Se `true`, tentará analisar a resposta como JSON. Caso contrário, retorna a resposta bruta.
     * @returns {Promise<any>} - Uma promessa que resolve com os dados da resposta (JSON ou a Response bruta) ou rejeita com um erro.
     */
    async function sendFormDataToServer(url, formData, method = 'POST', additionalHeaders = {}, returnJson = true) {
        // 1. Validar que o formData é realmente uma instância de FormData
        if (!(formData instanceof FormData)) {
            console.error("Erro: O parâmetro 'formData' deve ser uma instância de FormData.");
            throw new TypeError("Parâmetro 'formData' inválido: Esperado FormData.");
        }

        const config = {
            method: method.toUpperCase(),
            body: formData, // O FormData vai diretamente para o 'body'
            headers: {
                // Adiciona quaisquer cabeçalhos adicionais que você possa precisar (ex: para autenticação)
                ...additionalHeaders
                // IMPORTANTE: NÃO defina 'Content-Type': 'multipart/form-data' aqui.
                // O navegador faz isso automaticamente e adiciona o 'boundary'.
            }
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                let errorDetails = `HTTP error! status: ${response.status}`;
                const contentType = response.headers.get('content-type');

                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorDetails += `, details: ${JSON.stringify(errorData)}`;
                } else {
                    const errorText = await response.text();
                    errorDetails += `, message: ${errorText.substring(0, 100)}...`;
                }
                throw new Error(errorDetails);
            }

            if (response.status === 204 || !returnJson) {
                return response;
            }

            const responseData = await response.json();
            return responseData;

        } catch (error) {
            console.error(`Erro ao enviar FormData para ${url}:`, error);
            throw error;
        }
    }

    /**
     * Valida os dados do formulário antes da submissão.
     * @param {Object} formDataJson - Os dados do formulário como um objeto JSON.
     * @returns {boolean} - True se os dados forem válidos, false caso contrário.
     */
    function validateConfigForm(formDataJson) {
        if (formDataJson.terminal === "") {
            Toast.create("Aviso", "Deve indicar o ID do terminal!", TOAST_STATUS.DANGER, 5000);
            return false;
        }
        // Adicione outras validações aqui, se necessário.
        return true;
    }

    /**
     * Exibe um toast com base no tipo de resposta da API.
     * @param {Object} data - O objeto de resposta da API (deve conter type e message).
     */
    function showApiResponseToast(data) {
        switch (data.type) {
            case "warning":
                Toast.create("Aviso", data.message, TOAST_STATUS.WARNING, 5000);
                break;
            case "success":
                Toast.create("Sucesso", data.message, TOAST_STATUS.SUCCESS, 5000);
                break;
            case "error": // Adicionado tratamento explícito para 'error' se a API puder retornar.
                Toast.create("Erro", data.message, TOAST_STATUS.DANGER, 5000);
                break;
            default:
                Toast.create("Info", data.message || "Resposta desconhecida da API.", TOAST_STATUS.INFO, 5000);
                break;
        }
    }

    function openItemModal() {       
        const companyEl = document.getElementById("company");
        // 1. Validar a presença do elemento e seu valor de forma concisa.
        if (!companyEl || companyEl.value === "") {
            Toast.create("Aviso", "Empresa não definida na localização do terminal! Por favor, verifique!", TOAST_STATUS.WARNING, 5000);
            return; // Early exit
        }

        const companyValue = companyEl.value;

        // 2. Usar um objeto para mapear as opções por empresa.
        // Isso torna o código mais escalável se você tiver mais empresas no futuro.
        const companyOptions = {
            "POLYLANEMA": [
                {
                    label: 'Ordem de corte',
                    value: 1,
                    action: () => loadItemData("CUTORDER")
                },
                {
                    label: 'Artigo',
                    value: 2,
                    action: () => loadItemData("ARTICLE")
                }
            ],
            "TECNOLANEMA": [
                {
                    label: 'Ordem de fabrico',
                    value: 1,
                    action: () => loadItemData("WORKORDER")
                }
                /*
                {
                    label: 'Artigo',
                    value: 2,
                    action: () => loadItemData("ARTICLE")
                }
                */
            ]
        };
        const options = companyOptions[companyValue] || [];
        if (options.length === 0) {
            Toast.create("Info", `Não há opções definidas para a empresa: ${companyValue}.`, TOAST_STATUS.INFO, 3000);
            return;
        }

        const menu = new PopupMenu(options, "Selecione uma opção");
        menu.show();
    }

    

    function addContainerItem(barcode, barcodeContent) {
        const podInfoEl = document.getElementById("cart-code-id");
        const podCodeEl = document.querySelector('input[name="cart-code"]');

        if (!podInfoEl || !podCodeEl) {
            return;
        }
        const isUnloaded = ('unloaded' in podInfoEl.dataset && podInfoEl.dataset.unloaded === 'true'); // Se o valor for uma string "true"

        if (podInfoEl.value !== "" && isUnloaded) {
            Toast.create("Aviso", "Existe um carrinho que ainda não foi descarregado! Deve clicar na opção ao lado do carrinho para descarregar!", TOAST_STATUS.WARNING, 5000);
            return;
        }

        let itemsData = [];
        if(barcode) {
            if(barcodeContent == "") {
                Toast.create("Aviso", "O conteúdo do código de barras não foi conhecido!");
                return;
            }

        } else if(!barcode) {

        }

    }

    function generateSimpleUniqueId() {
        return performance.now().toString(36).replace('.', '') + Math.random().toString(36).substring(2);
    }

    function buildItem(type, company, data) {
        const uuid = generateSimpleUniqueId();
        const itemId = `itm${uuid}`;

        const itemCard = document.createElement("div");
        itemCard.id = itemId;
        itemCard.className = "card item-cart-content shadow-sm mb-2";

        const itemCardBody = document.createElement("div");
        itemCardBody.className = "card-body d-flex align-items-center gap-3";
        let typeInt = 0;
        if(type == "ARTICLE") {
            typeInt = 1;
        } else if(type == "CUTORDER") {
            typeInt = 2;
        } else if(type == "WORKORDER") {
            typeInt = 3;
        } else if(type == "ORDER") {
            typeInt = 4;
        }

        const hiddenInputs = [
            { name: "ref", value: data.ref ?? "" },
            { name: "design", value: data.design ?? "" },
            { name: "tipo", value: typeInt },
            { name: "tiponm", value: type },
            { name: "ststamp", value: data.ststamp ?? "" },
            { name: "oristamp", value: data.oristamp ?? "" },
            { name: "orindoc", value: data.orindoc ?? 0 },
            { name: "orinmdoc", value: data.orinmdoc ?? "" },
            { name: "qtt", value: data.qtt ?? 0 },
            { name: "empresa", value: company }
        ];

        hiddenInputs.forEach(inputData => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = `taskd[${itemId}][${inputData.name}]`;
            input.value = inputData.value;
            itemCardBody.appendChild(input);
        });

        const itemContentWrapper = document.createElement("div");
        itemContentWrapper.className = "w-100";

        const itemFirstInfoLine = document.createElement("div");
        itemFirstInfoLine.className = "d-flex align-items-center gap-2";
        const itemFirstInfoSpan = document.createElement("span");

        const itemSecondInfoLine = document.createElement("div");
        itemSecondInfoLine.className = "d-flex align-items-center gap-2";
        const itemSecondInfoSpan = document.createElement("span");

        const isOrderType = ['CUTORDER', 'WORKORDER', 'ORDER'].includes(type);

        itemFirstInfoLine.classList.add(isOrderType ? "fs-6" : "fs-2");
        itemFirstInfoSpan.innerHTML = isOrderType ? data.orinmdoc : data.ref;

        itemSecondInfoLine.classList.add(isOrderType ? "fs-2" : "fs-6");
        itemSecondInfoSpan.innerHTML = isOrderType ? data.orindoc : data.design;

        itemFirstInfoLine.appendChild(itemFirstInfoSpan);
        itemSecondInfoLine.appendChild(itemSecondInfoSpan);

        itemContentWrapper.appendChild(itemFirstInfoLine);
        itemContentWrapper.appendChild(itemSecondInfoLine);
        itemCardBody.appendChild(itemContentWrapper);
        const itemDeleteWrapper = document.createElement("div");
        itemDeleteWrapper.className = "flex-shrink-1";

        const itemDeleteButton = document.createElement("button");
        itemDeleteButton.type = "button";
        itemDeleteButton.className = "btn btn-danger btn-lg rounded-pill remove-from-cart";

        const handleDeleteClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const cardToRemove = e.currentTarget.closest('.card');
            if (cardToRemove) {
                cardToRemove.classList.add("fade");

                cardToRemove.addEventListener("transitionend", (transitionEvent) => {
                    if (transitionEvent.propertyName === 'opacity' || transitionEvent.propertyName === 'height') {
                        if (cardToRemove.parentNode) {
                            cardToRemove.remove();
                        }
                    }
                }, { once: true });
            }
        };

        itemDeleteButton.addEventListener("click", handleDeleteClick);

        const itemDeleteIcon = document.createElement("i");
        itemDeleteIcon.className = "bi bi-trash-fill";
        itemDeleteButton.appendChild(itemDeleteIcon);
        itemDeleteWrapper.appendChild(itemDeleteButton);
        itemCardBody.appendChild(itemDeleteWrapper);
        itemCard.appendChild(itemCardBody);

        const target = document.getElementById("item-collection");
        if (target) {
            target.appendChild(itemCard);
        }
    }

    function loadItemData(type) {
        const companyEl = document.getElementById("company");
        const currentCompanyValue = companyEl ? companyEl.value : ''; // Garante que não é null

        // 3. Validação robusta para BROWLIST_DEFINITIONS e o tipo
        const definition = BROWLIST_DEFINITIONS[type];

        if (!definition) {
            console.warn(`Tipo de item desconhecido ou não configurado: ${type}.`);
            // Opcional: mostrar um toast ou lançar um erro
            Toast.create("Erro", `Configuração inválida para o tipo de item: ${type}.`, TOAST_STATUS.ERROR, 5000);
            return;
        }

        // 4. Verificação da classe Browlist.
        if (typeof Browlist === 'undefined') {
            console.error('A classe Browlist não está definida. Certifique-se de que a biblioteca Browlist foi carregada antes de chamar loadItemData.');
            Toast.create("Erro", "Erro interno: A biblioteca de seleção de dados não foi carregada.", TOAST_STATUS.ERROR, 5000);
            return;
        }

        const browlistModal = new Browlist({
            multipleSelection: true,
            modalTitle: definition.modalTitle, // Título dinâmico
            dataSource: `${sbData.site_url}tableData`,
            additionalParams: {
                columnsToShow: definition.columns,
                requestType: definition.requestType,
            },
            httpMethod: 'POST',
            columns: definition.columns, // Reutiliza as colunas da definição
            pageSize: 10,
            searchable: true,
            sortable: true,
            onSave: (selectedRecords) => {
                if (selectedRecords && selectedRecords.length > 0) { // Verifica se há registros selecionados
                    selectedRecords.forEach(record => {
                        // 7. Certifique-se de que 'company' ou 'companyValue' é passado corretamente para buildItem
                        buildItem(type, currentCompanyValue, record); // Usar currentCompanyValue
                    });
                } else {
                    console.warn('Nenhum registo selecionado na Browlist.');
                    SbModal.alert("Nenhum registo selecionado!");
                }
            }
        });

        browlistModal.open(); // Assumindo que Browlist tem um método show()
    }

    
   
    function connectWebSocket() {
        socket = new WebSocket(`${sbData.ws_url}`);

        socket.onopen = () => {
            let terminalCodeEl = document.getElementById("terminal-code");
            let terminalCode = "";
            if(terminalCodeEl) {
                terminalCode = terminalCodeEl.value;
            }
            console.info("[✔️] Conectado ao WebSocket");
            clearRobotCache();
            socket.send(JSON.stringify({
                type: 'get_robot_info',
                terminalCode : terminalCode
            }));
        }

        socket.onmessage = (event) => {
            let data = JSON.parse(event.data);
            console.info('[📥] Mensagem recebida, dados: ', data);
            let statusArea = document.getElementById("sb-robot-area");
            if(statusArea) {
                let messages = statusArea.querySelectorAll(".ws-msg");
                if(messages) {
                   messages.forEach(element => element.remove());
                }
            } 
            generateRobotItem(data);
            detectRack(data);
        };

        socket.onerror = (error) => {
            let statusArea = document.getElementById("sb-robot-area");
            if(statusArea) {
                let robotItems = statusArea.querySelectorAll(".robot-item");
                if(robotItems) {
                    robotItems.forEach(element => element.remove());
                }

                let message = document.createElement("div");
                message.className = "border-bottom ws-msg text-danger";
                message.innerHTML = "[❌] Erro na ligação ao WebSocket";
                statusArea.appendChild(message);
            }          

            console.error('[❌] Erro no WebSocket');
        };

        socket.onclose = () => {
            let statusArea = document.getElementById("sb-robot-area");
            if(statusArea) {
                let robotItems = statusArea.querySelectorAll(".robot-item");
                if(robotItems) {
                    robotItems.forEach(element => element.remove());
                }
                let message = document.createElement("div");
                message.className = "border-bottom ws-msg text-primary";
                message.innerHTML = "[🔌] Conexão fechada, tentando reconectar em 3s...";
                statusArea.appendChild(message);            
            }
           
            console.info('[🔌] Conexão fechada, tentando reconectar em 3s...');
            setTimeout(connectWebSocket, 3000);
        };
    }

    const keyboard = new VirtualKeyboard({
      language: 'pt',
      onValidate: (value, input) => {
        console.log(`Valor inserido no campo ${input.placeholder}:`, value);
        // Aqui podes atualizar estado, enviar para API, etc.
      }
    });

    attachEvents();
    connectWebSocket();
    
});