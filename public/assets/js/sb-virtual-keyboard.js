// virtual-keyboard.pt.js
// Versão compacta da biblioteca VirtualKeyboard PT com estilo embutido e ativação no focus

(function(){
    class VirtualKeyboard {
        constructor() {
            // Estado
            this.language = 'pt';
            this.shift = false;
            this.caps = localStorage.getItem('vk_caps') === 'true';
            this.currentInput = null;

            // Sons
            //this.audioClick = new Audio('https://actions.google.com/sounds/v1/keyboard/keyboard_press_key.ogg');

            // Layouts QWERTY PT
            this.layouts = {
                pt_alpha: [
                    ['1','2','3','4','5','6','7','8','9','0','←'],
                    ['Q','W','E','R','T','Y','U','I','O','P','´'],
                    ['A','S','D','F','G','H','J','K','L','Ç','Enter'],
                    ['Shift','Z','X','C','V','B','N','M',',','.','Caps'],
                    ['Espaço']
                ],
                pt_numeric: [
                    ['7','8','9'],
                    ['4','5','6'],
                    ['1','2','3'],
                    ['0','.','←'],
                    ['Enter']
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
            /* Container modal */
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
            #virtual-keyboard.hide { 
                display:none; 
            }
            #virtual-keyboard .vk-header {
                cursor: move;
                background: #0d6efd;
                color: white;
                padding: 8px 12px;
                font-weight: 600;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                user-select: none;
            }
            #virtual-keyboard .vk-keys {
                padding: 10px 15px 15px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            #virtual-keyboard .vk-row {
                display: flex;
                justify-content: center;
                gap: 6px;
                flex-wrap: wrap;
            }
            #virtual-keyboard button {
                background: #e9ecef;
                border: 1px solid #ced4da;
                border-radius: 6px;
                box-shadow: inset 0 -2px 0 rgba(0,0,0,0.15);
                padding: 10px 14px;
                min-width: 48px;
                font-weight: 600;
                color: #212529;
                cursor: pointer;
                transition: all 0.1s ease-in-out;
                user-select: none;
            }
            #virtual-keyboard button.active {
                background-color: #0d6efd;
                color: white;
                box-shadow: 0 0 6px #0d6efd99 inset;
            }
            #virtual-keyboard button:hover {
                background: #dee2e6;
                transform: translateY(1px);
            }
            #virtual-keyboard button:active {
                background: #adb5bd;
                box-shadow: inset 0 2px 2px rgba(0,0,0,0.3);
            }
            #virtual-keyboard button.wide {
                min-width: 80px;
            }
            #virtual-keyboard button.space {
                min-width: 200px;
            }
            /* Ícones */
            #virtual-keyboard i.bi {
                font-size: 1.2em;
                vertical-align: middle;
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

        // Renderiza layout inicial (alfanumérico)
        this.renderKeys(this.layouts.pt_alpha);
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
        const isUpper = (this.caps && !this.shift) || (!this.caps && this.shift);
        this.keysContainer.innerHTML = '';
        layout.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'vk-row';
            row.forEach(key => {
                const btn = document.createElement('button');                
                btn.type = 'button';

                // Classes especiais para tamanho
                if (key === 'Espaço') btn.classList.add('space');
                else if (key === 'Shift' || key === 'Caps' || key === 'Enter') btn.classList.add('wide');

                // Ícone para backspace (←)
                if (key === '←') {
                    btn.innerHTML = '<i class="bi bi-backspace"></i>';
                } else {
                    btn.textContent = key;
                }

                if (key.length === 1 && /[a-zA-ZÇç]/.test(key)) {
                    btn.textContent = isUpper ? key.toUpperCase() : key.toLowerCase();
                    
                } else {
                    btn.textContent = key;
                }
                btn.dataset.key = key;

                // Usa mousedown para evitar blur no input
                btn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleKey(key);
                });

                rowEl.appendChild(btn);
            });
            this.keysContainer.appendChild(rowEl);
        });
        // Remove active de todos
        this.keysContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));

        // Adiciona active no botão Caps se ativo
        if(this.caps) {
            const capsBtn = this.keysContainer.querySelector('button[data-key="Caps"]');
            if(capsBtn) capsBtn.classList.add('active');
        }
        // Adiciona active no botão Shift se ativo
        if(this.shift) {
            const shiftBtn = this.keysContainer.querySelector('button[data-key="Shift"]');
            if(shiftBtn) shiftBtn.classList.add('active');
        }
    }

    handleKey(key) {
      if (!this.currentInput) return;

      if (key === '←') {
            this.currentInput.value = this.currentInput.value.slice(0, -1);
      } else if (key === 'Espaço') {
            this.currentInput.value += ' ';
      } else if (key === 'Enter') {
            this.validate();
      } else if (key === 'Shift') {
            this.shift = !this.shift;
            this.renderKeys(this.getCurrentLayout());
      } else if (key === 'Caps') {
            this.caps = !this.caps;
            localStorage.setItem('vk_caps', this.caps);
            this.renderKeys(this.getCurrentLayout());
      } else {
            if (key.length === 1 && /[a-zA-ZÇç]/.test(key)) {
                const upper = (this.caps && !this.shift) || (!this.caps && this.shift);
                const char = upper ? key.toUpperCase() : key.toLowerCase();
                this.currentInput.value += char;

                // Desliga shift após inserir uma letra
                if(this.shift) {
                  this.shift = false;
                  this.renderKeys(this.getCurrentLayout());
                }
            } else {
                // números e outros símbolos
                this.currentInput.value += key;
            }        
        }

        //this.playClick();
        this.currentInput.focus();
    }

    getCurrentLayout() {
        if (!this.currentInput) return this.layouts.pt_alpha;
        if (this.currentInput.type === 'number') return this.layouts.pt_numeric;
        return this.layouts.pt_alpha;
    }

    attachGlobalEvents() {
        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'number') && !e.target.readOnly && !e.target.disabled) {
                this.currentInput = e.target;
                this.showKeyboard();
                this.renderKeys(this.getCurrentLayout());
                this.positionKeyboard();
            }
        });
        
        document.addEventListener('mousedown', (e) => {
            // Fecha teclado se clicar fora dele e fora do input
            if (!this.keyboardEl.contains(e.target) && e.target !== this.currentInput) {
                this.hideKeyboard();
                this.currentInput = null;
            }
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
        this.keyboardEl.classList.remove('hide');
    }

    hideKeyboard() {
        this.keyboardEl.classList.add('hide');
    }

    validate() {
        // Dispara evento 'virtualkeyboard:enter' no input
        const ev = new CustomEvent('virtualkeyboard:enter', { detail: { value: this.currentInput.value }});
        this.currentInput.dispatchEvent(ev);
        // Fecha teclado ao validar
        this.hideKeyboard();
        this.currentInput.blur();
        this.currentInput = null;
    }
}

// Exposição global
window.VirtualKeyboard = VirtualKeyboard;

// Auto-instancia e ativa o teclado (se quiseres criar manualmente, não usares isto)
window.addEventListener('DOMContentLoaded', () => {
    window.VKInstance = new VirtualKeyboard();
});

})();
