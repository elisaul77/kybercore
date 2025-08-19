/**
 * Project Modal Component JavaScript
 * Maneja la funcionalidad del modal de vista detallada de proyectos
 */

console.log('📦 project_modal.js loaded at:', new Date().toISOString());

if (!window.ProjectModal) {
    window.ProjectModal = class ProjectModal {
        constructor() {
            console.log('🔧 ProjectModal constructor called');
            this.modal = null;
            this.modalTitle = null;
            this.modalContent = null;
            this.init();
        }

        init() {
            console.log('🚀 ProjectModal init() called');
            // Inicializar elementos del DOM
            this.modal = document.getElementById('stl-preview-modal');
            this.modalTitle = document.getElementById('modal-title');
            this.modalContent = document.getElementById('modal-content');
            
            console.log('🔍 Modal elements found:', {
                modal: !!this.modal,
                modalTitle: !!this.modalTitle,
                modalContent: !!this.modalContent
            });

            // Configurar event listeners
            this.setupEventListeners();
        }

    setupEventListeners() {
        // Limpiar listeners previos si existen
        if (this._closeHandler) {
            const oldCloseButton = document.getElementById('close-modal');
            if (oldCloseButton) {
                oldCloseButton.removeEventListener('click', this._closeHandler);
            }
        }
        if (this._modalClickHandler && this.modal) {
            this.modal.removeEventListener('click', this._modalClickHandler);
        }
        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
        }

        // Crear nuevos handlers
        this._closeHandler = () => {
            console.log('🔴 Close button clicked');
            this.close();
        };
        
        this._modalClickHandler = (e) => {
            if (e.target === this.modal) {
                console.log('🔴 Modal backdrop clicked');
                this.close();
            }
        };
        
        this._escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                console.log('🔴 Escape key pressed');
                this.close();
            }
        };

        // Cerrar modal con botón X
        const closeButton = document.getElementById('close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', this._closeHandler);
            console.log('✅ Close button listener attached');
        } else {
            console.warn('⚠️ Close button not found');
        }

        // Cerrar modal al hacer clic fuera del contenido
        if (this.modal) {
            this.modal.addEventListener('click', this._modalClickHandler);
            console.log('✅ Modal backdrop listener attached');
        }

        // Cerrar modal con tecla ESC
        document.addEventListener('keydown', this._escapeHandler);
        console.log('✅ Escape key listener attached');
    }

    open(projectData) {
        console.log('🚀 ProjectModal.open() called with data:', projectData);
        
        // Revalidar elementos del modal en caso de que el DOM haya cambiado
        this.modal = document.getElementById('stl-preview-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalContent = document.getElementById('modal-content');
        
        console.log('🔍 Modal elements revalidated:', {
            modal: !!this.modal,
            modalTitle: !!this.modalTitle,
            modalContent: !!this.modalContent,
            modalHidden: this.modal ? this.modal.classList.contains('hidden') : 'N/A'
        });
        
        if (!this.modal) {
            console.error('❌ Modal element not found, cannot open modal');
            return;
        }

        // Establecer título
        if (this.modalTitle && projectData.title) {
            this.modalTitle.textContent = projectData.title;
            console.log('📝 Modal title set to:', projectData.title);
        }

        // Reconfigurar event listeners con los elementos actualizados
        this.setupEventListeners();

        // Generar contenido del modal
        this.generateContent(projectData);

        // Mostrar modal con clases actualizadas
        this.modal.classList.remove('hidden');
        this.modal.style.display = 'flex'; // Forzar display flex
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        
        console.log('✅ Modal opened successfully, classes:', this.modal.className);
    }

    close() {
        console.log('🔴 Modal close() called');
        
        // Revalidar modal element en caso de cambios en el DOM
        if (!this.modal) {
            this.modal = document.getElementById('stl-preview-modal');
        }
        
        if (!this.modal) {
            console.warn('⚠️ Modal element not found for closing');
            return;
        }

        console.log('🔴 Closing modal...');
        this.modal.classList.add('hidden');
        this.modal.style.display = 'none'; // Forzar display none
        document.body.style.overflow = ''; // Restaurar scroll del body
        
        console.log('✅ Modal closed successfully');
    }

    isOpen() {
        return this.modal && !this.modal.classList.contains('hidden');
    }

    generateContent(projectData) {
        console.log('🎨 generateContent() called with:', projectData);
        if (!this.modalContent) {
            console.error('❌ Modal content element not found');
            return;
        }

        // Normalizar y asegurar campos mínimos
        const pd = projectData || {};
        const title = pd.title || pd.nombre || 'Proyecto sin título';
        const files = pd.files || pd.archivos || [];
        const stats = pd.stats || {
            pieces: (files.length ? `${files.length} piezas` : 'N/A'),
            totalTime: pd.aiAnalysis && pd.aiAnalysis.tiempo_estimado ? pd.aiAnalysis.tiempo_estimado : 'N/A',
            filament: pd.aiAnalysis && pd.aiAnalysis.filamento_total ? pd.aiAnalysis.filamento_total : 'N/A',
            cost: pd.aiAnalysis && pd.aiAnalysis.costo_estimado ? pd.aiAnalysis.costo_estimado : 'N/A',
            volume: pd.aiAnalysis && pd.aiAnalysis.volumen_total ? pd.aiAnalysis.volumen_total : 'N/A',
            created: pd.fecha_creacion || pd.created || 'N/A'
        };

        console.log('🔎 Using normalized project data for modal:', { title, filesLength: files.length, stats });

        const content = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Vista 3D / Imagen del proyecto -->
                <div class="space-y-4">
                    <div class="bg-gray-100 rounded-lg p-4 h-64 flex items-center justify-center">
                        <div class="text-center">
                            <div class="text-6xl mb-4">${pd.icon || projectData.icon || '📁'}</div>
                            <p class="text-gray-600">${title}</p>
                            <p class="text-sm text-gray-500 mt-2">Vista 3D del proyecto completo</p>
                        </div>
                    </div>

                    <!-- Lista de archivos STL -->
                    <div class="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <h4 class="font-medium text-gray-900 mb-3">📋 Archivos del Proyecto (${files.length})</h4>
                        <div class="space-y-2 text-sm">
                            ${this.generateFileList(files)}
                        </div>
                    </div>
                </div>

                <!-- Información detallada -->
                <div class="space-y-4">
                    <!-- Estadísticas del proyecto -->
                    <div class="bg-blue-50 rounded-lg p-4">
                        <h4 class="font-medium text-blue-900 mb-3">📊 Estadísticas del Proyecto</h4>
                        <div class="grid grid-cols-2 gap-4 text-sm text-blue-800">
                            ${this.generateStats(stats)}
                        </div>
                    </div>

                    <!-- Análisis de IA -->
                    <div class="bg-blue-50 rounded-lg p-4">
                        <h4 class="font-medium text-blue-900 mb-2">🤖 Planificación IA del Proyecto</h4>
                        <div class="space-y-2 text-sm text-blue-800">
                            ${this.generateAIAnalysis(pd.aiAnalysis || pd.analisis_ia || {})}
                        </div>
                    </div>

                    <!-- Estado del proyecto -->
                    <div class="bg-green-50 rounded-lg p-4">
                        <h4 class="font-medium text-green-900 mb-2">✅ Estado del Proyecto</h4>
                        <div class="space-y-1 text-sm text-green-800">
                            ${this.generateStatus(pd.status || {})}
                        </div>
                    </div>

                    <!-- Botones de acción -->
                    <div class="grid grid-cols-3 gap-2">
                        <button onclick="printProject('${projectData.id}')" class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors text-sm">
                            🚀 Imprimir
                        </button>
                        <button onclick="scheduleProject('${projectData.id}')" class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-colors text-sm">
                            📋 Planificar
                        </button>
                        <button data-action="export" data-project-id="${projectData.id}" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                            📥 Exportar
                        </button>
                        <button data-action="duplicate" data-project-id="${projectData.id}" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                            📋 Duplicar
                        </button>
                        <button data-action="delete" data-project-id="${projectData.id}" class="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm">
                            🗑️ Eliminar
                        </button>
                        <button data-action="favorite" data-project-id="${projectData.id}" class="bg-white text-yellow-400 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                            ⭐ Favorito
                        </button>
                        <button onclick="editProject('${projectData.id}')" class="col-span-3 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                            📝 Editar
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.modalContent.innerHTML = content;
        console.log('🎉 Modal content generated and inserted successfully');
    }

    generateFileList(files) {
        if (!files.length) {
            return '<p class="text-gray-500 italic">No hay archivos en este proyecto</p>';
        }

        console.log('🔍 generateFileList received files:', files);
        return files.map(file => {
            console.log('🔎 file entry:', file);
            // Normalizar posibles campos de nombre
            const filename = file.nombre || file.name || file.filename || file.fileName || file.title || file.nombre_archivo || 'Sin nombre';
            // Normalizar posibles campos de tamaño
            const filesize = file.tamaño || file.size || file.tamano || file.size_human || file.sizeHuman || file.sizeBytes || 'N/A';
            // Normalizar validez
            const validated = (typeof file.validated !== 'undefined') ? file.validated : ((typeof file.valid !== 'undefined') ? file.valid : ((typeof file.validar !== 'undefined') ? file.validar : false));

            return `
            <div class="flex justify-between items-center p-2 bg-white rounded border">
                <span>${filename}</span>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500">${filesize}</span>
                    <span class="text-${validated ? 'green' : 'yellow'}-600">${validated ? '✓' : '⚠️'}</span>
                </div>
            </div>
        `;
        }).join('');
    }

    generateStats(stats) {
        const defaultStats = {
            pieces: 'N/A',
            totalTime: 'N/A',
            filament: 'N/A',
            cost: 'N/A',
            volume: 'N/A',
            created: 'N/A'
        };

        const projectStats = { ...defaultStats, ...stats };

        return `
            <div class="flex justify-between">
                <span>Piezas totales:</span>
                <span>${projectStats.pieces}</span>
            </div>
            <div class="flex justify-between">
                <span>Tiempo estimado:</span>
                <span>${projectStats.totalTime}</span>
            </div>
            <div class="flex justify-between">
                <span>Filamento:</span>
                <span>${projectStats.filament}</span>
            </div>
            <div class="flex justify-between">
                <span>Costo estimado:</span>
                <span>${projectStats.cost}</span>
            </div>
            <div class="flex justify-between">
                <span>Volumen total:</span>
                <span>${projectStats.volume}</span>
            </div>
            <div class="flex justify-between">
                <span>Fecha creación:</span>
                <span>${projectStats.created}</span>
            </div>
        `;
    }

    generateAIAnalysis(analysis) {
        const defaultAnalysis = {
            sequence: 'Análisis pendiente',
            parallelization: 'Por determinar',
            materials: 'Por analizar',
            postProcessing: 'No especificado',
            estimatedTime: 'Calculando...'
        };

        const aiData = { ...defaultAnalysis, ...analysis };

        return `
            <p>• <strong>Secuencia optimizada:</strong> ${aiData.sequence}</p>
            <p>• <strong>Paralelización:</strong> ${aiData.parallelization}</p>
            <p>• <strong>Materiales:</strong> ${aiData.materials}</p>
            <p>• <strong>Post-procesado:</strong> ${aiData.postProcessing}</p>
            <p>• <strong>Tiempo estimado:</strong> ${aiData.estimatedTime}</p>
        `;
    }

    generateStatus(status) {
        const defaultStatus = [
            'Estado del proyecto por determinar',
            'Análisis pendiente',
            'Validación requerida'
        ];

        const statusList = status.items || defaultStatus;

        return statusList.map(item => `<p>• ${item}</p>`).join('');
    }
    };
}

