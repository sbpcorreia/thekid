class DynamicModal {
  static modalCount = 0; // contador para modais múltiplos
  

  /**
   * options = {
   *   title: string,
   *   content: string | function | Promise<string> | URL (string),
   *   size: 'sm' | 'md' | 'lg' | 'xl' (default 'md'),
   *   buttons: [
   *     {
   *       label: string,
   *       icon: string (opcional, ex: 'bi-check-lg'),
   *       className: string (ex: 'btn-primary'),
   *       onClick: function(modalInstance) | null (null = fecha modal)
   *     },
   *     ...
   *   ],
   *   timeout: number em ms (opcional),
   *   onTimeoutClose: function (opcional),
   *   onBeforeClose: function (modalInstance) => bool|Promise<bool> (opcional),
   *   animationClass: string (ex: 'fade'), // padrão fade do bootstrap
   * }
   */
  constructor(options = {}) {
    this.id = `dynamicModal_${++DynamicModal.modalCount}`;
    this.options = options;
    this.isOpen = false;

    // normaliza tamanho padrão
    this.options.size = this.options.size || 'md';

    // container da modal
    this.modalEl = null;

    // barra de progresso do timeout
    this.progressBarInterval = null;

    this.backdropEl = null;

    // prepara e cria modal
    this._createModal();
  }

  _createModal() {
    // cria container base
    const modalDiv = document.createElement('div');
    modalDiv.classList.add('modal', 'show');
    if (this.options.animationClass) {
      modalDiv.classList.add(this.options.animationClass);
    } else {
      modalDiv.classList.add('fade');
    }
    modalDiv.style.display = 'block';
    modalDiv.id = this.id;
    modalDiv.tabIndex = -1;
    modalDiv.setAttribute('aria-modal', 'true');
    modalDiv.setAttribute('role', 'dialog');

    // modal-dialog com tamanho
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    switch (this.options.size) {
      case 'sm': dialog.classList.add('modal-sm'); break;
      case 'lg': dialog.classList.add('modal-lg'); break;
      case 'xl': dialog.classList.add('modal-xl'); break;
      default: /* md default */ break;
    }

    // modal-content
    const content = document.createElement('div');
    content.className = 'modal-content';

    // modal-header
    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h5');
    title.className = 'modal-title';
    title.innerHTML = this.options.title || '';

    // botão fechar
    const btnClose = document.createElement('button');
    btnClose.type = 'button';
    btnClose.className = 'btn-close';
    btnClose.setAttribute('aria-label', 'Close');
    btnClose.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(btnClose);

    // modal-body
    this.body = document.createElement('div');
    this.body.className = 'modal-body';

    // modal-footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    // cria botões
    if (Array.isArray(this.options.buttons)) {
      this.options.buttons.forEach(btn => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `btn ${btn.className || 'btn-secondary'}`;

        if (btn.icon) {
          const icon = document.createElement('i');
          icon.className = btn.icon;
          icon.style.marginRight = '6px';
          button.appendChild(icon);
        }
        button.appendChild(document.createTextNode(btn.label));

        button.addEventListener('click', async () => {
          if (typeof btn.onClick === 'function') {
            // passa a instância da modal
            const result = btn.onClick(this);
            if (result instanceof Promise) {
              await result;
            }
          } else {
            this.close();
          }
        });

        footer.appendChild(button);
      });
    }

    // barra de progresso para timeout
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'progress';
    this.progressBar.style.height = '4px';
    this.progressBar.style.margin = '0';

    this.progressInner = document.createElement('div');
    this.progressInner.className = 'progress-bar bg-info';
    this.progressInner.style.width = '0%';
    this.progressBar.appendChild(this.progressInner);

    content.appendChild(header);
    content.appendChild(this.body);
    content.appendChild(footer);
    content.appendChild(this.progressBar);

    dialog.appendChild(content);
    modalDiv.appendChild(dialog);

    this.modalEl = modalDiv;
  }

  async _loadContent() {
    let content = this.options.content || '';

    if (typeof content === 'function') {
      // pode retornar string ou Promise<string>
      content = content();
      if (content instanceof Promise) {
        content = await content;
      }
    } else if (content instanceof Promise) {
      content = await content;
    } else if (typeof content === 'string' && (content.startsWith('http://') || content.startsWith('https://'))) {
      // carrega via fetch
      try {
        const resp = await fetch(content);
        if (!resp.ok) throw new Error('Erro ao carregar conteúdo');
        content = await resp.text();
      } catch (e) {
        content = `<div class="text-danger">Erro ao carregar conteúdo: ${e.message}</div>`;
      }
    }

    this.body.innerHTML = content;
  }
  

  async open() {
    if (this.isOpen) return;
    this.isOpen = true;

    let shaking = false;

      // cria a overlay (backdrop)
    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'modal-backdrop fade show';

    // adiciona ao body
    document.body.appendChild(this.backdropEl);

    this.backdropEl.addEventListener('click', (e) => {
        e.stopPropagation();
  
        if (shaking) return;  // se já está a tremer, não repete

        shaking = true;
        this.modalEl.classList.add('modal-shake');
  
        setTimeout(() => {
          this.modalEl.classList.remove('modal-shake');
          shaking = false;
        }, 400);
    });

    // carrega conteúdo dinâmico
    await this._loadContent();

    // anexa no body
    document.body.appendChild(this.modalEl);

    // impede scroll do body
    document.body.classList.add('modal-open');

    // foco no modal
    this.modalEl.focus();

    // timeout e barra de progresso
    if (this.options.timeout && this.options.timeout > 0) {
      let elapsed = 0;
      const total = this.options.timeout;
      this.progressInner.style.width = '0%';

      this.progressBarInterval = setInterval(() => {
        elapsed += 50;
        const perc = Math.min((elapsed / total) * 100, 100);
        this.progressInner.style.width = perc + '%';

        if (elapsed >= total) {
          clearInterval(this.progressBarInterval);
          this.progressBarInterval = null;
          if (typeof this.options.onTimeoutClose === 'function') {
            this.options.onTimeoutClose(this);
          }
          this.close();
        }
      }, 50);
    }
  }

  async close() {
      if (!this.isOpen) return;
    
      // chamada de confirmação (antes de fechar)
      if (typeof this.options.onBeforeClose === 'function') {
        const result = this.options.onBeforeClose(this);
        if (result instanceof Promise) {
          if (!(await result)) return;
        } else if (!result) {
          return;
        }
      }

      // limpa timeout/intervalos
      if (this.progressBarInterval) {
        clearInterval(this.progressBarInterval);
        this.progressBarInterval = null;
      }

      // remove a classe show para disparar o fade-out
      this.modalEl.classList.remove('show');
      this.backdropEl.classList.remove('show');

      // espera a animação terminar antes de remover os elementos
      this.modalEl.addEventListener('transitionend', () => {
          // remove overlay e modal do DOM
          if (this.backdropEl) {
          this.backdropEl.remove();
          this.backdropEl = null;
      }

        this.modalEl.remove();

        document.body.classList.remove('modal-open');

        this.isOpen = false;
    }, { once: true });
  }
}
