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

        this.injectStyle();
        this.buildKeyboard();
        this.attachGlobalEvents();
    }

    injectStyle() {
        if (document.getElementById('vk-style')) return;
        const style = document.createElement('style');
        style.id = 'vk-style';
        style.textContent = `
            
        #virtual-keyboard {
          position: fixed;
          bottom: 20px; left: 50%;
          transform: translateX(-50%);
          background: #f8f9fa;
          border-radius: 8px;
          box-shadow: 0 6px 12px rgb(0 0 0 / 0.15);
          user-select: none;
          z-index: 1050;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        #virtual-keyboard.hide { display: none; }
        #virtual-keyboard .vk-header {
          cursor: move;
          background: #0d6efd;
          color: white;
          padding: 8px 12px;
          font-weight: 600;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        #virtual-keyboard .vk-row {
        display: contents;
        }
        #virtual-keyboard .vk-keys {
          display: grid;
          grid-template-columns: repeat(15, minmax(40px, 1fr));
          gap: 6px;
          padding: 10px 15px 15px;
          position:relative;
        }
        #virtual-keyboard button {
          background: #e9ecef;
          border: 1px solid #ced4da;
          border-radius: 6px;
          box-shadow: inset 0 -2px 0 rgba(0,0,0,0.15);
          font-weight: 600;
          color: #212529;
          cursor: pointer;
          user-select: none;
          height: 53px;
        }
        #virtual-keyboard button.enter-double {
          grid-row: span 2;
            height: 112px;
        }
        #virtual-keyboard button.active {
          background-color: #0d6efd;
          color: white;
          box-shadow: 0 0 6px #0d6efd99 inset;
        }
        #virtual-keyboard button:disabled {
          opacity: 0.2;
          cursor: default;
        }
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
        .vk-key-label .upper {
            position: absolute;
            top: 4px;
            left: 6px;
            font-size: 12px;
            opacity: 0.7;
        }
        .vk-key-label .altgr {
            position: absolute;
            bottom: 4px;
            right: 6px;
            font-size: 12px;
            opacity: 0.7;
        }
        .vk-key-label .lower {
            font-size: 18px;
            font-weight: bold;
        }            
        button.shift-active .upper,
        button.altgr-active .altgr {
            opacity: 1;
        }
        #virtual-keyboard button.pressed {
            box-shadow: inset 0 0 0 2px #0d6efd;
            background-color: #cfe2ff;
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

        // Header arrastável
        const header = document.createElement('div');
        header.className = 'vk-header';
        header.textContent = 'Teclado Virtual';
        this.keyboardEl.appendChild(header);
        this.header = header;

        // Container das teclas
        this.keysContainer = document.createElement('div');
        this.keysContainer.className = 'vk-keys';
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
        this.keysContainer.style.gridTemplateColumns = 'repeat(15, minmax(40px, 1fr))';

        activeLayout.forEach(row => {
            row.forEach(key => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.dataset.key = key.key;

                const label = document.createElement('div');
                label.className = 'vk-key-label';
                label.innerHTML = `
                    <span class="upper">${key.upper || ''}</span>
                    <span class="lower">${key.lower || ''}</span>
                    <span class="altgr">${key.altgr || ''}</span>
                `;

                btn.appendChild(label);

                if (key.colspan) btn.style.gridColumn = `span ${key.colspan}`;
                if (key.rowspan) btn.style.gridRow = `span ${key.rowspan}`;

                if (key.key === 'CapsLock' && this.caps) btn.classList.add('active');
                if (key.key === 'Shift' && this.shift) btn.classList.add('active', 'shift-active');
                if (key.key === 'Control' && this.ctrl) btn.classList.add('active');
                if (key.key === 'Alt' && this.alt) btn.classList.add('active');
                if (key.key === 'AltGraph' && this.ctrl && this.alt) btn.classList.add('active', 'altgr-active');

                if (['Shift', 'CapsLock', 'Tab'].includes(key.key)) btn.classList.add('wide');        
                if (key.key === ' ') btn.classList.add('space');
                if(key.key === 'Enter') btn.classList.add('enter-double');

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
        } else if (key.key === ' ') {
            this.currentInput.value += ' ';
        } else {
            let char = key.lower;
            if (this.ctrl && this.alt && key.altgr) {
                char = key.altgr;
            } else if ((this.caps && !this.shift) || (!this.caps && this.shift)) {
                char = key.upper;
            }
            this.currentInput.value += char;

            if (this.shift && !specialKeys.includes(key.key)) {
                this.shift = false;
                this.renderKeys();
            }
        }

        if (this.ctrl || this.alt) {
            if (!['Control', 'Alt', 'AltGraph'].includes(key.key)) {
                this.ctrl = false;
                this.alt = false;
                this.renderKeys();
            }
        }

        this.currentInput.focus();
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
                e.target.readOnly = true; // impede teclado nativo

                this.showKeyboard();
                this.renderKeys();
                this.positionKeyboard();
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (
                this.keyboardEl &&
                !this.keyboardEl.contains(e.target) &&
                e.target !== this.currentInput
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
                    console.log(theKey);
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

        // Calcular left para não sair do ecrã
        let left = window.scrollX + rect.left;

        // Se ultrapassar direita do viewport, ajusta left
        if (left + kb.offsetWidth > window.scrollX + window.innerWidth - margin) {
            left = window.scrollX + window.innerWidth - kb.offsetWidth - margin;
        }

        // Se for negativo (fora da esquerda), corrige para margem mínima
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
            this.currentInput.readOnly = false; // reativa se necessário
        }
        this.currentInput = null;
        this.ctrl = false;
        this.alt = false;
    }

    validate() {
        // Dispara evento 'virtualkeyboard:enter' no input
        const ev = new CustomEvent('virtualkeyboard:enter', { detail: { value: this.currentInput.value }});
        this.currentInput.dispatchEvent(ev);
        // Fecha teclado ao validar
        this.hideKeyboard();
        this.currentInput.blur();
        this.currentInput = null;
        this.ctrl = false;
        this.alt = false;
    }
}

// Exposição global
window.VirtualKeyboard = VirtualKeyboard;

// Auto-instancia e ativa o teclado (se quiseres criar manualmente, não usares isto)
window.addEventListener('DOMContentLoaded', () => {
    window.VKInstance = new VirtualKeyboard();
});

})();
