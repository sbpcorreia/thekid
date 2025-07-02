// robot-map-viewer.js (versão final com classes Bootstrap 5)

/**
 * @class RobotMapViewer
 * @description Uma biblioteca JavaScript para visualizar a posição de robôs em um mapa dentro de uma modal Bootstrap 5,
 * com atualizações em tempo real.
 */
class RobotMapViewer {
    /**
     * @typedef {object} RobotMapViewerOptions
     * @property {string} mapImagePath - O caminho (URL) para a imagem do mapa (ex: 'Layout_Lanema.jpg').
     * @property {number} mapWidthMM_full - A largura real TOTAL do espaço físico que o robô pode operar em milímetros.
     * @property {number} mapHeightMM_full - A altura real TOTAL do espaço físico que o robô pode operar em milímetros.
     * @property {object} knownRobotPoint_MM - Um objeto {x: number, y: number} com as coordenadas reais em MM de um ponto conhecido do robô.
     * @property {object} knownRobotPoint_Px - Um objeto {x: number, y: number} com as coordenadas em pixels na imagem (renderizada) do mesmo ponto conhecido do robô.
     * @property {string} [modalId='robotMapModal'] - O ID a ser usado para a modal Bootstrap.
     * @property {string} [mapImageId='mapImage'] - O ID a ser usado para o elemento <img> do mapa.
     * @property {string} [robotIconsContainerId='robotIconsContainer'] - O ID a ser usado para o container dos ícones dos robôs.
     * @property {boolean} [debugMode=false] - Se true, logs de depuração serão exibidos no console.
     * @property {string} [robotIconClass='robot-icon'] - A classe CSS a ser aplicada aos elementos dos ícones dos robôs.
     * @property {string} [modalTitle='Localização dos Robôs'] - O título da modal.
     */

    /**
     * Construtor da classe RobotMapViewer.
     * @param {RobotMapViewerOptions} options - As opções de configuração para a biblioteca.
     */
    constructor(options) {
        this.options = {
            mapImagePath: options.mapImagePath,
            mapWidthMM_full: options.mapWidthMM_full,
            mapHeightMM_full: options.mapHeightMM_full,
            knownRobotPoint_MM: options.knownRobotPoint_MM,
            knownRobotPoint_Px: options.knownRobotPoint_Px,
            modalId: options.modalId || 'robotMapModal',
            mapImageId: options.mapImageId || 'mapImage',
            robotIconsContainerId: options.robotIconsContainerId || 'robotIconsContainer',
            debugMode: options.debugMode || false,
            robotIconClass: options.robotIconClass || 'robot-icon',
            modalTitle: options.modalTitle || 'Localização dos Robôs'
        };

        this.robotIcons = {}; // Armazenará { robotId: HTMLElement }
        this.lastKnownPositions = {}; // Armazenará { robotId: {x_mm: number, y_mm: number, rotation_deg: number} }

        this.currentMapWidthPixels = 0;
        this.currentMapHeightPixels = 0;

        // Novas propriedades para escalas e offsets calculados
        this.scaleFactorX = 0;
        this.scaleFactorY = 0;
        this.pixelOffsetX = 0; // Onde o (0,0) do robô estaria em pixels na imagem
        this.pixelOffsetY = 0;

        // Cria e injeta a modal no DOM
        this.createAndInjectModal();

        // Obtém as referências dos elementos APÓS a modal ser criada
        this.mapImageElement = document.getElementById(this.options.mapImageId);
        this.robotIconsContainerElement = document.getElementById(this.options.robotIconsContainerId);
        this.modalElement = document.getElementById(this.options.modalId);


        if (!this.mapImageElement || !this.robotIconsContainerElement || !this.modalElement) {
            console.error("RobotMapViewer: Um ou mais elementos DOM essenciais não foram encontrados APÓS a injeção da modal.", {
                mapImageId: this.options.mapImageId,
                robotIconsContainerId: this.options.robotIconsContainerId,
                modalId: this.options.modalId
            });
            return;
        }

        this.setupEventListeners();
        // O cálculo inicial será feito quando a imagem carregar ou a modal for mostrada
    }

