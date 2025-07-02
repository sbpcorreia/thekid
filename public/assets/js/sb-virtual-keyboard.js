// virtual-keyboard.pt.js
// Versão compacta da biblioteca VirtualKeyboard PT com estilo embutido e ativação no focus

(function(){
    class VirtualKeyboard {
        constructor() {
            // Estado
            this.ctrl = false;
            this.alt = false;
            this.language = 'pt';
            this.shift = false;
            this.caps = localStorage.getItem('vk_caps') === 'true';
            this.currentInput = null;
            this.type = "";

            this.layouts = {
                pt_alpha: [
                    [
                        { key: '\\', lower: '\\', upper: '|', altgr: '' },
                        { key: '1', lower: '1', upper: '!', altgr: '' },
                        { key: '2', lower: '2', upper: '"', altgr: '@' },
                        { key: '3', lower: '3', upper: '#', altgr: '£' },
                        { key: '4', lower: '4', upper: '$', altgr: '§' },
                        { key: '5', lower: '5', upper: '%', altgr: '' },
                        { key: '6', lower: '6', upper: '&', altgr: '' },
                        { key: '7', lower: '7', upper: '/', altgr: '{' },
                        { key: '8', lower: '8', upper: '(', altgr: '[' },
                        { key: '9', lower: '9', upper: ')', altgr: ']' },
                        { key: '0', lower: '0', upper: '=', altgr: '}' },
                        { key: '\'', lower: '\'', upper: '?', altgr: '' },
                        { key: '«', lower: '«', upper: '»', altgr: '' },
                        { key: 'Backspace', lower: '<i class="bi bi-backspace"></i>', upper: '', altgr: '', colspan: 2 }
                    ],
                    [
                        { key: 'Tab', lower: '<i class="bi bi-indent"></i>', upper: '', altgr: '', colspan: 2 },
                        { key: 'Q', lower: 'q', upper: 'Q', altgr: '' },
                        { key: 'W', lower: 'w', upper: 'W', altgr: '' },
                        { key: 'E', lower: 'e', upper: 'E', altgr: '€' },
                        { key: 'R', lower: 'r', upper: 'R', altgr: '' },
                        { key: 'T', lower: 't', upper: 'T', altgr: '' },
                        { key: 'Y', lower: 'y', upper: 'Y', altgr: '' },
                        { key: 'U', lower: 'u', upper: 'U', altgr: '' },
                        { key: 'I', lower: 'i', upper: 'I', altgr: '' },
                        { key: 'O', lower: 'o', upper: 'O', altgr: '' },
                        { key: 'P', lower: 'p', upper: 'P', altgr: '' },
                        { key: '+', lower: '+', upper: '*', altgr: '¨' },
                        { key: '´', lower: '´', upper: '`', altgr: '' },
                        { key: 'Enter', lower: '<i class="bi bi-arrow-return-left"></i>', upper: '', altgr: '', rowspan: 2 }
                    ],
                    [
                        { key: 'CapsLock', lower: 'Caps', upper: '', altgr: '', colspan: 2 },
                        { key: 'A', lower: 'a', upper: 'A', altgr: '' },
                        { key: 'S', lower: 's', upper: 'S', altgr: '' },
                        { key: 'D', lower: 'd', upper: 'D', altgr: '' },
                        { key: 'F', lower: 'f', upper: 'F', altgr: '' },
                        { key: 'G', lower: 'g', upper: 'G', altgr: '' },
                        { key: 'H', lower: 'h', upper: 'H', altgr: '' },
                        { key: 'J', lower: 'j', upper: 'J', altgr: '' },
                        { key: 'K', lower: 'k', upper: 'K', altgr: '' },
                        { key: 'L', lower: 'l', upper: 'L', altgr: '' },
                        { key: 'Ç', lower: 'ç', upper: 'Ç', altgr: '' },
                        { key: 'º', lower: 'º', upper: 'ª', altgr: '' },
                        { key: '~', lower: '~', upper: '^', altgr: '' }
                    ],
                    [
                        { key: 'Shift', lower: '<i class="bi bi-arrow-up"></i>', upper: '', altgr: '' },
                        { key: '<', lower: '<', upper: '>', altgr: '' },
                        { key: 'Z', lower: 'z', upper: 'Z', altgr: '' },
                        { key: 'X', lower: 'x', upper: 'X', altgr: '' },
                        { key: 'C', lower: 'c', upper: 'C', altgr: '' },
                        { key: 'V', lower: 'v', upper: 'V', altgr: '' },
                        { key: 'B', lower: 'b', upper: 'B', altgr: '' },
                        { key: 'N', lower: 'n', upper: 'N', altgr: '' },
                        { key: 'M', lower: 'm', upper: 'M', altgr: '' },
                        { key: ',', lower: ',', upper: ';', altgr: '' },
                        { key: '.', lower: '.', upper: ':', altgr: '' },
                        { key: '-', lower: '-', upper: '_', altgr: '' },
                        { key: 'Shift', lower: '<i class="bi bi-arrow-up"></i>', upper: '', altgr: '', colspan: 3 }
                    ],
                    [
                        { key: 'Control', lower: 'Ctrl', upper: '', altgr: '' },
                        { key: 'Alt', lower: 'Alt', upper: '', altgr: '' },
                        { key: ' ', lower: ' ', upper: ' ', altgr: '', colspan: 12 },
                        { key: 'AltGraph', lower: 'AltGr', upper: '', altgr: '' }
                    ]
                ],
                pt_numeric : [
                        [
                            { key : '9', lower : '9', upper : '', altgr : '' },
                            { key : '8', lower : '8', upper : '', altgr : '' },
                            { key : '7', lower : '7', upper : '', altgr : '' },
                            { key : 'Backspace', lower : '<i class="bi bi-backspace"></i>', upper : '', altgr : '', rowspan : 2 }
                        ],
                        [
                            { key : '6', lower : '6', upper : '', altgr : '' },
                            { key : '5', lower : '5', upper : '', altgr : '' },
                            { key : '4', lower : '4', upper : '', altgr : '' }
                        ],
                        [
                            { key : '1', lower : '1', upper : '', altgr : '' },
                            { key : '2', lower : '2', upper : '', altgr : '' },
                            { key : '3', lower : '3', upper : '', altgr : '' },
                            { key : 'Enter', lower : '<i class="bi bi-arrow-return-left"></i>', upper : '', altgr : '', rowspan : 2}],
                        [
                             {key : '0', lower : '0', upper : '', altgr : '', colspan : 2},
                            { key : '.', lower : '.', upper : '', altgr : '' }
                        ]
                ]
            };

            this.injectStyle(); // Injeta estilos gerais do teclado e do input group
            // this.injectInputGroupStyle(); // Removido daqui, pois já está dentro de injectStyle() para consolidar
            this.buildKeyboard();
            this.attachGlobalEvents();
            this.addKeyboardButtonToInputs();
        }

        injectStyle() {
            if (document.getElementById('vk-style')) return;
            const style = document.createElement('style');
            style.id = 'vk-style';
            style.textContent = `
            /* Estilos gerais do teclado virtual */
            #virtual-keyboard {
              position: fixed;
              bottom: 20px; left: 50%;
              transform: translateX(-50%);
              background: var(--bs-gray-100); /* Bootstrap background */
              border-radius: var(--bs-border-radius-lg); /* Bootstrap radius */
              box-shadow: var(--bs-box-shadow-lg); /* Bootstrap shadow */
              user-select: none;
              z-index: 9999; /* Z-index para estar acima de outros elementos */
              font-family: var(--bs-font-sans-serif); /* Bootstrap font */
              color: var(--bs-body-color);
            }
            #virtual-keyboard.hide { display: none; }

            /* Header do teclado */
            #virtual-keyboard .vk-header {
              cursor: move;
              padding: var(--bs-rem) var(--bs-spacer); /* Bootstrap spacing */
              font-weight: var(--bs-font-weight-semibold);
              border-top-left-radius: var(--bs-border-radius-lg);
              border-top-right-radius: var(--bs-border-radius-lg);
            }

            /* Container das teclas (Grid) */
            #virtual-keyboard .vk-keys {
              display: grid; /* Mantém display grid para o layout das teclas */
              grid-template-columns: repeat(15, minmax(40px, 1fr));
              gap: 6px; /* Gap customizado */
              padding: 10px 15px 15px; /* Padding customizado */
              position:relative;
            }

            /* Botões do teclado */
            #virtual-keyboard button:not(.btn-close) {
              background: var(--bs-gray-200); /* Bootstrap light gray */
              border: 1px solid var(--bs-border-color); /* Bootstrap border color */
              border-radius: var(--bs-border-radius); /* Bootstrap border radius */
              box-shadow: inset 0 -2px 0 rgba(0,0,0,0.15); /* Sombra customizada */
              font-weight: var(--bs-font-weight-semibold);
              color: var(--bs-body-color);
              cursor: pointer;
              user-select: none;
              height: 53px; /* Altura customizada */
              transition: background-color .15s ease-in-out, border-color .15s ease-in-out, box-shadow .15s ease-in-out;
            }
            #virtual-keyboard button:hover:not(:disabled) {
                background-color: var(--bs-gray-300);
            }

            /* Estilos para teclas especiais */
            #virtual-keyboard button.enter-double {
              grid-row: span 2;
              height: 112px;
            }
            #virtual-keyboard button.active {
              background-color: var(--bs-primary); /* Bootstrap primary */
              color: var(--bs-white);
              box-shadow: 0 0 6px rgba(13, 110, 253, 0.6) inset; /* Sombra com cor primary Bootstrap */
            }
            #virtual-keyboard button:disabled {
              opacity: 0.5; /* Opacidade reduzida */
              cursor: not-allowed; /* Cursor padrão de desabilitado */
            }
            #virtual-keyboard button.pressed {
                box-shadow: inset 0 0 0 2px var(--bs-primary);
                background-color: var(--bs-blue-100); /* Um azul claro do Bootstrap */
            }

            /* Labels das teclas */
            .vk-key-label {
                position: relative;
                width: 100%;
                height: 100%;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                line-height: 1;
            }
            .vk-key-label .upper, .vk-key-label .altgr {
                position: absolute;
                font-size: 12px;
                opacity: 0.7;
            }
            .vk-key-label .upper { 
                top: 0px; 
                left: 0px; 
            }
            .vk-key-label .altgr { 
                bottom: 0px; 
                right: 0px; 
            }
            .vk-key-label .lower {
                font-size: 18px;
                font-weight: var(--bs-font-weight-bold);
            }
            button.shift-active .upper,
            button.altgr-active .altgr {
                opacity: 1;
            }`;
            document.head.appendChild(style);
        }

        buildKeyboard() {
            // Se existir, remove
            let existing = document.getElementById('virtual-keyboard');
            if (existing) existing.remove();

            this.keyboardEl = document.createElement('div');
            this.keyboardEl.id = 'virtual-keyboard';
            this.keyboardEl.classList.add('hide');
            this.keyboardEl.classList.add('p-3'); // Adiciona padding do Bootstrap
            this.keyboardEl.classList.add('shadow-lg'); // Adiciona sombra do Bootstrap

            // Header arrastável
            const header = document.createElement('div');
            header.className = 'vk-header d-flex justify-content-between align-items-center mb-2'; // Classes Bootstrap
            header.innerHTML = `<span>Teclado Virtual</span>
                                <button type="button" class="btn-close btn-close-white" aria-label="Close" id="vk-close-btn"></button>`; // Botão de fechar do Bootstrap
            this.keyboardEl.appendChild(header);
            this.header = header;

            // Fechar botão
            this.keyboardEl.querySelector('#vk-close-btn').addEventListener('click', () => {
                this.hideKeyboard();
            });

            // Container das teclas
            this.keysContainer = document.createElement('div');
            this.keysContainer.className = 'vk-keys'; // Mantém vk-keys para o grid personalizado
            this.keyboardEl.appendChild(this.keysContainer);

            document.body.appendChild(this.keyboardEl);

            this.makeDraggable(this.keyboardEl, this.header);

            // Renderiza layout inicial
            this.renderKeys(this.getCurrentLayout());
        }

        makeDraggable(elem, handle) {
            let posX=0, posY=0, mouseX=0, mouseY=0;

            handle.style.cursor = 'move';

            const dragMouseDown = (e) => {
                e.preventDefault();
                mouseX = e.clientX;
                mouseY = e.clientY;
                document.addEventListener('mouseup', closeDrag);
                document.addEventListener('mousemove', elementDrag);
            };

            const elementDrag = (e) => {
                e.preventDefault();
                posX = mouseX - e.clientX;
                posY = mouseY - e.clientY;
                mouseX = e.clientX;
                mouseY = e.clientY;
                elem.style.top = (elem.offsetTop - posY) + "px";
                elem.style.left = (elem.offsetLeft - posX) + "px";
                elem.style.bottom = 'auto';
                elem.style.transform = 'none';
            };

            const closeDrag = () => {
                document.removeEventListener('mouseup', closeDrag);
                document.removeEventListener('mousemove', elementDrag);
            };

            handle.addEventListener('mousedown', dragMouseDown);
        }

        renderKeys(layout) {
            const isText = this.currentInput && this.currentInput.type !== 'number';

            const activeLayout = isText ? this.layouts.pt_alpha : this.layouts.pt_numeric;

            this.keysContainer.innerHTML = '';
            // Manter grid-template-columns pois Bootstrap não tem equivalente direto para este layout
            this.keysContainer.style.gridTemplateColumns = 'repeat(15, minmax(40px, 1fr))';

            activeLayout.forEach(row => {
                row.forEach(key => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.dataset.key = key.key;
                    btn.classList.add('btn'); // Adiciona a classe base do botão do Bootstrap
                    btn.classList.add('btn-light'); // Adiciona estilo claro do Bootstrap

                    const label = document.createElement('div');
                    label.className = 'vk-key-label';
                    label.innerHTML = `
                        <span class="upper">${(key.upper.valueOf().toUpperCase() === key.lower.valueOf().toUpperCase() ? '' : (key.upper || ''))}</span>
                        <span class="lower">${(this.shift && key.upper.valueOf().toUpperCase() === key.lower.valueOf().toUpperCase() ? key.upper : (key.lower || ''))}</span>
                        <span class="altgr">${key.altgr || ''}</span>
                    `;

                    btn.appendChild(label);

                    if (key.colspan) btn.style.gridColumn = `span ${key.colspan}`;
                    if (key.rowspan) btn.style.gridRow = `span ${key.rowspan}`;

                    // Adaptação para classes Bootstrap ou combinações
                    if (key.key === 'CapsLock' && this.caps) btn.classList.add('active', 'btn-primary');
                    if (key.key === 'Shift' && this.shift) btn.classList.add('active', 'shift-active', 'btn-primary');
                    if (key.key === 'Control' && this.ctrl) btn.classList.add('active', 'btn-primary');
                    if (key.key === 'Alt' && this.alt) btn.classList.add('active', 'btn-primary');
                    if (key.key === 'AltGraph' && this.ctrl && this.alt) btn.classList.add('active', 'altgr-active', 'btn-primary');

                    if (key.key === 'Backspace' || key.key === 'Enter') {
                        btn.classList.remove('btn-light');
                        btn.classList.add('btn-secondary'); // Estilo diferente para Backspace/Enter
                    }
                    if(key.key === "Enter") {
                        btn.classList.add("enter-double");
                    }

                    if (['Shift', 'CapsLock', 'Tab'].includes(key.key)) btn.classList.add('col-span-2'); // Estilo wide customizado
                    if (key.key === ' ') btn.classList.add('col-span-12'); // Estilo space customizado

                    if(this.ctrl && this.alt && key.altgr === '' && !['Alt', 'Control', 'AltGraph'].includes(key.key)) {
                        btn.disabled = true;
                        btn.classList.add("disabled-key");
                    }

                    btn.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.handleKey(key);
                    });

                    this.keysContainer.appendChild(btn);
                });
            });
        }

        handleKey(key) {
            if (!this.currentInput) return;

            const specialKeys = ['CapsLock', 'Shift', 'Control', 'Alt', 'AltGraph', 'Backspace', 'Enter', 'Tab', ' '];
            let dispatchInputEvents = false;

            if (key.key === 'Backspace') {
                this.currentInput.value = this.currentInput.value.slice(0, -1);
            } else if (key.key === 'Enter') {
                this.validate();
            } else if (key.key === 'CapsLock') {
                this.caps = !this.caps;
                localStorage.setItem('vk_caps', this.caps);
                this.renderKeys();
            } else if (key.key === 'Shift') {
                this.shift = !this.shift;
                this.renderKeys();
            } else if (key.key === 'Control') {
                this.ctrl = !this.ctrl;
                this.renderKeys();
            } else if (key.key === 'Alt') {
                this.alt = !this.alt;
                this.renderKeys();
            } else if (key.key === 'AltGraph') {
                this.ctrl = true;
                this.alt = true;
                this.renderKeys();
            } else if (key.key === 'Tab') {                
                this.currentInput.value += '\t';
                dispatchInputEvents = true;
            } else if (key.key === ' ') {
                this.currentInput.value += ' ';
                dispatchInputEvents = true;
            } else {
                let char = key.lower;
                if (this.ctrl && this.alt && key.altgr) {
                    char = key.altgr;
                } else if ((this.caps && !this.shift) || (!this.caps && this.shift)) {
                    char = key.upper;
                }
                this.currentInput.value += char;
                dispatchInputEvents = true;        

                if (this.shift && !specialKeys.includes(key.key)) {
                    this.shift = false;
                    this.renderKeys();
                }
            }

            if(dispatchInputEvents) {
                const inputEvent = new Event('input', { bubbles: true });
                this.currentInput.dispatchEvent(inputEvent);
            }

            if (this.ctrl || this.alt) {
                if (!['Control', 'Alt', 'AltGraph'].includes(key.key)) {
                    this.ctrl = false;
                    this.alt = false;
                    this.renderKeys();
                }
            }

            //this.currentInput.focus();
        }

        getCurrentLayout() {
            if (!this.currentInput) return this.layouts.pt_alpha;
            if (this.currentInput.type === 'number') return this.layouts.pt_numeric;
            return this.layouts.pt_alpha;
        }

        attachGlobalEvents() {
            document.addEventListener('focusin', (e) => {
                if (
                    e.target.tagName === 'INPUT' &&
                    e.target.hasAttribute('data-vk')
                ) {
                    this.currentInput = e.target;
                }
            });

            document.addEventListener("click", (e) => {
                const clickedKeyboardButton = e.target.closest('.vk-keyboard-button');

                if (clickedKeyboardButton) {
                    e.preventDefault();

                    // Procura pelo invólucro mais próximo que possa ser o .vk-input-group ou .input-group.vk-adapted-group
                    const parentGroup = clickedKeyboardButton.closest('.vk-input-group, .input-group'); //

                    if (parentGroup) {
                        const associatedInput = parentGroup.querySelector('input[data-vk]');

                        if (associatedInput) {
                            // Se o input já está focado, ou este é o input associado ao botão clicado
                            if (this.currentInput === associatedInput && !this.keyboardEl.classList.contains('hide')) {
                                // Se o teclado já está visível e clicou no botão do input ativo, esconde
                                this.hideKeyboard();
                            } else {
                                this.currentInput = associatedInput;
                                associatedInput.focus();

                                // Ativa readOnly SOMENTE quando o teclado virtual é explicitamente aberto pelo botão
                                this.currentInput.readOnly = true;

                                this.showKeyboard();
                                this.renderKeys();
                                this.positionKeyboard();
                            }
                        }
                    }
                    return; // Interrompe para não esconder o teclado
                }

                // Lógica para esconder o teclado virtual quando clica fora
                if (
                    this.keyboardEl &&
                    !this.keyboardEl.classList.contains('hide') &&
                    !this.keyboardEl.contains(e.target) &&
                    (this.currentInput === null || e.target !== this.currentInput) &&
                    !e.target.closest('input[data-vk]')
                ) {
                    this.hideKeyboard();
                }
            });


            // Simula tecla pressionada no físico
            document.addEventListener('keydown', (e) => {
                let theKey = e.key;
                if(theKey == '"') {
                    theKey = "\"";
                } else {
                    if(!['Control', 'Alt', 'AltGraph', 'Shift', 'Backspace', 'Enter', 'CapsLock', 'Tab'].includes(theKey)) {
                        theKey = theKey.valueOf().toUpperCase();
                    }
                }
                const btn = this.keysContainer?.querySelector(`button[data-key="${theKey}"]`);
                if (btn) btn.classList.add('pressed');
            });

            document.addEventListener('keyup', (e) => {
                let theKey = e.key;
                if(theKey == '"') {
                    theKey = "\"";
                } else {
                    if(!['Control', 'Alt', 'AltGraph', 'Shift', 'Backspace', 'Enter', 'CapsLock', 'Tab'].includes(theKey)) {
                        theKey = theKey.valueOf().toUpperCase();
                    }
                }
                const btn = this.keysContainer?.querySelector(`button[data-key="${theKey}"]`);
                if (btn) btn.classList.remove('pressed');
            });

            window.addEventListener('resize', () => {
                if (this.keyboardEl && !this.keyboardEl.classList.contains('hide')) {
                    this.positionKeyboard();
                }
            });

            const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'INPUT' && node.hasAttribute('data-vk')) {
                                this.addKeyboardButtonToInputs([node]);
                            }
                            const newInputs = node.querySelectorAll('input[data-vk]');
                            if (newInputs.length > 0) {
                                this.addKeyboardButtonToInputs(Array.from(newInputs));
                            }
                        }
                    });
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        }

        positionKeyboard() {
            if (!this.currentInput) return;
            const rect = this.currentInput.getBoundingClientRect();
            const kb = this.keyboardEl;
            const margin = 10;

            const topSpace = rect.top;
            const bottomSpace = window.innerHeight - rect.bottom;

            let top;
            if (bottomSpace > kb.offsetHeight + margin) {
                top = window.scrollY + rect.bottom + 5;
            } else if (topSpace > kb.offsetHeight + margin) {
                top = window.scrollY + rect.top - kb.offsetHeight - 5;
            } else {
                top = window.scrollY + rect.bottom + 5;
            }

            let left = window.scrollX + rect.left;

            if (left + kb.offsetWidth > window.scrollX + window.innerWidth - margin) {
                left = window.scrollX + window.innerWidth - kb.offsetWidth - margin;
            }

            if (left < margin + window.scrollX) {
                left = margin + window.scrollX;
            }

            kb.style.top = `${top}px`;
            kb.style.left = `${left}px`;
            kb.style.bottom = 'auto';
            kb.style.transform = 'none';
        }

        showKeyboard() {
            this.keyboardEl?.classList.remove('hide');
        }

        hideKeyboard() {
            this.keyboardEl?.classList.add('hide');
            if (this.currentInput) {
                this.currentInput.readOnly = false;
                this.currentInput.blur();
            }
            this.currentInput = null;
            this.ctrl = false;
            this.alt = false;
        }

        validate() {
            const ev = new CustomEvent('virtualkeyboard:enter', { detail: { value: this.currentInput.value }});
            this.currentInput.dispatchEvent(ev);
            this.hideKeyboard();
        }

        addKeyboardButtonToInputs(inputsToProcess = null) {
            const targetInputs = inputsToProcess || document.querySelectorAll('input[data-vk]');

            targetInputs.forEach(input => {
                // Se o input já foi processado por um dos nossos invólucros, salta
                if (input.closest('.vk-input-group')) {
                    return;
                }

                // Tenta encontrar o invólucro .input-group do Bootstrap
                let bootstrapInputGroup = input.closest('.input-group');

                

                if (!bootstrapInputGroup) {
                    // Se não está dentro de um .input-group do Bootstrap (é um form-input simples, etc.)
                    // Cria o nosso próprio invólucro .vk-input-group
                    const newWrapper = document.createElement('div');
                    newWrapper.className = 'input-group';
                    newWrapper.classList.add('vk-input-group');

                    input.parentNode.insertBefore(newWrapper, input);
                    newWrapper.appendChild(input);
                    bootstrapInputGroup = newWrapper;
                } else {
                    bootstrapInputGroup.classList.add('vk-input-group');
                }
                
                
                // Cria e adiciona o botão do teclado
                const keyboardButton = document.createElement('button');
                
                keyboardButton.type = 'button';
                keyboardButton.classList.add('btn','btn-outline-secondary','vk-keyboard-button');
                keyboardButton.tabIndex = -1;
                const keyboardIcon = document.createElement('i'); // Usado <img> pois SVGs inline no JS são mais fáceis de gerir
                keyboardIcon.className = "bi bi-keyboard fs-6";
                keyboardButton.appendChild(keyboardIcon);
                bootstrapInputGroup.appendChild(keyboardButton);
                
                
            });
        }
    }

    // Exposição global
    window.VirtualKeyboard = VirtualKeyboard;

    // Auto-instancia e ativa o teclado
    window.addEventListener('DOMContentLoaded', () => {
        window.VKInstance = new VirtualKeyboard();
    });

})();