// Funciones globales para acciones del modal
function printProject(projectId) {
    showToast('Impresión', `Iniciando impresión del proyecto ${projectId}...`, 'info');
    setTimeout(() => {
        showToast('Impresión Iniciada', 'El proyecto se ha agregado a la cola de impresión', 'success');
        if (window.projectModal) {
            window.projectModal.close();
        }
    }, 2000);
}

function scheduleProject(projectId) {
    showToast('Planificación', `Agregando proyecto ${projectId} a la cola...`, 'info');
    setTimeout(() => {
        showToast('Proyecto Planificado', 'El proyecto se ha agregado a la cola de planificación', 'success');
    }, 1500);
}

function editProject(projectId) {
    showToast('Editor', `Abriendo editor para proyecto ${projectId}...`, 'info');
    setTimeout(() => {
        showToast('Editor Abierto', 'Redirigiendo al editor de proyectos', 'success');
    }, 1000);
}

// Función para inicializar el modal
function initProjectModal() {
    if (!window.projectModal) {
        console.log('🚀 Initializing ProjectModal...');
        try {
            window.projectModal = new ProjectModal();
            console.log('✅ ProjectModal initialized successfully:', !!window.projectModal);
        } catch (error) {
            console.error('❌ Failed to initialize ProjectModal:', error);
        }
    } else {
        console.log('⚠️ ProjectModal already initialized');
    }
    
    // Verificar que el modal funciona
    if (window.projectModal && typeof window.projectModal.open === 'function') {
        console.log('✅ ProjectModal is ready and functional');
    } else {
        console.error('❌ ProjectModal initialization failed or is not functional');
    }
}

// Inicializar inmediatamente si el DOM está listo, o esperar si no
if (document.readyState === 'loading') {
    console.log('⏳ DOM still loading, waiting for DOMContentLoaded for ProjectModal...');
    document.addEventListener('DOMContentLoaded', initProjectModal);
} else {
    console.log('✅ DOM already loaded, initializing ProjectModal immediately');
    initProjectModal();
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectModal;
}
