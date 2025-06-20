// Cache de elementos DOM e configurações
const RobotUI = {
    cache: {
        target: null,
        robotElements: new Map()
    },
    
    config: {
        batteryThresholds: { high: 60, low: 20 },
        chargingStatuses: new Set([7, 36]),
        statusColors: { 5: 'bg-danger', 1: 'bg-success' }
    },

    // Inicialização com cache do elemento target
    init() {
        this.cache.target = document.getElementById("sb-robot-area");
        return this.cache.target !== null;
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
        
        //console.log(info);

        const remain = info?.estimatedTimeRemaining ?? 0;
        const progress = info?.progressPercent ?? 0;
        const showProgress = remain > 0;

        //console.log(remain, progress);

        // Batch DOM updates para melhor performance
        const updates = [
            ['.robot-image', el => el.classList.toggle('img-grayscale', !online)],
            ['.robot-battery-indicator', el => el.src = `${sbData.site_url}assets/images/${this.getBatteryIcon(battery, status)}.svg`],
            ['.robot-battery-level', el => el.textContent = `(${battery}%)`],
            ['.robot-name', el => el.innerHTML = this.formatRobotName(robotCode, robotName, online)],
            ['.robot-location-text', el => el.textContent = `X: ${posX}, Y: ${posY} (${robotDir}°)`],
            ['.robot-status-text', el => el.textContent = `(${status}) ${statusText}`],
            ['.robot-pod-text', el => el.textContent = podCode || "- Sem carrinho -"],
            ['.robot-speed-text', el  => el.textContent = `${speed} mm/s`],
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

    // Processamento de um robot individual
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
            this.cache.target.appendChild(newItem);
            this.cache.robotElements.set(robotCode, newItem);
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    
    let socket;
    alertify.defaults.transition = "fade";
	alertify.defaults.theme.ok = "btn btn-sm btn-success";
	alertify.defaults.theme.cancel = "btn btn-sm btn-danger";
	alertify.defaults.theme.input = "form-control ajs-input";
    Toast.setPlacement(TOAST_PLACEMENT.BOTTOM_LEFT);

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
        // Inicialização e validação
        if (!RobotUI.init()) return;

        // Processamento em lote dos robots
        const robots = data.api_data;
        const arrayLength = robots.length;

        // Usar requestAnimationFrame para melhor performance visual
        requestAnimationFrame(() => {
            robots.forEach((robot, index) => {
                RobotUI.processRobot(robot, index, arrayLength);
            });
        });
    }

    // Função utilitária para limpeza (opcional)
    function clearRobotCache() {
        RobotUI.cache.robotElements.clear();
    }

    function attachEvents() {
        let configForm = document.getElementById("config-form");
        configForm.addEventListener("submit", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const form = event.target;
            const formData = new FormData(form);
            const json = Object.fromEntries(formData.entries());

            if(json.terminal == "") {
                Toast.create("Aviso", "Deve indicar o ID do terminal!", TOAST_STATUS.DANGER, 5000);
                return;
            }

            fetch(`${sbData.site_url}setTerminal`, {
                method: 'POST',
                body : formData
            })
            .then(response => response.json())
            .then(data => {
                if(data.type == "warning") {
                    Toast.create("Aviso", data.message, TOAST_STATUS.WARNING, 5000);
                } else if(data.type == "success") {
                    Toast.create("Sucesso", data.message, TOAST_STATUS.SUCCESS, 5000);
                }
                location.reload();
            })
            .catch(error => {
                Toast.create("Erro", "Ocorreu um erro ao submeter o formulário! Tente novamente!", TOAST_STATUS.DANGER, 5000);
                console.error("Erro ao submeter os dados de configuração. Detalhes:", error);
            });
            
        });



        let changePodButton = document.getElementById("change-cart");
        changePodButton.addEventListener("click", (event) => {
            event.stopPropagation();
            event.preventDefault();
openItemModal("ARTICLE");
            let cartCode = document.getElementById("cart-code");
            if(cartCode.value != "") {
                alertify.confirm("Alterar carrinho?", "Deseja alterar o carrinho já definido?", function() {
                    // Adicionar aqui janela para alterar o carrinho
                },undefined).set(
                    'labels', {
						ok: '<i class="bi bi-check2"></i> SIM',
						cancel: '<i class="bi bi-x-lg"></i> NÃO'
					}
                );
            }



        });
    }

    function openItemModal(type) {
        let columns = [];
        let options = [];
        var companyElement = document.getElementById("company");
        if(companyElement) {
            console.log(companyElement);
            const company = companyElement.value;

            if(company != "") {
                console.log("tcheguei");
                switch(type) {
                    case "CART":
                        columns = ["codigo::Código", "descricao::Descrição"];
                        break;
                    case "ARTICLE":
                        columns = ["ref::Referência", "design::Designação"];
                        break;
                    case "CUTORDER":
                        columns = ["numordem::Ordem de corte", "oridoc::Documento"];
                        break;
                    case "WORKORDER":
                        columns = ["numof::Ordem de fabrico"];
                        break;
                }

                if(type != "CART") {

                }

                if(company == "POLYLANEMA") {
                    options = [
                        {
                            label   : 'Ordem de corte',
                            value   : 1,
                            action  : () => {
                                //const data = loadItemData(type);
                                alert("Coiso1");
                            }
                        },
                        {
                            label   : 'Artigo',
                            value   : 2,
                            action  : () => {
                                loadItemData("ARTICLE");
                                alert("coiso2");
                            }
                        }
                    ];
                    console.log("cheguei");
                    const menu = new PopupMenu(options, "Selecione uma opção");
                    console.log(menu);
                    menu.show().then(resposta => console.log(resposta));
                    
                } else if(company == "TECNOLANEMA") {

                }



            } else {
                Toast.create("Aviso", "Empresa não definida na localização do terminal! Por favor, verifique!", TOAST_STATUS.WARNING, 5000);
                return;
            }
        }   
    }

    function loadItemData(type) {
        let data, options, columns, headers = [];
        //let options = [];
        let url, title = "";
        switch(type) {
            case "CART":
                columns = ["item.codigo", "item.descricao"];
                headers = [{ name : "Código"}, { name : "Descrição"}];
                url = `${sbData.site_url}cartList`;
                title = "Carrinho";
                break;
            case "CUTORDER":
                columns = ["item.numordem", "item.oridoc"];
                headers = [{ name : "Ordem de corte" }, {name : "Documento"}];
                url = `${sbData.site_url}cutOrderList`;
                title = "Ordem de corte";
                break;
            case "ARTICLE" : 
                columns = ["item.ref", "item.design"];
                headers = [{name : "Referência"}, {name : "Designação"}];
                url = `${sbData.site_url}articlesList`;
                title = "Artigo";
                break;
            case "WORKORDER":
                columns = ["item.numof"];
                headers = [{name : "Ordem de fabrico"}];
                url = `${sbData.site_url}workOrderList`;
                title = "Ordem de fabrico";
                break;
        }
console.log(type, headers, columns);
        //fetch(url).then(response => response.json()).then(resultData => {
            
            let selectedItem = [];
            const modalContent = `
                <div style="height: 60vh; display: flex; flex-direction: column;">
                    <div id="gridContainer" style="flex: 1; min-height: 0;"></div>
                </div>`;

            const dlg = alertify.confirm().setHeader(title)
            .setContent( modalContent);
            dlg.set({
                onshow : () => {
                    
                    var resultData = [
                            {
                                ref: 'ABC',
                                design : 'Testes'
                            },
                            {
                                ref: 'ABC',
                                design : 'Testes'
                            },
                            {
                                ref: 'ABC',
                                design : 'Testes'
                            }
                        ];
                    const gridData = resultData.map(item => columns);
                    let target = document.getElementById("gridContainer");
console.log(headers);
                    new gridjs.Grid({
                        columns : headers,
                        data: gridData,
                        search : {
                            enabled : true,
                            placeholder : 'Pesquisar...'
                        },
                        sort: true,
                        pagination : {
                            enabled : true,
                            summary: true
                        },
                        language: {
                            search: {
                                placeholder: 'Pesquisar...'
                            },
                            pagination: {
                                previous: '← Anterior',
                                next: 'Próximo →',
                                showing: 'Mostrando',
                                of: 'de',
                                to: 'a',
                                results: 'resultados'
                            },
                            loading: 'A carregar...',
                            noRecordsFound: 'Nenhum artigo encontrado',
                            error: 'Ocorreu um erro ao carregar os dados'
                        },
                    }).render(target);
                    
                }});
                dlg.show();
            
       // }).catch(error => {
       //     Toast.create("Erro", "Ocorreu um erro ao obter os dados!", TOAST_STATUS.DANGER, 5000);
       // });

    }

    
   
    function connectWebSocket() {
        socket = new WebSocket(`${sbData.ws_url}`);

        socket.onopen = () => {
            console.info("[✔️] Conectado ao WebSocket");
            clearRobotCache();
            socket.send(JSON.stringify({
                type: 'get_robot_info'
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