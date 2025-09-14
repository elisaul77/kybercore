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
async function printProject(projectId) {
    try {
        showToast('Impresión', `Iniciando flujo de impresión para proyecto ${projectId}...`, 'info');
        
        // Llamar al endpoint para iniciar el flujo de impresión
        const response = await fetch(`/api/print/start/${projectId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Flujo Iniciado', 'Redirigiendo al asistente de impresión...', 'success');
            
            // Cerrar el modal actual
            projectModal.close();
            
            // Abrir el asistente de flujo de impresión
            setTimeout(() => {
                openPrintFlowWizard(result.flow_id, projectId, result.status);
            }, 1000);
            
        } else {
            showToast('Error', result.message || 'No se pudo iniciar el flujo de impresión', 'error');
        }
        
    } catch (error) {
        console.error('Error iniciando flujo de impresión:', error);
        showToast('Error', 'Error de conexión. Verifica que el servidor esté funcionando.', 'error');
    }
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

// ===============================
// ASISTENTE DE FLUJO DE IMPRESIÓN
// ===============================

function openPrintFlowWizard(flowId, projectId, initialStatus) {
    console.log('🚀 Abriendo wizard de flujo de impresión:', { flowId, projectId, initialStatus });
    
    // Inicializar una nueva sesión de wizard
    currentWizardSessionId = generateSessionId();
    console.log('🎯 Nueva sesión de wizard iniciada:', currentWizardSessionId);
    
    // Crear el contenedor del wizard si no existe
    let wizardContainer = document.getElementById('print-flow-wizard');
    if (!wizardContainer) {
        wizardContainer = document.createElement('div');
        wizardContainer.id = 'print-flow-wizard';
        wizardContainer.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 hidden';
        wizardContainer.style.zIndex = '10000'; // Más alto que el modal de proyecto
        document.body.appendChild(wizardContainer);
    }
    
    // Mostrar el wizard
    wizardContainer.classList.remove('hidden');
    
    // Determinar el paso inicial - comenzar siempre con piece_selection
    const currentStep = 'piece_selection';
    const statusData = {
        current_step: currentStep,
        completed_steps: [],
        data: { 
            project_name: 'Proyecto de Impresión',
            project_id: projectId 
        }
    };
    
    console.log('📋 Iniciando con paso:', currentStep);
    
    // Cargar el primer paso del flujo
    loadPrintFlowStep(flowId, projectId, currentStep, statusData);
}

// Función auxiliar para generar ID de sesión
function generateSessionId() {
    return 'wizard_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Función para obtener el estado actual de la sesión del wizard
async function getCurrentWizardSessionState() {
    if (!currentWizardSessionId) {
        return null;
    }

    try {
        const response = await fetch(`/api/print/session-state/${currentWizardSessionId}`);
        if (response.ok) {
            const data = await response.json();
            return data.session_data || null;
        }
    } catch (error) {
        console.error('Error obteniendo estado de sesión:', error);
    }
    return null;
}

async function loadPrintFlowStep(flowId, projectId, step, status) {
    console.log('📋 Cargando paso del wizard:', { flowId, projectId, step, status });
    
    const wizardContainer = document.getElementById('print-flow-wizard');
    if (!wizardContainer) {
        console.error('❌ Contenedor del wizard no encontrado');
        return;
    }
    
    try {
        let stepContent = '';
        console.log('🔄 Determinando contenido para paso:', step);
        
        switch(step) {
            case 'piece_selection':
                console.log('📁 Cargando selección de piezas');
                stepContent = await loadPieceSelectionStep(projectId);
                break;
            case 'material_selection':
                stepContent = await loadMaterialSelectionStep();
                break;
            case 'production_mode':
                stepContent = await loadProductionModeStep();
                break;
            case 'printer_assignment':
                stepContent = await loadPrinterAssignmentStep();
                break;
            case 'stl_processing':
                stepContent = await loadSTLProcessingStep();
                break;
            case 'validation':
                stepContent = await loadValidationStep();
                break;
            case 'confirmation':
                stepContent = await loadConfirmationStep();
                break;
            case 'monitoring':
                stepContent = await loadMonitoringStep();
                break;
            default:
                stepContent = generatePlaceholderStep(step);
        }
        
        // Crear el wrapper del wizard con navegación responsiva optimizada
        wizardContainer.innerHTML = `
            <div class="bg-white rounded-2xl w-full max-w-4xl h-full max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl">
                <!-- Header del wizard -->
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg sm:text-xl font-bold text-white">🖨️ Asistente de Impresión</h2>
                        <button onclick="closePrintFlowWizard()" class="text-white hover:text-gray-200 transition-colors">
                            <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="mt-2 text-blue-100 text-xs sm:text-sm">
                        Proyecto: ${status.data.project_name} | Paso: ${getStepLabel(step)}
                    </div>
                </div>
                
                <!-- Progreso del wizard -->
                <div class="px-4 sm:px-6 py-2 sm:py-3 border-b border-gray-200 flex-shrink-0">
                    ${generateProgressIndicator(step, status.completed_steps)}
                </div>
                
                <!-- Contenido del paso actual - ahora flex-grow para ocupar espacio disponible -->
                <div class="p-4 sm:p-6 overflow-y-auto flex-grow">
                    ${stepContent}
                </div>
                
                <!-- Footer con navegación - siempre visible -->
                <div class="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 flex-shrink-0">
                    <div class="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
                        <button onclick="previousPrintFlowStep()" class="px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm sm:text-base order-2 sm:order-1" ${step === 'piece_selection' ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                            ← Anterior
                        </button>
                        <div id="wizard-actions" class="flex gap-2 flex-wrap justify-center sm:justify-end order-1 sm:order-2">
                            <!-- Los botones se cargan específicamente para cada paso -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error cargando paso del wizard:', error);
        wizardContainer.innerHTML = `
            <div class="bg-white rounded-2xl p-6 max-w-md">
                <div class="text-center">
                    <div class="text-red-500 text-4xl mb-4">❌</div>
                    <h3 class="text-lg font-bold text-gray-900 mb-2">Error</h3>
                    <p class="text-gray-600 mb-4">No se pudo cargar el paso del asistente</p>
                    <button onclick="closePrintFlowWizard()" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
    }
}

async function loadPieceSelectionStep(projectId) {
    const response = await fetch(`/api/print/piece-selection/${projectId}`);
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.message || 'Error cargando selección de piezas');
    }
    
    // Actualizar los botones de acción del wizard
    setTimeout(() => {
        const actionsContainer = document.getElementById('wizard-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button onclick="selectAllPieces('${projectId}')" class="bg-blue-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap">
                    📋 <span class="hidden sm:inline">Todas las piezas</span><span class="sm:hidden">Todas</span>
                </button>
                <button onclick="selectSpecificPieces('${projectId}')" class="bg-purple-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-purple-600 transition-colors whitespace-nowrap">
                    🎯 <span class="hidden sm:inline">Seleccionar específicas</span><span class="sm:hidden">Específicas</span>
                </button>
            `;
        }
    }, 100);
    
    return `
        <div class="space-y-6">
            <div class="text-center">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">📦 Seleccionar Piezas</h3>
                <p class="text-gray-600">Elige qué piezas del proyecto quieres imprimir</p>
            </div>
            
            <!-- Resumen del proyecto -->
            <div class="bg-blue-50 rounded-lg p-4">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">${data.project_info.total_pieces}</div>
                        <div class="text-blue-800">Piezas totales</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">${data.summary.total_estimated_time_hours}h</div>
                        <div class="text-blue-800">Tiempo estimado</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">${data.summary.total_estimated_filament_grams}g</div>
                        <div class="text-blue-800">Filamento</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">${data.summary.total_volume_cm3}cm³</div>
                        <div class="text-blue-800">Volumen</div>
                    </div>
                </div>
            </div>
            
            <!-- Opciones de selección -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="border-2 border-blue-200 rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-colors" onclick="selectAllPieces('${projectId}')">
                    <div class="text-center">
                        <div class="text-3xl mb-2">📋</div>
                        <h4 class="font-bold text-gray-900 mb-2">${data.selection_options.all_pieces.label}</h4>
                        <p class="text-gray-600 text-sm">${data.selection_options.all_pieces.description}</p>
                    </div>
                </div>
                
                <div class="border-2 border-purple-200 rounded-lg p-4 hover:border-purple-400 cursor-pointer transition-colors" onclick="selectSpecificPieces('${projectId}')">
                    <div class="text-center">
                        <div class="text-3xl mb-2">🎯</div>
                        <h4 class="font-bold text-gray-900 mb-2">${data.selection_options.specific_pieces.label}</h4>
                        <p class="text-gray-600 text-sm">${data.selection_options.specific_pieces.description}</p>
                    </div>
                </div>
            </div>
            
            <!-- Lista de piezas -->
            <div class="space-y-2">
                <h4 class="font-medium text-gray-900">Piezas disponibles:</h4>
                <div class="max-h-64 overflow-y-auto space-y-2">
                    ${data.pieces.map(piece => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <input type="checkbox" id="piece_${piece.filename}" name="selected_pieces" value="${piece.filename}" 
                                       class="w-4 h-4 text-blue-600 rounded">
                                <label for="piece_${piece.filename}" class="font-medium text-gray-900">${piece.filename}</label>
                            </div>
                            <div class="text-sm text-gray-600">
                                ${piece.estimated_time_minutes}min | ${piece.estimated_filament_grams}g
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

async function selectAllPieces(projectId) {
    try {
        showToast('Procesando', 'Seleccionando todas las piezas...', 'info');
        
        const response = await fetch('/api/print/select-pieces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId,
                selected_pieces: [],
                select_all: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Selección Confirmada', `${result.selection_summary.total_pieces} piezas seleccionadas`, 'success');
            
            // Avanzar al siguiente paso
            setTimeout(() => {
                loadPrintFlowStep(null, projectId, result.next_step.step, { 
                    completed_steps: ['piece_selection'],
                    data: { project_name: 'Proyecto', ...result.selection_summary }
                });
            }, 1000);
        } else {
            showToast('Error', result.message || 'Error en la selección', 'error');
        }
        
    } catch (error) {
        console.error('Error seleccionando piezas:', error);
        showToast('Error', 'Error de conexión', 'error');
    }
}

function selectSpecificPieces(projectId) {
    // Obtener piezas seleccionadas de los checkboxes
    const selectedCheckboxes = document.querySelectorAll('input[name="selected_pieces"]:checked');
    const selectedPieces = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (selectedPieces.length === 0) {
        showToast('Atención', 'Selecciona al menos una pieza', 'warning');
        return;
    }
    
    // Llamar al endpoint con la selección específica
    confirmPieceSelection(projectId, selectedPieces, false);
}

async function confirmPieceSelection(projectId, selectedPieces, selectAll) {
    try {
        showToast('Procesando', 'Confirmando selección...', 'info');
        
        const response = await fetch('/api/print/select-pieces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId,
                selected_pieces: selectedPieces,
                select_all: selectAll
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Capturar session_id del backend
            currentWizardSessionId = result.session_id;
            console.log('🔑 Session ID capturado:', currentWizardSessionId);
            
            showToast('Selección Confirmada', `${result.selection_summary.total_pieces} piezas seleccionadas`, 'success');
            
            // Avanzar al siguiente paso
            setTimeout(() => {
                loadPrintFlowStep(null, projectId, result.next_step.step, { 
                    completed_steps: ['piece_selection'],
                    data: { project_name: 'Proyecto', ...result.selection_summary }
                });
            }, 1000);
        } else {
            showToast('Error', result.message || 'Error en la selección', 'error');
        }
        
    } catch (error) {
        console.error('Error confirmando selección:', error);
        showToast('Error', 'Error de conexión', 'error');
    }
}

async function loadMaterialSelectionStep() {
    const response = await fetch('/api/print/material-selection');
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.message || 'Error cargando materiales');
    }
    
    // Actualizar botones de acción
    setTimeout(() => {
        const actionsContainer = document.getElementById('wizard-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button onclick="validateSelectedMaterial()" class="bg-green-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-green-600 transition-colors whitespace-nowrap">
                    ✅ <span class="hidden sm:inline">Validar Material</span><span class="sm:hidden">Validar</span>
                </button>
            `;
        }
    }, 100);
    
    return `
        <div class="space-y-6">
            <div class="text-center">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">🧪 Selección de Material</h3>
                <p class="text-gray-600">Elige el material para tu impresión</p>
            </div>
            
            <!-- Recomendaciones -->
            <div class="bg-yellow-50 rounded-lg p-4">
                <h4 class="font-medium text-yellow-800 mb-2">💡 Recomendaciones</h4>
                <div class="text-sm text-yellow-700 space-y-1">
                    <p><strong>Prototipos:</strong> ${data.recommendations.for_prototypes}</p>
                    <p><strong>Funcional:</strong> ${data.recommendations.for_functional}</p>
                    <p><strong>Industrial:</strong> ${data.recommendations.for_industrial}</p>
                </div>
            </div>
            
            <!-- Lista de materiales -->
            <div class="space-y-4">
                ${data.materials.map(material => `
                    <div class="border rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-colors material-option" 
                         onclick="selectMaterial('${material.tipo}', '${material.color}', '${material.marca}')"
                         data-material-type="${material.tipo}" data-color="${material.color}" data-brand="${material.marca}">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <input type="radio" name="selected_material" value="${material.id}" class="w-4 h-4 text-blue-600">
                                <div>
                                    <h4 class="font-medium text-gray-900">${material.tipo} ${material.color}</h4>
                                    <p class="text-sm text-gray-600">${material.marca} | €${material.precio_por_kg}/kg</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="flex items-center space-x-2">
                                    <span class="text-sm font-medium ${
                                        material.stock_status === 'disponible' ? 'text-green-600' : 
                                        material.stock_status === 'stock_limitado' ? 'text-yellow-600' : 'text-red-600'
                                    }">
                                        ${material.stock_actual}g disponible
                                    </span>
                                    <div class="w-2 h-2 rounded-full ${
                                        material.stock_status === 'disponible' ? 'bg-green-500' : 
                                        material.stock_status === 'stock_limitado' ? 'bg-yellow-500' : 'bg-red-500'
                                    }"></div>
                                </div>
                                <div class="text-xs text-gray-500 mt-1">
                                    ${material.recomendado_para.join(', ')}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function loadProductionModeStep() {
    const response = await fetch('/api/print/production-modes');
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.message || 'Error cargando modos de producción');
    }
    
    // Actualizar botones de acción
    setTimeout(() => {
        const actionsContainer = document.getElementById('wizard-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button onclick="confirmProductionMode()" class="bg-blue-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap">
                    🏭 <span class="hidden sm:inline">Configurar Modo</span><span class="sm:hidden">Configurar</span>
                </button>
            `;
        }
    }, 100);
    
    return `
        <div class="space-y-6">
            <div class="text-center">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">🏭 Configuración de Producción</h3>
                <p class="text-gray-600">Selecciona el modo y prioridad para tu impresión</p>
            </div>
            
            <!-- Modos de producción -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="border-2 border-blue-200 rounded-lg p-4 cursor-pointer transition-colors production-mode-option" 
                     onclick="selectProductionMode('prototype')" data-mode="prototype">
                    <div class="text-center mb-4">
                        <div class="text-4xl mb-2">🔬</div>
                        <h4 class="font-bold text-gray-900 mb-2">${data.production_modes.prototype.label}</h4>
                        <p class="text-gray-600 text-sm">${data.production_modes.prototype.description}</p>
                    </div>
                    <div class="text-xs text-gray-500">
                        <strong>Características:</strong>
                        <ul class="mt-1 space-y-1">
                            ${data.production_modes.prototype.characteristics.map(char => `<li>• ${char}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="border-2 border-purple-200 rounded-lg p-4 cursor-pointer transition-colors production-mode-option" 
                     onclick="selectProductionMode('factory')" data-mode="factory">
                    <div class="text-center mb-4">
                        <div class="text-4xl mb-2">🏭</div>
                        <h4 class="font-bold text-gray-900 mb-2">${data.production_modes.factory.label}</h4>
                        <p class="text-gray-600 text-sm">${data.production_modes.factory.description}</p>
                    </div>
                    <div class="text-xs text-gray-500">
                        <strong>Características:</strong>
                        <ul class="mt-1 space-y-1">
                            ${data.production_modes.factory.characteristics.map(char => `<li>• ${char}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Configuraciones de prioridad -->
            <div id="priority-selection" class="hidden">
                <h4 class="font-medium text-gray-900 mb-3">Configuraciones de Prioridad:</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3" id="priority-options">
                    <!-- Se cargan dinámicamente según el modo seleccionado -->
                </div>
            </div>
            
            <!-- Configuración seleccionada -->
            <div id="selected-configuration" class="hidden bg-blue-50 rounded-lg p-4">
                <h4 class="font-medium text-blue-900 mb-2">Configuración Seleccionada:</h4>
                <div id="config-details"></div>
            </div>
        </div>
    `;
}

async function loadPrinterAssignmentStep() {
    const response = await fetch('/api/print/available-printers');
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.message || 'Error cargando impresoras');
    }
    
    // Actualizar botones de acción
    setTimeout(() => {
        const actionsContainer = document.getElementById('wizard-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button onclick="assignSelectedPrinter()" class="bg-green-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-green-600 transition-colors whitespace-nowrap">
                    🖨️ <span class="hidden sm:inline">Asignar Impresora</span><span class="sm:hidden">Asignar</span>
                </button>
            `;
        }
    }, 100);
    
    return `
        <div class="space-y-6">
            <div class="text-center">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">🖨️ Asignación de Impresora</h3>
                <p class="text-gray-600">Selecciona la impresora para tu trabajo</p>
            </div>
            
            <!-- Opciones de asignación -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="border-2 border-blue-200 rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-colors">
                    <div class="text-center">
                        <div class="text-3xl mb-2">👤</div>
                        <h4 class="font-bold text-gray-900 mb-2">${data.assignment_options.manual.label}</h4>
                        <p class="text-gray-600 text-sm">${data.assignment_options.manual.description}</p>
                    </div>
                </div>
                
                <div class="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 cursor-not-allowed">
                    <div class="text-center opacity-50">
                        <div class="text-3xl mb-2">🤖</div>
                        <h4 class="font-bold text-gray-900 mb-2">${data.assignment_options.automatic.label}</h4>
                        <p class="text-gray-600 text-sm">${data.assignment_options.automatic.description}</p>
                        <p class="text-xs text-red-500 mt-2">No disponible en esta versión</p>
                    </div>
                </div>
            </div>
            
            <!-- Impresoras disponibles -->
            <div class="space-y-4">
                <h4 class="font-medium text-gray-900">Impresoras Disponibles:</h4>
                ${data.printers.available.map(printer => `
                    <div class="border rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-colors printer-option" 
                         onclick="selectPrinter('${printer.id}')" data-printer-id="${printer.id}">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <input type="radio" name="selected_printer" value="${printer.id}" class="w-4 h-4 text-blue-600">
                                <div>
                                    <h4 class="font-medium text-gray-900">${printer.nombre}</h4>
                                    <p class="text-sm text-gray-600">${printer.model} | ${printer.location}</p>
                                    <p class="text-xs text-gray-500">IP: ${printer.ip}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="flex items-center space-x-2 mb-2">
                                    <span class="text-sm font-medium text-green-600">Disponible</span>
                                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                                </div>
                                <div class="text-xs text-gray-500">
                                    ${printer.capacidades.volumen_impresion.x}×${printer.capacidades.volumen_impresion.y}×${printer.capacidades.volumen_impresion.z}mm
                                </div>
                                <div class="text-xs text-gray-500">
                                    Score: ${printer.suitability_score}
                                </div>
                            </div>
                        </div>
                        <div class="mt-3 text-xs text-gray-500">
                            <strong>Materiales soportados:</strong> ${printer.capacidades.materiales_soportados.join(', ')}
                        </div>
                    </div>
                `).join('')}
                
                ${data.printers.busy.length > 0 ? `
                    <div class="mt-6">
                        <h4 class="font-medium text-gray-900 mb-3">Impresoras Ocupadas:</h4>
                        ${data.printers.busy.map(printer => `
                            <div class="border rounded-lg p-4 bg-gray-50 opacity-60">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-4">
                                        <div class="w-4 h-4 bg-gray-300 rounded"></div>
                                        <div>
                                            <h4 class="font-medium text-gray-700">${printer.nombre}</h4>
                                            <p class="text-sm text-gray-500">${printer.model} | ${printer.location}</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="flex items-center space-x-2 mb-2">
                                            <span class="text-sm font-medium text-orange-600">Ocupada</span>
                                            <div class="w-2 h-2 rounded-full bg-orange-500"></div>
                                        </div>
                                        <div class="text-xs text-gray-500">
                                            Disponible: ${printer.estimated_availability}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            <!-- Recomendaciones -->
            ${data.recommendations.best_for_speed ? `
                <div class="bg-green-50 rounded-lg p-4">
                    <h4 class="font-medium text-green-800 mb-2">💡 Recomendación IA</h4>
                    <p class="text-sm text-green-700">
                        Para tu configuración actual, se recomienda: <strong>${data.recommendations.best_for_speed.nombre}</strong>
                    </p>
                </div>
            ` : ''}
        </div>
    `;
}

let selectedMaterialData = null;
let currentWizardSessionId = null;  // Variable global para el session_id del wizard

function selectMaterial(tipo, color, marca) {
    // Actualizar selección visual
    document.querySelectorAll('.material-option').forEach(el => {
        el.classList.remove('border-blue-400', 'bg-blue-50');
    });
    
    const selectedOption = document.querySelector(`[data-material-type="${tipo}"][data-color="${color}"][data-brand="${marca}"]`);
    if (selectedOption) {
        selectedOption.classList.add('border-blue-400', 'bg-blue-50');
        selectedOption.querySelector('input[type="radio"]').checked = true;
    }
    
    selectedMaterialData = { tipo, color, marca };
}

async function validateSelectedMaterial() {
    if (!selectedMaterialData) {
        showToast('Atención', 'Selecciona un material primero', 'warning');
        return;
    }
    
    if (!currentWizardSessionId) {
        showToast('Error', 'Sesión no válida', 'error');
        return;
    }
    
    try {
        showToast('Validando', 'Verificando disponibilidad del material...', 'info');
        
        const response = await fetch('/api/print/validate-material', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                material_type: selectedMaterialData.tipo,
                color: selectedMaterialData.color,
                brand: selectedMaterialData.marca,
                quantity_needed: 150, // Mock quantity - se calculará dinámicamente más adelante
                session_id: currentWizardSessionId  // Incluir session_id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Material Validado', `€${result.validation.estimated_cost} estimado`, 'success');
            
            setTimeout(() => {
                loadPrintFlowStep(null, null, result.next_step.step, { 
                    completed_steps: ['piece_selection', 'material_selection'],
                    data: { material_data: result.validation }
                });
            }, 1000);
        } else {
            // Mostrar opciones en caso de stock insuficiente
            showMaterialValidationError(result);
        }
        
    } catch (error) {
        console.error('Error validando material:', error);
        showToast('Error', 'Error validando material', 'error');
    }
}

function showMaterialValidationError(result) {
    const wizardContainer = document.querySelector('#print-flow-wizard .overflow-y-auto');
    
    const errorContent = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div class="flex items-center mb-2">
                <div class="text-red-500 text-xl mr-2">⚠️</div>
                <h4 class="font-medium text-red-800">Stock Insuficiente</h4>
            </div>
            <p class="text-red-700 text-sm mb-4">
                Stock actual: ${result.validation.current_stock}g | Necesario: ${result.validation.needed_quantity}g
            </p>
            <div class="space-y-2">
                ${result.alternatives.map(alt => `
                    <button onclick="selectAlternativeMaterial('${alt.material.tipo}', '${alt.material.color}', '${alt.material.marca}')"
                            class="w-full text-left p-3 bg-white border rounded hover:border-blue-400 transition-colors">
                        <div class="font-medium">${alt.material.tipo} ${alt.material.color} - ${alt.material.marca}</div>
                        <div class="text-sm text-gray-600">${alt.material.stock_actual}g disponible</div>
                    </button>
                `).join('')}
                <button onclick="generatePurchaseOrder()" class="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                    🛒 Generar Orden de Compra (${result.actions.purchase_order.estimated_delivery})
                </button>
            </div>
        </div>
    `;
    
    wizardContainer.insertAdjacentHTML('afterbegin', errorContent);
}

// ===============================
// FUNCIONES PARA MODO DE PRODUCCIÓN
// ===============================

let selectedProductionModeData = null;

function selectProductionMode(mode) {
    // Actualizar selección visual
    document.querySelectorAll('.production-mode-option').forEach(el => {
        el.classList.remove('border-blue-400', 'bg-blue-50');
    });
    
    const selectedOption = document.querySelector(`[data-mode="${mode}"]`);
    if (selectedOption) {
        selectedOption.classList.add('border-blue-400', 'bg-blue-50');
    }
    
    selectedProductionModeData = { mode };
    
    // Mostrar opciones de prioridad
    showPriorityOptions(mode);
}

async function showPriorityOptions(mode) {
    const response = await fetch('/api/print/production-modes');
    const data = await response.json();
    
    const prioritySelection = document.getElementById('priority-selection');
    const priorityOptions = document.getElementById('priority-options');
    
    if (!prioritySelection || !priorityOptions) return;
    
    // Obtener las opciones de prioridad para el modo seleccionado
    const modeData = data.production_modes[mode];
    const availablePriorities = modeData.priority_options;
    
    // Generar opciones de prioridad
    priorityOptions.innerHTML = availablePriorities.map(priority => `
        <div class="border rounded-lg p-3 cursor-pointer transition-colors priority-option hover:border-blue-400" 
             onclick="selectPriority('${priority}')" data-priority="${priority}">
            <div class="text-center">
                <div class="text-lg mb-1">${data.priority_settings[priority].label}</div>
                <div class="text-xs text-gray-600">${data.priority_settings[priority].description}</div>
            </div>
        </div>
    `).join('');
    
    prioritySelection.classList.remove('hidden');
}

function selectPriority(priority) {
    // Actualizar selección visual
    document.querySelectorAll('.priority-option').forEach(el => {
        el.classList.remove('border-blue-400', 'bg-blue-50');
    });
    
    const selectedOption = document.querySelector(`[data-priority="${priority}"]`);
    if (selectedOption) {
        selectedOption.classList.add('border-blue-400', 'bg-blue-50');
    }
    
    selectedProductionModeData.priority = priority;
    
    // Mostrar configuración seleccionada
    showSelectedConfiguration();
}

function showSelectedConfiguration() {
    const configContainer = document.getElementById('selected-configuration');
    const configDetails = document.getElementById('config-details');
    
    if (!configContainer || !configDetails || !selectedProductionModeData.priority) return;
    
    configDetails.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div>
                <strong>Modo:</strong> ${selectedProductionModeData.mode === 'prototype' ? '🔬 Prototipo' : '🏭 Producción'}
            </div>
            <div>
                <strong>Prioridad:</strong> ${selectedProductionModeData.priority === 'speed' ? '⚡ Velocidad' : 
                                               selectedProductionModeData.priority === 'quality' ? '✨ Calidad' :
                                               selectedProductionModeData.priority === 'economy' ? '💰 Economía' : '🎯 Consistencia'}
            </div>
        </div>
    `;
    
    configContainer.classList.remove('hidden');
}

async function confirmProductionMode() {
    if (!selectedProductionModeData || !selectedProductionModeData.priority) {
        showToast('Atención', 'Selecciona un modo y prioridad primero', 'warning');
        return;
    }
    
    if (!currentWizardSessionId) {
        showToast('Error', 'Sesión no válida', 'error');
        return;
    }
    
    try {
        showToast('Configurando', 'Aplicando configuración de producción...', 'info');
        
        const response = await fetch('/api/print/set-production-mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: selectedProductionModeData.mode,
                priority: selectedProductionModeData.priority,
                session_id: currentWizardSessionId  // Incluir session_id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Configuración Aplicada', 
                `Modo ${result.configuration.mode} con prioridad ${result.configuration.priority}`, 'success');
            
            setTimeout(() => {
                loadPrintFlowStep(null, null, result.next_step.step, { 
                    completed_steps: ['piece_selection', 'material_selection', 'production_mode'],
                    data: { 
                        production_config: result.configuration,
                        project_name: 'Proyecto'
                    }
                });
            }, 1000);
        } else {
            showToast('Error', result.message || 'Error configurando modo de producción', 'error');
        }
        
    } catch (error) {
        console.error('Error configurando producción:', error);
        showToast('Error', 'Error de conexión', 'error');
    }
}

// ===============================
// FUNCIONES PARA ASIGNACIÓN DE IMPRESORAS
// ===============================

let selectedPrinterData = null;

function selectPrinter(printerId) {
    // Actualizar selección visual
    document.querySelectorAll('.printer-option').forEach(el => {
        el.classList.remove('border-blue-400', 'bg-blue-50');
    });
    
    const selectedOption = document.querySelector(`[data-printer-id="${printerId}"]`);
    if (selectedOption) {
        selectedOption.classList.add('border-blue-400', 'bg-blue-50');
        selectedOption.querySelector('input[type="radio"]').checked = true;
    }
    
    selectedPrinterData = { printer_id: printerId };
}

async function assignSelectedPrinter() {
    if (!selectedPrinterData) {
        showToast('Atención', 'Selecciona una impresora primero', 'warning');
        return;
    }
    
    if (!currentWizardSessionId) {
        showToast('Error', 'Sesión no válida', 'error');
        return;
    }
    
    try {
        showToast('Asignando', 'Asignando impresora al trabajo...', 'info');
        
        const response = await fetch('/api/print/assign-printer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: '1', // Mock project ID - se debería pasar dinámicamente
                printer_id: selectedPrinterData.printer_id,
                assignment_type: 'manual',
                session_id: currentWizardSessionId  // Incluir session_id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Impresora Asignada', 
                `${result.assignment.printer_name} asignada exitosamente`, 'success');
            
            setTimeout(() => {
                // Siguiente paso sería procesamiento STL
                loadPrintFlowStep(null, null, result.next_step.step, { 
                    completed_steps: ['piece_selection', 'material_selection', 'production_mode', 'printer_assignment'],
                    data: { 
                        printer_assignment: result.assignment,
                        project_name: 'Proyecto'
                    }
                });
            }, 1000);
        } else {
            if (result.error === 'printer_busy') {
                showToast('Impresora Ocupada', result.message, 'warning');
            } else {
                showToast('Error', result.message || 'Error asignando impresora', 'error');
            }
        }
        
    } catch (error) {
        console.error('Error asignando impresora:', error);
        showToast('Error', 'Error de conexión', 'error');
    }
}

// ===============================
// FUNCIONES PARA PROCESAMIENTO STL
// ===============================

async function loadSTLProcessingStep() {
    // Actualizar botones de acción
    setTimeout(() => {
        const actionsContainer = document.getElementById('wizard-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button onclick="startSTLProcessing()" class="bg-green-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-green-600 transition-colors whitespace-nowrap">
                    🔄 <span class="hidden sm:inline">Procesar Archivos</span><span class="sm:hidden">Procesar</span>
                </button>
            `;
        }
    }, 100);
    
    return `
        <div class="space-y-6">
            <div class="text-center">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">🔄 Procesamiento STL</h3>
                <p class="text-gray-600">Generando G-code para los archivos seleccionados</p>
            </div>
            
            <!-- Estado del procesamiento -->
            <div class="bg-blue-50 rounded-lg p-4">
                <h4 class="font-medium text-blue-900 mb-3">Estado del Procesamiento:</h4>
                <div id="processing-status" class="space-y-2">
                    <div class="text-sm text-blue-700">
                        ⏳ Listo para procesar archivos STL con APISLICER
                    </div>
                </div>
            </div>
            
            <!-- Configuración que se aplicará -->
            <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="font-medium text-gray-900 mb-3">Configuración de Laminado:</h4>
                <div class="grid grid-cols-2 gap-4 text-sm text-gray-700">
                    <div><strong>Material:</strong> PLA Blanco</div>
                    <div><strong>Temperatura extrusor:</strong> 210°C</div>
                    <div><strong>Temperatura cama:</strong> 60°C</div>
                    <div><strong>Altura de capa:</strong> 0.3mm</div>
                    <div><strong>Relleno:</strong> 15%</div>
                    <div><strong>Velocidad:</strong> 80mm/s</div>
                </div>
            </div>
            
            <!-- Lista de archivos a procesar -->
            <div class="space-y-2">
                <h4 class="font-medium text-gray-900">Archivos a procesar:</h4>
                <div id="files-to-process" class="space-y-2">
                    <!-- Se cargarán dinámicamente -->
                </div>
            </div>
        </div>
    `;
}

async function startSTLProcessing() {
    if (!currentWizardSessionId) {
        showToast('Error', 'Sesión no válida', 'error');
        return;
    }
    
    try {
        showToast('Procesando', 'Iniciando procesamiento de archivos STL...', 'info');
        
        // Actualizar interfaz de procesamiento
        updateProcessingStatus('Procesando archivos...', 'in-progress');
        
        const response = await fetch('/api/print/process-stl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentWizardSessionId  // Enviar session_id en lugar de datos mock
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateProcessingStatus('Procesamiento completado', 'success');
            showToast('Procesamiento Completado', 
                `${result.processing_summary.successful}/${result.processing_summary.total_files} archivos procesados`, 'success');
            
            setTimeout(() => {
                loadPrintFlowStep(null, null, result.next_step.step, { 
                    completed_steps: ['piece_selection', 'material_selection', 'production_mode', 'printer_assignment', 'stl_processing'],
                    data: { 
                        processing_result: result,
                        project_name: 'Proyecto'
                    }
                });
            }, 1500);
        } else {
            updateProcessingStatus('Error en procesamiento', 'error');
            showToast('Error', result.message || 'Error procesando archivos STL', 'error');
        }
        
    } catch (error) {
        console.error('Error procesando STL:', error);
        updateProcessingStatus('Error de conexión', 'error');
        showToast('Error', 'Error de conexión con el servidor', 'error');
    }
}

function updateProcessingStatus(message, status) {
    const statusContainer = document.getElementById('processing-status');
    if (!statusContainer) return;
    
    const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
    const statusClass = status === 'success' ? 'text-green-700' : status === 'error' ? 'text-red-700' : 'text-blue-700';
    
    statusContainer.innerHTML = `
        <div class="text-sm ${statusClass}">
            ${statusIcon} ${message}
        </div>
    `;
}

// ===============================
// FUNCIONES PARA VALIDACIÓN
// ===============================

async function loadValidationStep() {
    // Actualizar botones de acción
    setTimeout(() => {
        const actionsContainer = document.getElementById('wizard-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button onclick="proceedToConfirmation()" class="bg-green-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-green-600 transition-colors whitespace-nowrap">
                    ✅ <span class="hidden sm:inline">Validación OK - Continuar</span><span class="sm:hidden">Continuar</span>
                </button>
            `;
        }
    }, 100);
    
    // Cargar reporte de validación usando la sesión actual
    const response = await fetch(`/api/print/validation-report/${currentWizardSessionId}`);
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.message || 'Error cargando validación');
    }
    
    const validation = data.validation;
    
    return `
        <div class="space-y-6">
            <div class="text-center">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">✅ Validación Final</h3>
                <p class="text-gray-600">Revisión del plan de impresión antes de ejecutar</p>
            </div>
            
            <!-- Resumen del trabajo -->
            <div class="bg-blue-50 rounded-lg p-4">
                <h4 class="font-medium text-blue-900 mb-3">📋 Resumen del Trabajo</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-800">
                    <div class="text-center">
                        <div class="text-lg font-bold">${validation.processing_summary.successful}/${validation.processing_summary.total_files}</div>
                        <div>Archivos listos</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-bold">${validation.processing_summary.total_estimated_time_hours}h</div>
                        <div>Tiempo estimado</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-bold">${validation.processing_summary.total_filament_grams}g</div>
                        <div>Filamento</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-bold">€${validation.processing_summary.estimated_cost}</div>
                        <div>Costo estimado</div>
                    </div>
                </div>
            </div>
            
            <!-- Validaciones -->
            <div class="space-y-3">
                <h4 class="font-medium text-gray-900">Verificaciones:</h4>
                ${Object.entries(validation.validation_checks).map(([key, check]) => `
                    <div class="flex items-center justify-between p-3 border rounded-lg ${
                        check.status === 'success' ? 'border-green-200 bg-green-50' : 
                        check.status === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'
                    }">
                        <div class="flex items-center space-x-3">
                            <div class="text-lg">
                                ${check.status === 'success' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'}
                            </div>
                            <div>
                                <div class="font-medium ${
                                    check.status === 'success' ? 'text-green-800' : 
                                    check.status === 'warning' ? 'text-yellow-800' : 'text-red-800'
                                }">
                                    ${key.replace(/_/g, ' ').toUpperCase()}
                                </div>
                                <div class="text-sm ${
                                    check.status === 'success' ? 'text-green-600' : 
                                    check.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                                }">
                                    ${check.details}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Advertencias y errores -->
            ${validation.warnings.length > 0 ? `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 class="font-medium text-yellow-800 mb-2">⚠️ Advertencias</h4>
                    <ul class="text-sm text-yellow-700 space-y-1">
                        ${validation.warnings.map(warning => `<li>• ${warning}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${validation.errors.length > 0 ? `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 class="font-medium text-red-800 mb-2">❌ Errores</h4>
                    <ul class="text-sm text-red-700 space-y-1">
                        ${validation.errors.map(error => `<li>• ${error}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <!-- Recomendaciones -->
            ${validation.recommendations.length > 0 ? `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 class="font-medium text-blue-800 mb-2">💡 Recomendaciones</h4>
                    <ul class="text-sm text-blue-700 space-y-1">
                        ${validation.recommendations.map(rec => `<li>• ${rec}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
}

function proceedToConfirmation() {
    loadPrintFlowStep(null, null, 'confirmation', { 
        completed_steps: ['piece_selection', 'material_selection', 'production_mode', 'printer_assignment', 'stl_processing', 'validation'],
        data: { project_name: 'Proyecto' }
    });
}

// ===============================
// FUNCIONES PARA CONFIRMACIÓN
// ===============================

async function loadConfirmationStep() {
    // Actualizar botones de acción
    setTimeout(() => {
        const actionsContainer = document.getElementById('wizard-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button onclick="confirmPrintJob()" class="bg-green-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-green-600 transition-colors whitespace-nowrap">
                    🚀 <span class="hidden sm:inline">Confirmar e Iniciar Impresión</span><span class="sm:hidden">Confirmar</span>
                </button>
            `;
        }
    }, 100);
    
    return `
        <div class="space-y-6">
            <div class="text-center">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">👤 Confirmación Final</h3>
                <p class="text-gray-600">Última revisión antes de enviar a impresión</p>
            </div>
            
            <!-- Resumen final -->
            <div class="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
                <h4 class="font-bold text-gray-900 mb-4 text-center">📋 Resumen de Impresión</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div class="space-y-2">
                        <div><strong>Proyecto:</strong> ATX Power Supply</div>
                        <div><strong>Piezas:</strong> 8 de 9 archivos</div>
                        <div><strong>Material:</strong> PLA Blanco (eSUN)</div>
                        <div><strong>Impresora:</strong> Impresora Prueba</div>
                    </div>
                    <div class="space-y-2">
                        <div><strong>Tiempo estimado:</strong> 6.5 horas</div>
                        <div><strong>Filamento:</strong> 110.7g</div>
                        <div><strong>Costo:</strong> €2.77</div>
                        <div><strong>Modo:</strong> Prototipo (Velocidad)</div>
                    </div>
                </div>
            </div>
            
            <!-- Notas del usuario -->
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Notas adicionales (opcional):</label>
                <textarea id="user-notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Cualquier observación o instrucción especial..."></textarea>
            </div>
            
            <!-- Confirmaciones -->
            <div class="space-y-3">
                <h4 class="font-medium text-gray-900">Confirmaciones requeridas:</h4>
                <label class="flex items-center space-x-3">
                    <input type="checkbox" id="confirm-materials" class="w-4 h-4 text-blue-600 rounded">
                    <span class="text-sm text-gray-700">Confirmo que el material está disponible y cargado</span>
                </label>
                <label class="flex items-center space-x-3">
                    <input type="checkbox" id="confirm-printer" class="w-4 h-4 text-blue-600 rounded">
                    <span class="text-sm text-gray-700">He verificado que la impresora está lista y calibrada</span>
                </label>
                <label class="flex items-center space-x-3">
                    <input type="checkbox" id="confirm-settings" class="w-4 h-4 text-blue-600 rounded">
                    <span class="text-sm text-gray-700">Los parámetros de impresión son correctos</span>
                </label>
            </div>
            
            <!-- Estimaciones finales -->
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="text-center">
                    <div class="text-sm text-gray-600 mb-2">Si confirmas ahora:</div>
                    <div class="text-lg font-bold text-blue-600">Inicio estimado: Inmediato</div>
                    <div class="text-sm text-gray-600">Finalización estimada: Hoy 18:30</div>
                </div>
            </div>
        </div>
    `;
}

async function confirmPrintJob() {
    // Verificar que tengamos una sesión activa
    if (!currentWizardSessionId) {
        showToast('Error', 'No hay una sesión activa del wizard', 'error');
        return;
    }

    // Verificar confirmaciones
    const confirmMaterials = document.getElementById('confirm-materials')?.checked;
    const confirmPrinter = document.getElementById('confirm-printer')?.checked;
    const confirmSettings = document.getElementById('confirm-settings')?.checked;
    
    if (!confirmMaterials || !confirmPrinter || !confirmSettings) {
        showToast('Atención', 'Debes confirmar todos los elementos antes de continuar', 'warning');
        return;
    }
    
    try {
        showToast('Confirmando', 'Enviando trabajo a impresora...', 'info');
        
        const userNotes = document.getElementById('user-notes')?.value || '';
        
        const response = await fetch('/api/print/confirm-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentWizardSessionId,
                job_id: currentWizardSessionId,
                confirmed_settings: {
                    priority: 'normal',
                    notifications: true
                },
                user_notes: userNotes
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('¡Trabajo Confirmado!', 'Impresión iniciada exitosamente', 'success');
            
            // Ir al paso de monitoreo
            setTimeout(() => {
                loadPrintFlowStep(null, null, 'monitoring', { 
                    completed_steps: ['piece_selection', 'material_selection', 'production_mode', 'printer_assignment', 'stl_processing', 'validation', 'confirmation'],
                    data: { 
                        job_confirmed: result.job_confirmed,
                        project_name: 'Proyecto'
                    }
                });
            }, 1500);
        } else {
            showToast('Error', result.message || 'Error confirmando trabajo', 'error');
        }
        
    } catch (error) {
        console.error('Error confirmando trabajo:', error);
        showToast('Error', 'Error de conexión', 'error');
    }
}

// ===============================
// FUNCIONES PARA MONITOREO
// ===============================

async function loadMonitoringStep() {
    // Actualizar botones de acción
    setTimeout(() => {
        const actionsContainer = document.getElementById('wizard-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button onclick="refreshJobStatus()" class="bg-blue-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap">
                    🔄 <span class="hidden sm:inline">Actualizar Estado</span><span class="sm:hidden">Actualizar</span>
                </button>
                <button onclick="closePrintFlowWizard()" class="bg-gray-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap">
                    ✅ <span class="hidden sm:inline">Cerrar Asistente</span><span class="sm:hidden">Cerrar</span>
                </button>
            `;
        }
    }, 100);
    
    return `
        <div class="space-y-6">
            <div class="text-center">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">👁️ Monitoreo de Impresión</h3>
                <p class="text-gray-600">Seguimiento en tiempo real del trabajo</p>
            </div>
            
            <!-- Estado actual -->
            <div id="job-status-container" class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-bold text-green-800">🖨️ Trabajo Confirmado</h4>
                        <p class="text-sm text-green-700">El trabajo se ha enviado a la impresora exitosamente</p>
                    </div>
                    <div class="text-green-600 text-2xl">✅</div>
                </div>
            </div>
            
            <!-- Información de monitoreo -->
            <div class="bg-blue-50 rounded-lg p-4">
                <h4 class="font-medium text-blue-900 mb-3">📊 Información del Trabajo</h4>
                <div class="grid grid-cols-2 gap-4 text-sm text-blue-800">
                    <div><strong>Job ID:</strong> <span class="font-mono text-xs">abc123-def456</span></div>
                    <div><strong>Cola de posición:</strong> #1</div>
                    <div><strong>Inicio estimado:</strong> Inmediato</div>
                    <div><strong>Estado:</strong> Encolado</div>
                </div>
            </div>
            
            <!-- Próximos pasos -->
            <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="font-medium text-gray-900 mb-3">🔄 Próximos Pasos</h4>
                <ul class="text-sm text-gray-700 space-y-2">
                    <li>• El trabajo se agregó a la cola de impresión</li>
                    <li>• Puedes monitorear el progreso en tiempo real</li>
                    <li>• Recibirás notificaciones de estado importantes</li>
                    <li>• El asistente se puede cerrar - el monitoreo continúa</li>
                </ul>
            </div>
            
            <div class="text-center">
                <p class="text-sm text-gray-600">
                    ¡El flujo de impresión se completó exitosamente! 🎉<br>
                    Tu trabajo está ahora en la cola de impresión.
                </p>
            </div>
        </div>
    `;
}

function refreshJobStatus() {
    showToast('Actualizando', 'Obteniendo estado actual del trabajo...', 'info');
    // En implementación real se actualizaría el estado desde el servidor
    setTimeout(() => {
        showToast('Estado Actualizado', 'Trabajo en cola, posición #1', 'success');
    }, 1000);
}

function generatePlaceholderStep(step) {
    const stepLabels = {
        'production_mode': '🏭 Configuración de Producción',
        'printer_assignment': '🖨️ Asignación de Impresoras',
        'stl_processing': '🔄 Procesamiento STL',
        'validation': '✅ Validación Final',
        'confirmation': '👤 Confirmación',
        'monitoring': '👁️ Monitoreo'
    };
    
    return `
        <div class="text-center space-y-4">
            <div class="text-6xl opacity-50">🚧</div>
            <h3 class="text-xl font-bold text-gray-900">${stepLabels[step] || step}</h3>
            <p class="text-gray-600">Este paso está en desarrollo</p>
            <p class="text-sm text-gray-500">Se implementará en las siguientes iteraciones</p>
        </div>
    `;
}

function getStepLabel(step) {
    const labels = {
        'piece_selection': '1. Selección de Piezas',
        'material_selection': '2. Selección de Material',
        'production_mode': '3. Modo de Producción',
        'printer_assignment': '4. Asignación de Impresora',
        'stl_processing': '5. Procesamiento',
        'validation': '6. Validación',
        'confirmation': '7. Confirmación',
        'monitoring': '8. Monitoreo'
    };
    return labels[step] || step;
}

function generateProgressIndicator(currentStep, completedSteps) {
    const steps = [
        'piece_selection', 'material_selection', 'production_mode', 
        'printer_assignment', 'stl_processing', 'validation', 'confirmation'
    ];
    
    const stepLabels = {
        'piece_selection': 'Piezas',
        'material_selection': 'Material',
        'production_mode': 'Modo',
        'printer_assignment': 'Impresora',
        'stl_processing': 'Proceso',
        'validation': 'Validar',
        'confirmation': 'Confirmar'
    };
    
    return `
        <div class="flex items-center justify-between space-x-1 sm:space-x-2 overflow-x-auto pb-2">
            ${steps.map((step, index) => {
                const isCompleted = completedSteps.includes(step);
                const isCurrent = step === currentStep;
                const isUpcoming = !isCompleted && !isCurrent;
                
                return `
                    <div class="flex flex-col items-center min-w-0 flex-1">
                        <div class="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium ${
                            isCompleted ? 'bg-green-500 text-white' :
                            isCurrent ? 'bg-blue-500 text-white' :
                            'bg-gray-300 text-gray-600'
                        }">
                            ${isCompleted ? '✓' : index + 1}
                        </div>
                        <span class="text-xs mt-1 text-center truncate w-full ${
                            isCompleted ? 'text-green-600' :
                            isCurrent ? 'text-blue-600' :
                            'text-gray-500'
                        }">
                            ${stepLabels[step] || step}
                        </span>
                        ${index < steps.length - 1 ? `
                            <div class="hidden sm:block absolute h-0.5 w-8 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}" 
                                 style="top: 16px; left: calc(50% + 20px); transform: translateY(-50%);"></div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function closePrintFlowWizard() {
    const wizardContainer = document.getElementById('print-flow-wizard');
    if (wizardContainer) {
        wizardContainer.classList.add('hidden');
    }
    
    // Limpiar la sesión actual del wizard
    console.log('🧹 Limpiando sesión del wizard:', currentWizardSessionId);
    currentWizardSessionId = null;
    
    document.body.style.overflow = ''; // Restaurar scroll
}

async function previousPrintFlowStep() {
    if (!currentWizardSessionId) {
        showToast('Error', 'No hay sesión activa del wizard', 'error');
        return;
    }

    try {
        // Obtener el estado actual de la sesión
        const sessionState = await getCurrentWizardSessionState();
        
        if (!sessionState) {
            showToast('Error', 'No se pudo obtener el estado de la sesión', 'error');
            return;
        }

        // Definir el orden de los pasos
        const stepOrder = [
            'piece_selection',
            'material_selection', 
            'production_mode',
            'printer_assignment',
            'stl_processing',
            'validation',
            'confirmation',
            'monitoring'
        ];

        const currentStep = sessionState.current_step;
        const completedSteps = sessionState.completed_steps || [];
        
        // Encontrar el paso anterior
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex <= 0) {
            showToast('Información', 'Ya estás en el primer paso del wizard', 'info');
            return;
        }

        const previousStep = stepOrder[currentIndex - 1];
        
        // Calcular qué pasos deberían estar completados para el paso anterior
        const previousCompletedSteps = stepOrder.slice(0, currentIndex - 1);
        
        showToast('Navegando', `Regresando al paso: ${getStepLabel(previousStep)}`, 'info');

        // Cargar el paso anterior con el estado correcto
        await loadPrintFlowStep(null, sessionState.project_id, previousStep, {
            completed_steps: previousCompletedSteps,
            data: { 
                project_name: 'Proyecto',
                navigate_back: true,
                session_data: sessionState
            }
        });

    } catch (error) {
        console.error('Error en navegación hacia atrás:', error);
        showToast('Error', 'No se pudo navegar hacia atrás', 'error');
    }
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
