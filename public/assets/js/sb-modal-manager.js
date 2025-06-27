class SBModalManager {
    constructor() {
        this.modalElement = null;
    }

    // Método interno para criar e abrir a modal
    _openModal({
        title,
        content,
        buttons = [],
        showDefaultCloseButton = true
    }) {
        this.removeModalFromDOM();

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
                    button.action();
                    // Fechar a modal se não for um botão de "dismiss"
                    if (!button.dataBsDismiss) {
                        this.closeModal();
                    }
                });
            }
            modalFooter.appendChild(btn);
        });

        const bsModal = new bootstrap.Modal(this.modalElement);
        this.modalElement.addEventListener('hidden.bs.modal', () => {
            this.removeModalFromDOM();
        });
        bsModal.show();
    }

    /**
     * Fecha a modal se ela estiver aberta.
     */
    closeModal() {
        if (this.modalElement) {
            const bsModal = bootstrap.Modal.getInstance(this.modalElement);
            if (bsModal) {
                bsModal.hide();
            }
        }
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
                action: () => {
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
                action: () => {
                    if (onConfirm) onConfirm();
                }
            }, {
                text: 'Não',
                icon: 'bi-x-lg',
                variant: 'danger',
                action: () => {
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
     */
    prompt(message, defaultValue = '', onOk = null, onCancel = null, title = 'Entrada Necessária') {
        const inputId = `promptInput-${Date.now()}`;
        const contentHtml = `
            <p>${message}</p>
            <input type="text" id="${inputId}" class="form-control" value="${defaultValue}">
        `;

        this._openModal({
            title: title,
            content: contentHtml,
            showDefaultCloseButton: false,
            buttons: [{
                text: 'OK',
                icon: 'bi-check-circle',
                variant: 'primary',
                action: () => {
                    const inputValue = document.getElementById(inputId).value;
                    if (onOk) onOk(inputValue);
                }
            }, {
                text: 'Cancelar',
                icon: 'bi-x-lg',
                variant: 'secondary',
                action: () => {
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