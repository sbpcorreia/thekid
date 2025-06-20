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
                status, statusText, podCode, info } = data;
        
        const remain = info?.estimatedTimeRemaining ?? 0;
        const progress = info?.progressPercent ?? 0;
        const showProgress = remain > 0;

        // Batch DOM updates para melhor performance
        const updates = [
            ['.robot-image', el => el.classList.toggle('img-grayscale', !online)],
            ['.robot-battery-indicator', el => el.src = `${sbData.site_url}assets/images/${this.getBatteryIcon(battery, status)}.svg`],
            ['.robot-battery-level', el => el.textContent = `(${battery}%)`],
            ['.robot-name', el => el.innerHTML = this.formatRobotName(robotCode, robotName, online)],
            ['.robot-position', el => el.textContent = `X: ${posX}, Y: ${posY}`],
            ['.robot-status-text', el => el.textContent = `(${status}) ${statusText}`],
            ['.robot-pod-info', el => el.textContent = podCode || "- Sem carrinho -"],
            ['.robot-eta', el => {
                el.classList.toggle('d-none', !showProgress);
                if (showProgress) {
                    el.querySelector('.robot-eta-text').textContent = `ETA: ${formatSecondsToMMSS(remain)}`;
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

    // Criação de novo item de robot otimizada
    createNewRobot(data, index, arrayLength) {
        const { robotName, battery, online, robotCode, posX, posY, 
                status, statusText, podCode, info } = data;
        
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
            src: robotImage // Assumindo que robotImage está disponível globalmente
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
            this.createInfoSection('bi-compass-fill', 'robot-location', `X: ${posX}, Y: ${posY}`, 'robot-position'),
            this.createInfoSection('bi-basket-fill', 'robot-pod', podCode || "- Sem carrinho -", 'robot-pod-info'),
            this.createInfoSection('bi-clipboard2-check-fill', '', 'Desconhecido')
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
    createInfoSection(iconClass, wrapperClass, text, textClass = '') {
        const wrapper = this.createElement('div', { 
            className: `d-flex gap-2 mb-2${wrapperClass ? ` ${wrapperClass}` : ''}` 
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
            html: `<span class="robot-eta-text">ETA: ${formatSecondsToMMSS(remain)}</span>`
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

function formatSecondsToMMSS(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}