/**
 * Project Modal Component JavaScript
 * Maneja la funcionalidad del modal de vista detallada de proyectos
 */

class ProjectModal {
    constructor() {
        this.modal = null;
        this.modalTitle = null;
        this.modalContent = null;
        this.init();
    }

    init() {
        // Inicializar elementos del DOM
        this.modal = document.getElementById('stl-preview-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalContent = document.getElementById('modal-content');

        // Configurar event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Cerrar modal con botón X
        const closeButton = document.getElementById('close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }

        // Cerrar modal al hacer clic fuera del contenido
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }

        // Cerrar modal con tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    }

    open(projectData) {
        if (!this.modal) return;

        // Establecer título
        if (this.modalTitle && projectData.title) {
            this.modalTitle.textContent = projectData.title;
        }

        // Generar contenido del modal
        this.generateContent(projectData);

        // Mostrar modal
        this.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
    }

    close() {
        if (!this.modal) return;

        this.modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restaurar scroll del body
    }

    isOpen() {
        return this.modal && !this.modal.classList.contains('hidden');
    }

    generateContent(projectData) {
        if (!this.modalContent) return;

        const content = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Vista 3D / Imagen del proyecto -->
                <div class="space-y-4">
                    <div class="bg-gray-100 rounded-lg p-4 h-64 flex items-center justify-center">
                        <div class="text-center">
                            <div class="text-6xl mb-4">${projectData.icon || '📁'}</div>
                            <p class="text-gray-600">${projectData.title}</p>
                            <p class="text-sm text-gray-500 mt-2">Vista 3D del proyecto completo</p>
                        </div>
                    </div>

                    <!-- Lista de archivos STL -->
                    <div class="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <h4 class="font-medium text-gray-900 mb-3">📋 Archivos del Proyecto</h4>
                        <div class="space-y-2 text-sm">
                            ${this.generateFileList(projectData.files || [])}
                        </div>
                    </div>
                </div>

                <!-- Información detallada -->
                <div class="space-y-4">
                    <!-- Estadísticas del proyecto -->
                    <div class="bg-blue-50 rounded-lg p-4">
                        <h4 class="font-medium text-blue-900 mb-3">📊 Estadísticas del Proyecto</h4>
                        <div class="grid grid-cols-2 gap-4 text-sm text-blue-800">
                            ${this.generateStats(projectData.stats || {})}
                        </div>
                    </div>

                    <!-- Análisis de IA -->
                    <div class="bg-blue-50 rounded-lg p-4">
                        <h4 class="font-medium text-blue-900 mb-2">🤖 Planificación IA del Proyecto</h4>
                        <div class="space-y-2 text-sm text-blue-800">
                            ${this.generateAIAnalysis(projectData.aiAnalysis || {})}
                        </div>
                    </div>

                    <!-- Estado del proyecto -->
                    <div class="bg-green-50 rounded-lg p-4">
                        <h4 class="font-medium text-green-900 mb-2">✅ Estado del Proyecto</h4>
                        <div class="space-y-1 text-sm text-green-800">
                            ${this.generateStatus(projectData.status || {})}
                        </div>
                    </div>

                    <!-- Botones de acción -->
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="printProject('${projectData.id}')" class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors text-sm">
                            🚀 Imprimir Proyecto
                        </button>
                        <button onclick="scheduleProject('${projectData.id}')" class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-colors text-sm">
                            📋 Planificar Cola
                        </button>
                        <button onclick="exportProject('${projectData.title}')" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                            📥 Exportar
                        </button>
                        <button onclick="editProject('${projectData.id}')" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                            📝 Editar
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.modalContent.innerHTML = content;
    }

    generateFileList(files) {
        if (!files.length) {
            return '<p class="text-gray-500 italic">No hay archivos en este proyecto</p>';
        }

        return files.map(file => `
            <div class="flex justify-between items-center p-2 bg-white rounded border">
                <span>${file.name}</span>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500">${file.size || 'N/A'}</span>
                    <span class="text-green-600">${file.validated ? '✓' : '⚠️'}</span>
                </div>
            </div>
        `).join('');
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
}

// Funciones globales para acciones del modal
function printProject(projectId) {
    showToast('Impresión', `Iniciando impresión del proyecto ${projectId}...`, 'info');
    setTimeout(() => {
        showToast('Impresión Iniciada', 'El proyecto se ha agregado a la cola de impresión', 'success');
        projectModal.close();
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

// Inicializar el modal cuando el DOM esté listo
let projectModal;
document.addEventListener('DOMContentLoaded', function() {
    projectModal = new ProjectModal();
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectModal;
}
