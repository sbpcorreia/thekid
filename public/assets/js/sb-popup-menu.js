class PopupMenu {
  constructor(options = [], title = 'Escolha uma opção') {
    this.options = options;
    this.title = title;
    this.backdrop = null;
    this.container = null;
  }

  show() {
    return new Promise(resolve => {
      // Backdrop
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'popup-menu-backdrop';
      this.backdrop.onclick = e => {
        if (e.target === this.backdrop) this._close(null, resolve);
      };

      // Container
      this.container = document.createElement('div');
      this.container.className = 'popup-menu card shadow-lg p-3 bg-white rounded';

      // Título
      const titleEl = document.createElement('h5');
      titleEl.className = 'card-title mb-3';
      titleEl.textContent = this.title;
      this.container.appendChild(titleEl);

      // Botões
      this.options.forEach(opt => {
        const label = typeof opt === 'object' ? opt.label : opt;
        const value = typeof opt === 'object' ? (opt.value ?? label) : label;
        const action = typeof opt === 'object' && typeof opt.action === 'function' ? opt.action : null;

        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-primary w-100 text-start mb-2';
        btn.textContent = label;

        btn.addEventListener('click', async () => {
          if (action) await action();      // Executa ação se existir
          this._close(value, resolve);     // Fecha e resolve valor
        });

        this.container.appendChild(btn);
      });

      document.body.appendChild(this.backdrop);
      document.body.appendChild(this.container);
    });
  }

  _close(value, resolve) {
    if (this.backdrop) this.backdrop.remove();
    if (this.container) this.container.remove();
    resolve(value);
  }
}