    /**
     * Gera o HTML da modal dinamicamente e injeta-o no body do documento.
     * Utiliza apenas classes Bootstrap 5 para o layout do mapa.
     * @private
     */
    createAndInjectModal() {
        const modalHtml = `
            <div class="modal fade" id="${this.options.modalId}" tabindex="-1" aria-labelledby="${this.options.modalId}Label" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${this.options.modalId}Label">${this.options.modalTitle}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body d-flex justify-content-center align-items-center p-0">
                            <div class="position-relative" style="max-width: 100%; max-height: 100%;">
                                <img id="${this.options.mapImageId}" src="${this.options.mapImagePath}" alt="Mapa da Instalação" class="img-fluid">
                                <div id="${this.options.robotIconsContainerId}" class="position-absolute top-0 start-0 w-100 h-100"></div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        if (this.options.debugMode) {
            console.log(`Modal com ID '${this.options.modalId}' injetada no DOM.`);
        }
    }

    /**
     * Configura os event listeners para redimensionamento da imagem do mapa
     * e para quando a modal é totalmente exibida.
     * Isso garante que o fator de escala e a origem sejam sempre precisos.
     * @private
     */
    setupEventListeners() {
        // Observa redimensionamentos do container da imagem para ajustar a escala
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.target === this.mapImageElement) {
                    if (this.currentMapWidthPixels !== entry.contentRect.width ||
                        this.currentMapHeightPixels !== entry.contentRect.height) {
                        this.calculateScaleAndOrigin();
                        // Se o mapa foi redimensionado, reposicionar todos os robôs
                        this.repositionAllRobotsFromCache();
                    }
                }
            }
        });
        resizeObserver.observe(this.mapImageElement);

        // Recalcula o fator de escala e origem quando a imagem é carregada (importante para o primeiro cálculo)
        this.mapImageElement.addEventListener('load', () => {
            if (this.options.debugMode) {
                console.log("Map image loaded, calculating scale and origin.");
            }
            this.calculateScaleAndOrigin();
            this.repositionAllRobotsFromCache(); // Carregar posições conhecidas após o mapa carregar
        });

        // Recalcula o fator de escala e origem E CARREGA POSIÇÕES quando a modal é completamente mostrada
        this.modalElement.addEventListener('shown.bs.modal', () => {
            if (this.options.debugMode) {
                console.log("Modal shown, recalculating scale and origin and loading cached positions.");
            }
            this.calculateScaleAndOrigin();
            this.repositionAllRobotsFromCache(); // Este é o ponto chave para carregar as posições ao abrir
        });

        // Opcional: Limpar ícones ao esconder a modal para evitar "fantasmas" se os robôs forem removidos
        this.modalElement.addEventListener('hidden.bs.modal', () => {
            // Se quiser que os ícones desapareçam ao fechar e só reapareçam com novas posições
            // Força a remoção de todos os ícones para que sejam recriados da cache na próxima abertura.
            // Isso pode ser útil se a lista de robôs muda frequentemente e você não quer ícones de robôs "offline".
            // No entanto, se os robôs permanecem ativos mas a modal é apenas fechada,
            // pode não querer apagar os ícones e apenas atualizar as posições.
            // Comentado por padrão para manter os ícones entre aberturas de modal, dependendo da necessidade.
            // Object.keys(this.robotIcons).forEach(robotId => this.removeRobotIcon(robotId));
        });
    }

    /**
     * Calcula os fatores de escala (pixels por milímetro) para X e Y independentemente
     * e os offsets (em pixels) para alinhar a origem (0,0) do robô.
     * @private
     */
    calculateScaleAndOrigin() {
        this.currentMapWidthPixels = this.mapImageElement.offsetWidth;
        this.currentMapHeightPixels = this.mapImageElement.offsetHeight;

        if (!this.options.mapWidthMM_full || !this.options.mapHeightMM_full ||
            !this.options.knownRobotPoint_MM || !this.options.knownRobotPoint_Px ||
            this.currentMapWidthPixels === 0 || this.currentMapHeightPixels === 0) {
            console.warn("RobotMapViewer: Faltam dados essenciais (dimensões totais do mapa, ponto de referência, ou imagem não carregada) para calcular escala e origem.");
            this.scaleFactorX = 0;
            this.scaleFactorY = 0;
            this.pixelOffsetX = 0;
            this.pixelOffsetY = 0;
            return;
        }

        const { x: robotMM_x, y: robotMM_y } = this.options.knownRobotPoint_MM;
        const { x: robotPx_x, y: robotPx_y } = this.options.knownRobotPoint_Px;

        // Calcula os fatores de escala baseados nas dimensões totais do mapa em MM
        // e nas dimensões atuais (renderizadas) da imagem em pixels.
        this.scaleFactorX = this.currentMapWidthPixels / this.options.mapWidthMM_full;
        this.scaleFactorY = this.currentMapHeightPixels / this.options.mapHeightMM_full;

        // Calcula os offsets em pixels para que o (0,0) do sistema MM do robô
        // seja mapeado corretamente.
        // Formula: Pixel_Coord = (MM_Coord * Scale_Factor) + Offset_Pixel
        // Então: Offset_Pixel = Pixel_Coord - (MM_Coord * Scale_Factor)
        this.pixelOffsetX = robotPx_x - (robotMM_x * this.scaleFactorX);
        this.pixelOffsetY = robotPx_y - (robotMM_y * this.scaleFactorY);


        if (this.options.debugMode) {
            console.log(`Map Rendered Pixels: ${this.currentMapWidthPixels}x${this.currentMapHeightPixels}`);
            console.log(`Map Full MM (Provided): ${this.options.mapWidthMM_full}x${this.options.mapHeightMM_full}`);
            console.log(`Known Robot Point: MM(${robotMM_x},${robotMM_y}) -> Px(${robotPx_x},${robotPx_y})`);
            console.log(`Calculated ScaleX: ${this.scaleFactorX.toFixed(8)} px/mm`);
            console.log(`Calculated ScaleY: ${this.scaleFactorY.toFixed(8)} px/mm`);
            console.log(`Calculated Pixel OffsetX (for robot 0,0 MM): ${this.pixelOffsetX.toFixed(3)} px`);
            console.log(`Calculated Pixel OffsetY (for robot 0,0 MM): ${this.pixelOffsetY.toFixed(3)} px`);
        }
    }

    /**
     * Converte coordenadas do robô em milímetros para coordenadas em pixels na imagem do mapa.
     * Considera as escalas X e Y independentes e os offsets calculados.
     * @param {number} x_mm - Posição X do robô em milímetros.
     * @param {number} y_mm - Posição Y do robô em milímetros.
     * @returns {{x_px: number, y_px: number}} As coordenadas X e Y em pixels.
     * @private
     */
    convertMmToPixels(x_mm, y_mm) {
        if (this.scaleFactorX === 0 || this.scaleFactorY === 0) {
            if (this.options.debugMode) {
                console.warn("RobotMapViewer: Fator de escala é zero. Verifique as dimensões do mapa e o ponto de referência.");
            }
            return { x_px: 0, y_px: 0 };
        }

        const x_px = (x_mm * this.scaleFactorX) + this.pixelOffsetX;
        const y_px = (y_mm * this.scaleFactorY) + this.pixelOffsetY;

        return { x_px, y_px };
    }

    /**
     * Cria (se não existir) ou obtém o elemento DOM do ícone de um robô específico.
     * Adiciona a classe CSS configurada (`robotIconClass`) e um ID único.
     * @param {string} robotId - O ID único do robô.
     * @returns {HTMLElement} O elemento DOM do ícone do robô.
     * @private
     */
    getOrCreateRobotIcon(robotId) {
        if (!this.robotIcons[robotId]) {
            if (this.options.debugMode) {
                console.log(`Creating icon for robot: ${robotId}`);
            }
            const iconElement = document.createElement('div');
            iconElement.id = `robot-icon-${robotId}`;
            iconElement.className = this.options.robotIconClass;
            iconElement.setAttribute('data-robot-id', robotId);

            const label = document.createElement('span');
            label.className = 'robot-label';
            label.innerText = robotId;
            iconElement.appendChild(label);

            this.robotIconsContainerElement.appendChild(iconElement);
            this.robotIcons[robotId] = iconElement;
        }
        return this.robotIcons[robotId];
    }

    /**
     * Remove um ícone de robô do mapa.
     * @param {string} robotId - O ID único do robô a ser removido.
     * @public
     */
    removeRobotIcon(robotId) {
        if (this.robotIcons[robotId]) {
            if (this.options.debugMode) {
                console.log(`Removing icon for robot: ${robotId}`);
            }
            this.robotIcons[robotId].remove();
            delete this.robotIcons[robotId];
            // NOVO: Remover também do cache
            delete this.lastKnownPositions[robotId];
        } else {
            if (this.options.debugMode) {
                console.warn(`Attempted to remove non-existent robot icon: ${robotId}`);
            }
        }
    }

    /**
     * Atualiza a posição e rotação de um robô específico no mapa.
     * Esta função também armazena a última posição conhecida.
     * @param {string} robotId - O ID único do robô.
     * @param {number} x_mm - A posição X do robô em milímetros.
     * @param {number} y_mm - A posição Y do robô em milímetros.
     * @param {number} [rotation_deg=0] - A rotação do robô em graus (0-360).
     * @public
     */
    updateRobotPosition(robotId, x_mm, y_mm, rotation_deg = 0) {
        // NOVO: Armazenar a última posição conhecida
        this.lastKnownPositions[robotId] = { x_mm, y_mm, rotation_deg };

        const robotIconElement = this.getOrCreateRobotIcon(robotId);
        if (!robotIconElement) return;

        const { x_px, y_px } = this.convertMmToPixels(x_mm, y_mm);

        robotIconElement.style.left = `${x_px}px`;
        robotIconElement.style.top = `${y_px}px`;
        robotIconElement.style.transform = `translate(-50%, -50%) rotate(${rotation_deg}deg)`;

        if (this.options.debugMode) {
             console.log(`Robot ${robotId} - MM: (${x_mm}, ${y_mm}) -> Pixels: (${x_px.toFixed(2)}, ${y_px.toFixed(2)}) Rotation: ${rotation_deg}`);
        }
    }

    /**
     * Reposiciona todos os robôs no mapa usando suas últimas posições conhecidas.
     * É chamado quando o mapa é carregado, redimensionado ou a modal é exibida.
     * @private
     */
    repositionAllRobotsFromCache() {
        if (this.options.debugMode) {
            console.log("Repositioning all robots from cache.");
        }
        for (const robotId in this.lastKnownPositions) {
            if (Object.hasOwnProperty.call(this.lastKnownPositions, robotId)) {
                const { x_mm, y_mm, rotation_deg } = this.lastKnownPositions[robotId];
                // Chamar updateRobotPosition, que recria o ícone se não existir
                this.updateRobotPosition(robotId, x_mm, y_mm, rotation_deg);
            }
        }
    }


    /**
     * Mostra a modal do mapa.
     * @public
     */
    showMapModal() {
        const modal = new bootstrap.Modal(this.modalElement);
        modal.show();
    }

    /**
     * Esconde a modal do mapa.
     * @public
     */
    hideMapModal() {
        const modal = bootstrap.Modal.getInstance(this.modalElement);
        if (modal) {
            modal.hide();
        }
    }
}

window.RobotMapViewer = RobotMapViewer;