class SBModalManager {
    constructor() {
        this.modalElement = null;
        // Adiciona uma promessa para encadear as chamadas de modal
        this.currentPromise = Promise.resolve(); 
    }

    /**
     * Método interno para criar e abrir a modal.
     * Agora retorna uma Promessa que resolve quando a modal está completamente escondida e removida do DOM.
     * @param {object} options - Opções para a modal.
     */
    _openModal({
        title,
        content,
        buttons = [],
        showDefaultCloseButton = true
    }) {
        // Encadeia a nova abertura de modal após a resolução da promessa anterior
        this.currentPromise = this.currentPromise.then(() => {
            return new Promise(resolve => {
                this.removeModalFromDOM(); // Garante que qualquer modal anterior é limpa

                this.modalElement = document.createElement('div');
                this.modalElement.classList.add('modal', 'fade');
                this.modalElement.setAttribute('tabindex', '-1');
                this.modalElement.setAttribute('aria-labelledby', 'dynamicModalLabel');
                this.modalElement.setAttribute('aria-hidden', 'true');
                this.modalElement.setAttribute('data-bs-backdrop', 'static');
                this.modalElement.setAttribute('data-bs-keyboard', 'false');

                this.modalElement.innerHTML = `
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="dynamicModalLabel">${title}</h5>
                                ${showDefaultCloseButton ? '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' : ''}
                            </div>
                            <div class="modal-body">
                                ${content}
                            </div>
                            <div class="modal-footer">
                                </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(this.modalElement);

                const modalFooter = this.modalElement.querySelector('.modal-footer');
                buttons.forEach(button => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.classList.add('btn', `btn-${button.variant || 'secondary'}`);
                    if (button.dataBsDismiss) {
                        btn.setAttribute('data-bs-dismiss', button.dataBsDismiss);
                    }
                    let buttonContent = '';
                    if (button.icon) {
                        buttonContent += `<i class="${button.icon} me-2"></i>`;
                    }
                    buttonContent += button.text;
                    btn.innerHTML = buttonContent;

                    if (button.action && typeof button.action === 'function') {
                        btn.addEventListener('click', () => {
                            // Se o botão tem uma ação, execute-a.
                            // A lógica de fecho da modal é movida para a promessa nos métodos de conveniência.
                            button.action(); 
                        });
                    }
                    modalFooter.appendChild(btn);
                });

                const bsModal = new bootstrap.Modal(this.modalElement);
                this.modalElement.addEventListener('hidden.bs.modal', () => {
                    this.removeModalFromDOM();
                    resolve(); // Resolve a promessa quando a modal é completamente escondida e removida
                });
                bsModal.show();
            });
        });
    }

    /**
     * Fecha a modal se ela estiver aberta.
     * Agora retorna uma Promessa que resolve quando a modal estiver completamente fechada.
     */
    closeModal() {
        if (this.modalElement) {
            const bsModal = bootstrap.Modal.getInstance(this.modalElement);
            if (bsModal) {
                // Criar e retornar uma nova Promessa que resolve no evento hidden.bs.modal
                return new Promise(resolve => {
                    // Usa { once: true } para remover o listener automaticamente após o primeiro evento
                    this.modalElement.addEventListener('hidden.bs.modal', function handler() {
                        this.removeEventListener('hidden.bs.modal', handler); // Garantia de remoção
                        resolve();
                    }, { once: true }); 
                    bsModal.hide();
                });
            }
        }
        return Promise.resolve(); // Se não houver modal para fechar, retorna uma promessa já resolvida
    }

    /**
     * Remove a modal do DOM.
     */
    removeModalFromDOM() {
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
            this.modalElement = null;
        }
    }

    // --- Métodos de Conveniência no estilo Alertify ---

    /**
     * Exibe uma modal de alerta simples (com apenas um botão OK).
     * @param {string} message - O conteúdo da mensagem.
     * @param {Function} [onOk=null] - Callback para quando o botão OK for clicado.
     * @param {string} [title='Alerta'] - O título da modal.
     */
    alert(message, onOk = null, title = 'Alerta') {
        this._openModal({
            title: title,
            content: message,
            showDefaultCloseButton: false,
            buttons: [{
                text: 'OK',
                icon: 'bi-check-circle',
                variant: 'primary',
                action: async () => { // Usar async aqui
                    await this.closeModal(); // Esperar a modal fechar completamente
                    if (onOk) onOk();
                }
            }]
        });
    }

    /**
     * Exibe uma modal de confirmação (com botões Sim/Não).
     * @param {string} message - O conteúdo da mensagem.
     * @param {Function} [onConfirm=null] - Callback para quando o botão "Sim" for clicado.
     * @param {Function} [onCancel=null] - Callback para quando o botão "Não" for clicado.
     * @param {string} [title='Confirmação'] - O título da modal.
     */
    confirm(message, onConfirm = null, onCancel = null, title = 'Confirmação') {
        this._openModal({
            title: title,
            content: message,
            showDefaultCloseButton: false,
            buttons: [{
                text: 'Sim',
                icon: 'bi-check-lg',
                variant: 'success',
                action: async () => { // Usar async
                    await this.closeModal(); // Esperar a modal fechar completamente
                    if (onConfirm) onConfirm();
                }
            }, {
                text: 'Não',
                icon: 'bi-x-lg',
                variant: 'danger',
                action: async () => { // Usar async
                    await this.closeModal(); // Esperar a modal fechar completamente
                    if (onCancel) onCancel();
                }
            }]
        });
    }

    /**
     * Exibe uma modal com um campo de entrada (prompt).
     * @param {string} message - A mensagem ou pergunta.
     * @param {string} [defaultValue=''] - O valor padrão para o campo de entrada.
     * @param {Function} [onOk=null] - Callback para quando o botão OK for clicado. Recebe o valor do input como argumento.
     * @param {Function} [onCancel=null] - Callback para quando o botão Cancelar for clicado.
     * @param {string} [title='Entrada Necessária'] - O título da modal.
     * @param {string} [inputType="text"] - O tipo do campo de entrada (e.g., 'text', 'password', 'number').
     * @param {object} [inputAttributes=[]] - Um objeto de atributos adicionais para o campo de entrada.
     */
    prompt(message, defaultValue = '', onOk = null, onCancel = null, title = 'Entrada Necessária', inputType = "text", inputAttributes = {}) {
        const inputId = `promptInput-${Date.now()}`;

        let attributesString = '';
        for (const key in inputAttributes) {
            if (Object.prototype.hasOwnProperty.call(inputAttributes, key)) {
                // Se o valor for vazio ou null, adicione apenas o nome do atributo (ex: data-vk)
                // Caso contrário, adicione nome="valor"
                const value = inputAttributes[key];
                if (value === '' || value === null || value === undefined) {
                    attributesString += ` ${key}`;
                } else {
                    attributesString += ` ${key}="${value}"`;
                }
            }
        }

        const contentHtml = `
            <p>${message}</p>
            <input type="${inputType}" id="${inputId}" class="form-control" value="${defaultValue}"${attributesString}>
        `;

        this._openModal({
            title: title,
            content: contentHtml,
            showDefaultCloseButton: false,
            buttons: [{
                text: 'OK',
                icon: 'bi-check-circle',
                variant: 'primary',
                action: async () => { // Usar async
                    const inputValue = document.getElementById(inputId).value;
                    await this.closeModal(); // Esperar a modal fechar completamente
                    if (onOk) onOk(inputValue);
                }
            }, {
                text: 'Cancelar',
                icon: 'bi-x-lg',
                variant: 'secondary',
                action: async () => { // Usar async
                    await this.closeModal(); // Esperar a modal fechar completamente
                    if (onCancel) onCancel();
                }
            }]
        });
    }

    /**
     * Abre uma modal genérica com opções personalizadas.
     * É o método original que permite total controle.
     * @param {object} options - As mesmas opções do método openModal anterior.
     */
    custom(options) {
        this._openModal(options);
    }
}

// Cria uma única instância da classe para ser usada globalmente
const SbModal = new SBModalManager();