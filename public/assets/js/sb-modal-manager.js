class SBModalManager {
    constructor() {
        this.modalElement = null;
        this.currentPromise = Promise.resolve();
    }

    _openModal({
        title,
        content,
        buttons = [],
        showDefaultCloseButton = true,
        modalSize
    }) {
        this.currentPromise = this.currentPromise.then(() => {
            return new Promise(resolve => {
                this.removeModalFromDOM();

                this.modalElement = document.createElement('div');
                this.modalElement.classList.add('modal', 'fade');
                this.modalElement.setAttribute('tabindex', '-1');
                this.modalElement.setAttribute('aria-labelledby', 'dynamicModalLabel');
                this.modalElement.setAttribute('aria-hidden', 'true');
                this.modalElement.setAttribute('data-bs-backdrop', 'static');
                this.modalElement.setAttribute('data-bs-keyboard', 'false');

                const dialogSizeClass = modalSize ? `modal-${modalSize}` : '';

                this.modalElement.innerHTML = `
                    <div class="modal-dialog modal-dialog-centered ${dialogSizeClass}">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="dynamicModalLabel">${title}</h5>
                                ${showDefaultCloseButton ? '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' : ''}
                            </div>
                            <div class="modal-body">
                                ${content}
                            </div>
                            <div class="modal-footer" id="modal-footer-buttons">
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(this.modalElement);

                const bsModal = new bootstrap.Modal(this.modalElement);

                this.modalElement.addEventListener('shown.bs.modal', () => {
                    resolve();
                }, { once: true });

                this.modalElement.addEventListener('hidden.bs.modal', () => {
                    this.removeModalFromDOM();
                }, { once: true });

                bsModal.show();

                const footer = this.modalElement.querySelector('#modal-footer-buttons');
                buttons.forEach(button => {
                    const btn = document.createElement('button');
                    btn.classList.add('btn');
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
                            Promise.resolve(button.action()).then(result => {
                                if (result !== false && !button.dataBsDismiss) {
                                    this.closeModal();
                                }
                            }).catch(error => {
                                console.error("Erro na ação do botão da modal:", error);
                                this.closeModal();
                            });
                        });
                    }
                    footer.appendChild(btn);
                });
            });
        });

        return this.currentPromise;
    }

    removeModalFromDOM() {
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
            this.modalElement = null;
        }
    }

    async closeModal() {
        if (this.modalElement) {
            const bsModalInstance = bootstrap.Modal.getInstance(this.modalElement);
            if (bsModalInstance) {
                bsModalInstance.hide();
            } else {
                this.removeModalFromDOM();
                this.currentPromise = Promise.resolve();
            }
        } else {
            this.currentPromise = Promise.resolve();
        }
        return this.currentPromise;
    }

    alert(message, onOk, title = 'Alerta') {
        const contentHtml = `<p>${message}</p>`;
        this._openModal({
            title: title,
            content: contentHtml,
            showDefaultCloseButton: false,
            buttons: [{
                text: 'OK',
                icon: 'bi-check-circle',
                variant: 'primary',
                action: async () => {
                    await this.closeModal();
                    if (onOk) onOk();
                }
            }]
        });
    }

    confirm(message, onConfirm, onCancel, title = 'Confirmação') {
        const contentHtml = `<p>${message}</p>`;
        this._openModal({
            title: title,
            content: contentHtml,
            showDefaultCloseButton: false,
            buttons: [{
                text: 'OK',
                icon: 'bi-check-circle',
                variant: 'primary',
                action: async () => {
                    await this.closeModal();
                    if (onConfirm) onConfirm();
                }
            }, {
                text: 'Cancelar',
                icon: 'bi-x-lg',
                variant: 'secondary',
                action: async () => {
                    await this.closeModal();
                    if (onCancel) onCancel();
                }
            }]
        });
    }

    prompt(message, defaultValue = '', onOk, onCancel, title = 'Input Required', inputType = 'text', attributes = {}) {
        const inputId = `promptInput-${Date.now()}`;
        const attributesString = Object.entries(attributes)
            .map(([key, value]) => `${key}='${value}'`)
            .join(' ');
        const contentHtml = `
            <p>${message}</p>
            <input type=\"${inputType}\" id=\"${inputId}\" class=\"form-control\" value=\"${defaultValue}\"${attributesString}>\
        `;

        this._openModal({
            title: title,
            content: contentHtml,
            showDefaultCloseButton: false,
            buttons: [{
                text: 'OK',
                icon: 'bi-check-circle',
                variant: 'primary',
                action: async () => {
                    const inputValue = document.getElementById(inputId).value;
                    await this.closeModal();
                    if (onOk) onOk(inputValue);
                }
            }, {
                text: 'Cancelar',
                icon: 'bi-x-lg',
                variant: 'secondary',
                action: async () => {
                    await this.closeModal();
                    if (onCancel) onCancel();
                }
            }]
        });
    }

    custom(options) {
        this._openModal(options);
    }

    async form(title, fieldsConfig, onSubmit, onCancel, options = {}) {
        let contentHtml = '';
        const fieldData = [];

        const generateFieldHtml = (field) => {
            const id = field.id || `modalField-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            fieldData.push({
                id: id,
                type: field.type,
                dataSource: field.dataSource,
                events: field.events,
                dataAttributesToMap: field.dataAttributesToMap // Adicionado para selects
            });

            const sizeClass = field.size ? `form-control-${field.size}` : '';

            let fieldHtml = `<div class="mb-3 ${field.colClass || ''}">`;
            fieldHtml += `<label for="${id}" class="form-label">${field.label || ''}</label>`;

            if (field.type === 'select') {
                fieldHtml += `<select id="${id}" class="form-select ${sizeClass}"></select>`;
            } else if (field.type === 'textarea') {
                fieldHtml += `<textarea id="${id}" class="form-control ${sizeClass}" rows="${field.rows || 3}">${field.defaultValue || ''}</textarea>`;
            } else {
                const attributesString = field.attributes ? Object.entries(field.attributes).map(([k, v]) => `${k}='${v}'`).join(' ') : '';
                fieldHtml += `<input type="${field.type || 'text'}" id="${id}" class="form-control ${sizeClass}" value="${field.defaultValue || ''}" ${attributesString}>`;
            }
            fieldHtml += `</div>`;
            return fieldHtml;
        };

        fieldsConfig.forEach(configItem => {
            if (configItem.type === 'row' && Array.isArray(configItem.fields)) {
                contentHtml += `<div class="row">`;
                configItem.fields.forEach(field => {
                    contentHtml += generateFieldHtml(field);
                });
                contentHtml += `</div>`;
            } else {
                contentHtml += `<div class="row">`;
                contentHtml += generateFieldHtml({ ...configItem, colClass: configItem.colClass || 'col-12' });
                contentHtml += `</div>`;
            }
        });

        const buttons = [
            {
                text: 'OK',
                icon: 'bi-check-circle',
                variant: 'primary',
                action: async () => {
                    const results = {};
                    fieldData.forEach(field => {
                        const element = document.getElementById(field.id);
                        if (element) {
                            results[field.id] = element.value;
                        }
                    });
                    if (onSubmit) onSubmit(results);
                }
            },
            {
                text: 'Cancelar',
                icon: 'bi-x-lg',
                variant: 'secondary',
                action: async () => {
                    if (onCancel) onCancel();
                }
            }
        ];

        await this._openModal({
            title: title,
            content: contentHtml,
            showDefaultCloseButton: false,
            buttons: buttons,
            modalSize: options.modalSize
        });

        // População e tratamento de eventos dos campos
        fieldData.forEach(async field => {
            const element = document.getElementById(field.id);
            if (!element) {
                console.warn(`Elemento com ID '${field.id}' não encontrado no DOM. Pulando.`);
                return;
            }

            if (field.type === 'select' && field.dataSource) {
                // Função auxiliar para popular o select, com suporte a data-attributes
                const populateSelect = (data, targetElement, dataAttributesToMap = []) => {
                    targetElement.innerHTML = '<option value=""></option>'; // Opção padrão vazia
                    data.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.id;
                        option.textContent = item.name;

                        // Mapeia propriedades do item para data-attributes
                        dataAttributesToMap.forEach(attrName => {
                            if (item[attrName] !== undefined) {
                                option.setAttribute(`data-${attrName.replace(/_/g, '-')}`, item[attrName]);
                            }
                        });
                        targetElement.appendChild(option);
                    });
                };

                // Lógica de dataSource (Array, URL, Function)
                if (Array.isArray(field.dataSource)) {
                    populateSelect(field.dataSource, element, field.dataAttributesToMap);
                } else if (typeof field.dataSource === 'string') {
                    element.innerHTML = '<option value="">A carregar...</option>';
                    try {
                        const response = await fetch(field.dataSource);
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const data = await response.json();
                        populateSelect(data, element, field.dataAttributesToMap);
                    } catch (error) {
                        console.warn(`Fetch falhou para '${field.dataSource}'. Tentando chamar como função global. Erro:`, error);
                        if (typeof window[field.dataSource] === 'function') {
                            try {
                                const data = await window[field.dataSource]();
                                populateSelect(data, element, field.dataAttributesToMap);
                            } catch (funcError) {
                                console.error(`Erro ao chamar função global ${field.dataSource}:`, funcError);
                                element.innerHTML = '<option value="">Erro ao carregar</option>';
                            }
                        } else {
                            console.error(`Fonte de dados '${field.dataSource}' não é URL válida nem função global.`, error);
                            element.innerHTML = '<option value="">Erro ao carregar</option>';
                        }
                    }
                } else if (typeof field.dataSource === 'function') {
                    element.innerHTML = '<option value="">A carregar...</option>';
                    try {
                        const data = await field.dataSource();
                        populateSelect(data, element, field.dataAttributesToMap);
                    } catch (funcError) {
                        console.error(`Erro ao chamar função de fonte de dados para '${field.id}':`, funcError);
                        element.innerHTML = '<option value="">Erro ao carregar</option>';
                    }
                }
            }

            if (field.events && typeof field.events === 'object') {
                for (const eventType in field.events) {
                    if (Object.hasOwnProperty.call(field.events, eventType)) {
                        const handler = field.events[eventType];
                        if (typeof handler === 'function') {
                            element.addEventListener(eventType, handler);
                        }
                    }
                }
            }
        });
    }
}

const SbModal = new SBModalManager();