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
        
        // Determinar si usar pantalla completa (para el paso de validación con visor 3D)
        const isFullscreenStep = step === 'validation';
        const modalSizeClasses = isFullscreenStep 
            ? 'w-full h-full max-w-full max-h-full rounded-none' 
            : 'w-full max-w-4xl h-full max-h-[95vh] sm:max-h-[90vh] rounded-2xl';
        
        // Crear el wrapper del wizard con navegación responsiva optimizada
        wizardContainer.innerHTML = `
            <div class="bg-white ${modalSizeClasses} flex flex-col shadow-2xl">
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
                <button onclick="confirmPieceSelectionFromCheckboxes('${projectId}')" class="bg-blue-600 text-white px-4 sm:px-6 py-2 text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                    Continuar →
                </button>
            `;
        }
    }, 100);
    
    return `
        <div class="space-y-6">
            <div class="text-center">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">📦 Seleccionar Piezas</h3>
                <p class="text-gray-600">Marca las piezas que quieres imprimir</p>
            </div>
            
            <!-- Resumen del proyecto -->
            <div class="bg-blue-50 rounded-lg p-4">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">${data.project_info.total_pieces}</div>
                        <div class="text-blue-800">Piezas totales</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">${parseFloat(data.summary.total_estimated_time_hours).toFixed(1)}h</div>
                        <div class="text-blue-800">Tiempo estimado</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">${parseFloat(data.summary.total_estimated_filament_grams).toFixed(1)}g</div>
                        <div class="text-blue-800">Filamento</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">${parseFloat(data.summary.total_volume_cm3).toFixed(1)}cm³</div>
                        <div class="text-blue-800">Volumen</div>
                    </div>
                </div>
            </div>
            
            <!-- Lista de piezas -->
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <h4 class="font-medium text-gray-900">Piezas disponibles:</h4>
                    <button onclick="toggleAllPieces()" class="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                        ☑️ Seleccionar todas
                    </button>
                </div>
                <div class="max-h-64 overflow-y-auto space-y-2" id="pieces-list">
                    ${data.pieces.map(piece => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" onclick="document.getElementById('piece_${piece.filename}').click()">
                            <div class="flex items-center space-x-3">
                                <input type="checkbox" id="piece_${piece.filename}" name="selected_pieces" value="${piece.filename}" 
                                       class="w-4 h-4 text-blue-600 rounded cursor-pointer" onclick="event.stopPropagation(); updateSelectionSummary()">
                                <label for="piece_${piece.filename}" class="font-medium text-gray-900 cursor-pointer">${piece.filename}</label>
                            </div>
                            <div class="text-sm text-gray-600">
                                ${piece.estimated_time_minutes}min | ${piece.estimated_filament_grams}g
                            </div>
                        </div>
                    `).join('')}
                </div>
                <!-- Contador de selección -->
                <div id="selection-summary" class="text-sm text-gray-600 text-center bg-gray-50 p-2 rounded-lg">
                    0 piezas seleccionadas
                </div>
            </div>
        </div>
    `;
}

// Función para alternar todas las piezas (seleccionar/deseleccionar)
function toggleAllPieces() {
    const checkboxes = document.querySelectorAll('input[name="selected_pieces"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
    });
    
    updateSelectionSummary();
}

// Actualizar el contador de piezas seleccionadas
function updateSelectionSummary() {
    const selectedCheckboxes = document.querySelectorAll('input[name="selected_pieces"]:checked');
    const count = selectedCheckboxes.length;
    const summaryEl = document.getElementById('selection-summary');
    
    if (summaryEl) {
        if (count === 0) {
            summaryEl.textContent = '0 piezas seleccionadas';
            summaryEl.className = 'text-sm text-gray-600 text-center bg-gray-50 p-2 rounded-lg';
        } else {
            summaryEl.textContent = `${count} pieza${count > 1 ? 's' : ''} seleccionada${count > 1 ? 's' : ''}`;
            summaryEl.className = 'text-sm text-blue-700 font-medium text-center bg-blue-50 p-2 rounded-lg';
        }
    }
}

// Confirmar selección de piezas desde los checkboxes
function confirmPieceSelectionFromCheckboxes(projectId) {
    const selectedCheckboxes = document.querySelectorAll('input[name="selected_pieces"]:checked');
    const selectedPieces = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (selectedPieces.length === 0) {
        showToast('Atención', 'Selecciona al menos una pieza para continuar', 'warning');
        return;
    }
    
    // Llamar al endpoint con la selección
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
    // Verificar que tenemos todos los datos necesarios
    if (!selectedMaterialData || !selectedProductionModeData || !selectedPrinterData) {
        return `
            <div class="space-y-6">
                <div class="text-center">
                    <h3 class="text-2xl font-bold text-red-600 mb-2">⚠️ Configuración Incompleta</h3>
                    <p class="text-gray-600">Debes completar los pasos anteriores antes de procesar los archivos STL</p>
                </div>
                <div class="bg-red-50 rounded-lg p-4">
                    <p class="text-red-700">Faltan datos de configuración. Regresa a los pasos anteriores.</p>
                </div>
            </div>
        `;
    }

    // Actualizar botones de acción
    setTimeout(() => {
        console.log('🔧 Modo de procesamiento: Backend-Centric (Arquitectura Definitiva)');
        
        const actionsContainer = document.getElementById('wizard-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button onclick="startSTLProcessing()" class="bg-green-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-green-600 transition-colors whitespace-nowrap" title="Procesamiento inteligente backend">
                    ⚙️ <span class="hidden sm:inline">Iniciar Procesamiento</span><span class="sm:hidden">Procesar</span>
                </button>
            `;
        }
        
        // Configurar evento para el checkbox de auto-rotación
        const autoRotationCheckbox = document.getElementById('enable-auto-rotation');
        const rotationMethodConfig = document.getElementById('rotation-method-config');
        
        if (autoRotationCheckbox && rotationMethodConfig) {
            // Configurar estado inicial
            rotationMethodConfig.style.display = autoRotationCheckbox.checked ? 'block' : 'none';
            
            // Agregar evento de cambio
            autoRotationCheckbox.addEventListener('change', function() {
                rotationMethodConfig.style.display = this.checked ? 'block' : 'none';
            });
        }
        
        // Configurar slider de umbral de mejora
        const thresholdSlider = document.getElementById('improvement-threshold');
        const thresholdValue = document.getElementById('improvement-threshold-value');
        
        if (thresholdSlider && thresholdValue) {
            // Actualizar valor mostrado cuando cambia el slider
            thresholdSlider.addEventListener('input', function() {
                thresholdValue.textContent = `${this.value}%`;
            });
        }
    }, 100);

    // Mostrar configuración seleccionada
    const materialDisplay = `${selectedMaterialData.tipo} ${selectedMaterialData.color}`;
    const modeDisplay = selectedProductionModeData.mode === 'prototype' ? '🔬 Prototipo' : '🏭 Producción';
    const priorityDisplay = selectedProductionModeData.priority === 'speed' ? '⚡ Velocidad' :
                           selectedProductionModeData.priority === 'quality' ? '✨ Calidad' :
                           selectedProductionModeData.priority === 'economy' ? '💰 Economía' : '🎯 Consistencia';

    return `
        <div class="space-y-6">
            <div class="text-center">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">🔄 Procesamiento STL Inteligente</h3>
                <p class="text-gray-600">Generando perfiles optimizados y G-code personalizado</p>
            </div>

            <!-- Configuración seleccionada -->
            <div class="bg-blue-50 rounded-lg p-4">
                <h4 class="font-medium text-blue-900 mb-3">📋 Configuración Seleccionada:</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div class="bg-white p-3 rounded-lg">
                        <div class="font-medium text-gray-900">🧪 Material</div>
                        <div class="text-blue-700">${materialDisplay}</div>
                        <div class="text-gray-500 text-xs">${selectedMaterialData.marca}</div>
                    </div>
                    <div class="bg-white p-3 rounded-lg">
                        <div class="font-medium text-gray-900">🏭 Modo</div>
                        <div class="text-blue-700">${modeDisplay}</div>
                        <div class="text-gray-500 text-xs">${priorityDisplay}</div>
                    </div>
                    <div class="bg-white p-3 rounded-lg">
                        <div class="font-medium text-gray-900">🖨️ Impresora</div>
                        <div class="text-blue-700">ID: ${selectedPrinterData.printer_id}</div>
                        <div class="text-gray-500 text-xs">Perfil optimizado</div>
                    </div>
                </div>
            </div>

            <!-- Proceso de 3 pasos -->
            <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="font-medium text-gray-900 mb-3">🔧 Proceso de Optimización (3 pasos):</h4>
                <div class="space-y-3">
                    <div class="flex items-center space-x-3 p-3 bg-white rounded-lg">
                        <div class="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">1</div>
                        <div>
                            <div class="font-medium text-gray-900">Generar Perfil Personalizado</div>
                            <div class="text-sm text-gray-600">Combinar configuración de material, modo y impresora</div>
                        </div>
                        <div id="step1-status" class="ml-auto text-gray-400">⏳ Pendiente</div>
                    </div>
                    <div class="flex items-center space-x-3 p-3 bg-white rounded-lg">
                        <div class="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                        <div>
                            <div class="font-medium text-gray-900">Enviar Archivos STL</div>
                            <div class="text-sm text-gray-600">Procesar cada archivo con el perfil optimizado</div>
                        </div>
                        <div id="step2-status" class="ml-auto text-gray-400">⏳ Pendiente</div>
                    </div>
                    <div class="flex items-center space-x-3 p-3 bg-white rounded-lg">
                        <div class="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">3</div>
                        <div>
                            <div class="font-medium text-gray-900">Generar G-code Optimizado</div>
                            <div class="text-sm text-gray-600">Crear archivos listos para impresión</div>
                        </div>
                        <div id="step3-status" class="ml-auto text-gray-400">⏳ Pendiente</div>
                    </div>
                </div>
            </div>

            <!-- Información del perfil que se creará -->
            <div class="bg-green-50 rounded-lg p-4">
                <h4 class="font-medium text-green-900 mb-2">🎯 Perfil que se generará:</h4>
                <div class="text-sm text-green-700">
                    <strong>ID único:</strong> Se generará automáticamente<br>
                    <strong>Base:</strong> ${selectedPrinterData.printer_id}<br>
                    <strong>Optimizaciones:</strong> ${materialDisplay} + ${priorityDisplay.toLowerCase()}<br>
                    <strong>Resultado:</strong> Perfil personalizado para máxima calidad
                </div>
            </div>

            <!-- Configuración de Auto-Rotación -->
            <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 class="font-medium text-purple-900 mb-3">🔄 Optimización de Orientación STL</h4>
                <div class="space-y-3">
                    <label class="flex items-start space-x-3 cursor-pointer">
                        <input type="checkbox" id="enable-auto-rotation" class="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500" checked>
                        <div class="flex-1">
                            <div class="font-medium text-gray-900">Activar Auto-Rotación Inteligente</div>
                            <div class="text-sm text-gray-600">Analiza y rota automáticamente cada pieza STL para maximizar el área de contacto con la cama, mejorando la adhesión y reduciendo soportes necesarios.</div>
                        </div>
                    </label>
                    <div id="rotation-method-config" class="ml-8 space-y-2">
                        <label class="text-sm text-gray-700">
                            <span class="font-medium">Método de optimización:</span>
                            <select id="rotation-method" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500">
                                <option value="auto" selected>Automático (Inteligente)</option>
                                <option value="gradient">Descenso de Gradiente</option>
                                <option value="grid">Búsqueda en Rejilla</option>
                            </select>
                        </label>
                        <div class="text-xs text-gray-500 bg-white p-2 rounded">
                            <strong>Automático:</strong> Combina exploración estratégica con optimización por gradiente (recomendado)<br>
                            <strong>Gradiente:</strong> Optimización rápida pero puede quedarse en óptimos locales<br>
                            <strong>Rejilla:</strong> Prueba sistemática de rotaciones (más lento pero exhaustivo)
                        </div>
                        
                        <!-- Control de Umbral de Mejora -->
                        <div class="mt-4 pt-4 border-t border-purple-200">
                            <label class="text-sm text-gray-700">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="font-medium">Umbral de mejora mínimo:</span>
                                    <span id="improvement-threshold-value" class="text-purple-600 font-bold text-lg">5%</span>
                                </div>
                                <input 
                                    type="range" 
                                    id="improvement-threshold" 
                                    min="0" 
                                    max="20" 
                                    step="0.5" 
                                    value="5" 
                                    class="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider-purple"
                                >
                                <div class="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>0% (Siempre rotar)</span>
                                    <span>10%</span>
                                    <span>20% (Solo grandes mejoras)</span>
                                </div>
                            </label>
                            <div class="text-xs text-gray-600 bg-white p-2 rounded mt-2">
                                <strong>ℹ️ Explicación:</strong> Solo se aplicará la rotación si la mejora en el área de contacto supera este porcentaje.
                                <ul class="list-disc list-inside mt-1 space-y-1">
                                    <li><strong>0-2%:</strong> Rotará casi siempre (muy sensible)</li>
                                    <li><strong>3-7%:</strong> Balance entre optimización y practicidad</li>
                                    <li><strong>8-20%:</strong> Solo rotaciones significativas</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Lista de archivos a procesar -->
            <div class="space-y-2">
                <h4 class="font-medium text-gray-900">📁 Archivos a procesar:</h4>
                <div id="files-to-process" class="space-y-2">
                    <div class="text-sm text-gray-600 italic">Los archivos se cargarán al iniciar el procesamiento...</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Procesa STL con auto-rotación y laminado completamente en el backend.
 * El frontend solo envía configuración y hace polling del progreso.
 * 
 * Arquitectura Backend-Centric:
 * - Un solo HTTP request inicial
 * - Procesamiento paralelo de 3 archivos simultáneos en el backend
 * - Retry automático (3 intentos) en caso de errores
 * - Progress tracking en tiempo real
 * - Frontend simple y responsivo
 */
async function startSTLProcessing() {
    if (!currentWizardSessionId) {
        showToast('Error', 'Sesión no válida', 'error');
        return;
    }

    // Verificar configuración
    if (!selectedMaterialData || !selectedProductionModeData || !selectedPrinterData) {
        showToast('Error', 'Configuración incompleta', 'error');
        return;
    }

    try {
        console.log('🚀 Iniciando procesamiento Backend-Centric');
        showToast('Iniciando', 'Procesamiento inteligente...', 'info');

        // Paso 1: Generar perfil personalizado
        updateStepStatus(1, 'in-progress', 'Generando perfil personalizado...');
        
        const profileRequest = {
            job_id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            printer_model: mapPrinterIdToModel(selectedPrinterData.printer_id),
            material_config: {
                type: selectedMaterialData.tipo,
                color: selectedMaterialData.color,
                brand: selectedMaterialData.marca
            },
            production_config: {
                mode: selectedProductionModeData.mode,
                priority: selectedProductionModeData.priority
            },
            printer_config: {
                printer_name: selectedPrinterData.printer_id,
                printer_model: mapPrinterIdToModel(selectedPrinterData.printer_id),
                bed_adhesion: true
            }
        };

        const profileResponse = await fetch('/api/slicer/generate-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileRequest)
        });

        if (!profileResponse.ok) {
            throw new Error(`Error generando perfil: ${profileResponse.status}`);
        }

        const profileResult = await profileResponse.json();
        updateStepStatus(1, 'completed', `Perfil: ${profileResult.profile_name}`);
        showProfileInfo(profileResult);

        // Paso 2: Enviar todo al backend para procesamiento asíncrono
        updateStepStatus(2, 'in-progress', 'Enviando al backend...');
        
        const enableAutoRotation = document.getElementById('enable-auto-rotation')?.checked || false;
        const rotationMethod = document.getElementById('rotation-method')?.value || 'auto';
        const improvementThreshold = parseFloat(document.getElementById('improvement-threshold')?.value || 5.0);
        
        console.log('📤 Enviando configuración al backend:', {
            session_id: currentWizardSessionId,
            rotation_enabled: enableAutoRotation,
            threshold: improvementThreshold
        });

        // ✨ NUEVO: Un solo request con toda la configuración
        const response = await fetch('/api/print/process-with-rotation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentWizardSessionId,
                rotation_config: {
                    enabled: enableAutoRotation,
                    method: rotationMethod,
                    improvement_threshold: improvementThreshold,
                    max_iterations: 50,
                    learning_rate: 0.1,
                    rotation_step: 15,
                    max_rotations: 24
                },
                profile_config: {
                    job_id: profileResult.job_id,
                    printer_model: profileRequest.printer_model
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Error HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Error iniciando procesamiento');
        }

        console.log('✅ Tarea iniciada:', result.task_id);
        updateStepStatus(2, 'in-progress', `Procesando ${result.files_count} archivo(s)...`);
        
        // Paso 3: Polling del progreso (✨ NUEVO)
        await pollTaskProgress(result.task_id);

    } catch (error) {
        console.error('Error en procesamiento:', error);
        const currentStep = getCurrentFailedStep();
        updateStepStatus(currentStep, 'error', error.message);
        showToast('Error', error.message, 'error');
    }
}

/**
 * Hace polling del progreso de una tarea asíncrona en el backend
 * @param {string} taskId - ID de la tarea retornado por /process-with-rotation
 */
async function pollTaskProgress(taskId) {
    const pollInterval = 2000; // 2 segundos
    const maxAttempts = 300; // 10 minutos máximo (300 * 2s)
    let attempts = 0;

    console.log(`🔄 Iniciando polling para tarea: ${taskId}`);

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`/api/print/task-status/${taskId}`);
            
            if (!response.ok) {
                throw new Error(`Error consultando estado: ${response.status}`);
            }

            const status = await response.json();
            
            console.log(`📊 Progreso: ${status.progress.percentage.toFixed(1)}% (${status.progress.completed}/${status.progress.total})`);

            // Actualizar UI con progreso
            updateStepStatus(
                2, 
                'in-progress', 
                `Procesando... ${status.progress.completed}/${status.progress.total} (${status.progress.percentage.toFixed(0)}%)`
            );

            // Verificar si terminó
            if (status.status === 'completed') {
                console.log('✅ Procesamiento completado');
                
                const successCount = status.results ? status.results.filter(r => r.success).length : 0;
                const rotatedCount = status.results ? status.results.filter(r => r.rotated).length : 0;
                
                updateStepStatus(2, 'completed', `${successCount} archivo(s) procesados`);
                updateStepStatus(3, 'completed', `G-code generado (${rotatedCount} rotados)`);
                
                showToast(
                    'Completado', 
                    `✅ ${successCount} archivos, ${rotatedCount} rotados optimizados`, 
                    'success'
                );

                // Avanzar al siguiente paso
                setTimeout(() => {
                    loadPrintFlowStep(null, null, 'validation', {
                        completed_steps: ['piece_selection', 'material_selection', 'production_mode', 'printer_assignment', 'stl_processing'],
                        data: {
                            task_id: taskId,
                            processing_result: status,
                            project_name: 'Proyecto Optimizado'
                        }
                    });
                }, 2000);
                
                break;
                
            } else if (status.status === 'failed') {
                console.error('❌ Procesamiento falló:', status.error_message);
                
                updateStepStatus(2, 'error', status.error_message || 'Error en procesamiento');
                showToast('Error', status.error_message || 'Procesamiento falló', 'error');
                break;
                
            } else if (status.status === 'cancelled') {
                console.warn('⚠️ Procesamiento cancelado');
                
                updateStepStatus(2, 'error', 'Procesamiento cancelado');
                showToast('Cancelado', 'Procesamiento cancelado', 'warning');
                break;
            }

            // Esperar antes del próximo poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;

        } catch (error) {
            console.error('Error en polling:', error);
            
            // Reintentar en caso de error de red temporal
            if (attempts < 3) {
                console.warn(`Reintentando polling... (${attempts + 1}/3)`);
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;
            } else {
                updateStepStatus(2, 'error', `Error consultando progreso: ${error.message}`);
                showToast('Error', 'Error consultando progreso', 'error');
                break;
            }
        }
    }

    if (attempts >= maxAttempts) {
        console.error('⏱️ Timeout: se superó el tiempo máximo de polling');
        updateStepStatus(2, 'error', 'Timeout: procesamiento tomó demasiado tiempo');
        showToast('Timeout', 'El procesamiento tomó demasiado tiempo', 'error');
    }
}

function updateStepStatus(stepNumber, status, message) {
    const statusElement = document.getElementById(`step${stepNumber}-status`);
    if (!statusElement) return;

    let statusIcon, statusClass, statusText;

    switch (status) {
        case 'in-progress':
            statusIcon = '🔄';
            statusClass = 'text-blue-600';
            statusText = message;
            break;
        case 'completed':
            statusIcon = '✅';
            statusClass = 'text-green-600';
            statusText = message;
            break;
        case 'error':
            statusIcon = '❌';
            statusClass = 'text-red-600';
            statusText = message;
            break;
        default:
            statusIcon = '⏳';
            statusClass = 'text-gray-400';
            statusText = message || 'Pendiente';
    }

    statusElement.innerHTML = `${statusIcon} ${statusText}`;
    statusElement.className = `ml-auto text-sm ${statusClass}`;
}

function showProfileInfo(profileResult) {
    const profileInfo = document.createElement('div');
    profileInfo.className = 'mt-4 p-3 bg-green-50 border border-green-200 rounded-lg';
    profileInfo.innerHTML = `
        <h5 class="font-medium text-green-900 mb-2">🎯 Perfil Generado:</h5>
        <div class="text-sm text-green-700 space-y-1">
            <div><strong>ID:</strong> ${profileResult.job_id}</div>
            <div><strong>Archivo:</strong> ${profileResult.profile_name}</div>
            <div><strong>Material:</strong> ${profileResult.material}</div>
            <div><strong>Modo:</strong> ${profileResult.production_mode}</div>
            <div><strong>Impresora base:</strong> ${profileResult.base_printer}</div>
            <div><strong>Generado:</strong> ${new Date(profileResult.generated_at).toLocaleString()}</div>
        </div>
    `;

    // Insertar después del contenedor de pasos
    const stepsContainer = document.querySelector('.bg-gray-50.rounded-lg.p-4');
    if (stepsContainer) {
        stepsContainer.appendChild(profileInfo);
    }
}

function mapPrinterIdToModel(printerId) {
    // Mapear IDs de impresora a modelos de APISLICER
    const printerMappings = {
        'ender3_001': 'ender3',
        'ender3_pro_001': 'ender3_pro',
        'prusa_i3mk3s_001': 'prusa_mk3',
        'ender5_001': 'ender5'
    };

    // Buscar coincidencias parciales
    for (const [id, model] of Object.entries(printerMappings)) {
        if (printerId.includes(id.replace('_001', ''))) {
            return model;
        }
    }

    // Default fallback
    return 'ender3';
}

function getCurrentFailedStep() {
    // Determinar qué paso falló basado en el estado actual
    const step1Status = document.getElementById('step1-status')?.textContent || '';
    const step2Status = document.getElementById('step2-status')?.textContent || '';
    const step3Status = document.getElementById('step3-status')?.textContent || '';

    if (step1Status.includes('❌') || step1Status.includes('Error')) return 1;
    if (step2Status.includes('❌') || step2Status.includes('Error')) return 2;
    if (step3Status.includes('❌') || step3Status.includes('Error')) return 3;

    return 1; // Default
}

function updateProcessingStatus(message, status) {
    // Esta función se mantiene por compatibilidad pero ahora usamos updateStepStatus
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
            
            <!-- Visor de G-code Interactivo -->
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="font-medium text-gray-900">🔍 Vista Previa de Laminación</h4>
                    <button onclick="toggleGcodeViewer()" id="toggle-gcode-btn" class="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                        👁️ Mostrar Visor
                    </button>
                </div>
                
                <div id="gcode-viewer-container" class="hidden space-y-4">
                    <!-- Navegación de archivos y toggle 2D/3D -->
                    <div class="bg-white rounded-lg p-3 border">
                        <div class="flex items-center justify-between mb-3">
                            <!-- Información del archivo actual y navegación -->
                            <div class="flex items-center space-x-3 flex-1">
                                <span class="text-sm font-medium text-gray-700">📄 Archivo:</span>
                                <span id="current-gcode-filename" class="text-sm text-blue-600 font-medium">Cargando...</span>
                                <span id="gcode-file-counter" class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">0/0</span>
                            </div>
                            <!-- Toggle 2D/3D -->
                            <div class="flex items-center space-x-2">
                                <button onclick="switchViewMode('2d')" id="btn-2d-view" class="px-3 py-1 text-sm bg-blue-500 text-white rounded transition-colors">
                                    📐 Vista 2D
                                </button>
                                <button onclick="switchViewMode('3d')" id="btn-3d-view" class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors">
                                    🧊 Vista 3D
                                </button>
                            </div>
                        </div>
                        
                        <!-- Navegación entre archivos (solo visible si hay múltiples archivos) -->
                        <div id="file-navigation" class="hidden flex items-center justify-center space-x-2 mt-2 pt-2 border-t">
                            <button onclick="previousGcodeFile()" id="btn-prev-file" class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                ⏮️ Archivo Anterior
                            </button>
                            <button onclick="nextGcodeFile()" id="btn-next-file" class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                Siguiente Archivo ⏭️
                            </button>
                        </div>
                    </div>
                    
                    <!-- Canvas de visualización 2D -->
                    <div id="canvas-2d-container" class="bg-white rounded-lg border overflow-hidden">
                        <div class="relative" style="height: 400px;">
                            <canvas id="gcode-canvas" class="w-full h-full"></canvas>
                            <div id="gcode-loading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 hidden">
                                <div class="text-center">
                                    <div class="animate-spin text-4xl mb-2">⚙️</div>
                                    <div class="text-sm text-gray-600">Cargando G-code...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Canvas de visualización 3D -->
                    <div id="canvas-3d-container" class="hidden bg-white rounded-lg border overflow-hidden">
                        <div class="relative" style="height: 500px;">
                            <div id="gcode-3d-canvas"></div>
                            <div class="absolute top-3 right-3 bg-white bg-opacity-90 rounded-lg p-2 text-xs space-y-1 shadow-lg">
                                <div class="font-medium text-gray-700">Controles 3D:</div>
                                <div class="text-gray-600">🖱️ Clic izq: Rotar</div>
                                <div class="text-gray-600">🖱️ Scroll: Zoom</div>
                                <div class="text-gray-600">🖱️ Clic der: Pan</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Controles de navegación por capas -->
                    <div class="bg-white rounded-lg p-4 border space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-700">Capa: <span id="current-layer-display">0</span> / <span id="total-layers-display">0</span></span>
                            <span class="text-xs text-gray-500">Altura: <span id="layer-height-display">0.00</span> mm</span>
                        </div>
                        
                        <!-- Slider de capas -->
                        <input type="range" id="layer-slider" min="0" max="0" value="0" 
                               oninput="updateGcodeLayer(this.value)" 
                               class="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-thumb">
                        
                        <!-- Botones de navegación -->
                        <div class="flex items-center justify-center space-x-2">
                            <button onclick="previousLayer()" class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors">
                                ⏮️ Anterior
                            </button>
                            <button onclick="toggleLayerAnimation()" id="play-pause-btn" class="px-4 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors">
                                ▶️ Reproducir
                            </button>
                            <button onclick="nextLayer()" class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors">
                                Siguiente ⏭️
                            </button>
                        </div>
                        
                        <!-- Información de la capa actual -->
                        <div class="grid grid-cols-3 gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <div class="text-center">
                                <div class="font-medium text-gray-900" id="layer-time">0 min</div>
                                <div class="text-gray-500">Tiempo capa</div>
                            </div>
                            <div class="text-center">
                                <div class="font-medium text-gray-900" id="layer-filament">0.0 g</div>
                                <div class="text-gray-500">Filamento</div>
                            </div>
                            <div class="text-center">
                                <div class="font-medium text-gray-900" id="layer-moves">0</div>
                                <div class="text-gray-500">Movimientos</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Opciones de visualización -->
                    <div class="bg-white rounded-lg p-3 border">
                        <div class="grid grid-cols-2 gap-3">
                            <label class="flex items-center space-x-2 text-sm">
                                <input type="checkbox" id="show-travels" onchange="updateGcodeVisualization()" checked class="w-4 h-4 text-blue-600 rounded">
                                <span>Mostrar desplazamientos</span>
                            </label>
                            <label class="flex items-center space-x-2 text-sm">
                                <input type="checkbox" id="show-retractions" onchange="updateGcodeVisualization()" checked class="w-4 h-4 text-blue-600 rounded">
                                <span>Mostrar retracciones</span>
                            </label>
                            <label class="flex items-center space-x-2 text-sm">
                                <input type="checkbox" id="color-by-speed" onchange="updateGcodeVisualization()" class="w-4 h-4 text-blue-600 rounded">
                                <span>Colorear por velocidad</span>
                            </label>
                            <label class="flex items-center space-x-2 text-sm">
                                <input type="checkbox" id="show-grid" onchange="updateGcodeVisualization()" checked class="w-4 h-4 text-blue-600 rounded">
                                <span>Mostrar grid</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
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
// FUNCIONES PARA VISOR DE G-CODE
// ===============================

let gcodeData = {
    layers: [],
    currentLayer: 0,
    isAnimating: false,
    animationInterval: null,
    canvas: null,
    ctx: null,
    bounds: { minX: 0, maxX: 200, minY: 0, maxY: 200, minZ: 0, maxZ: 100 },
    // Variables 3D
    viewMode: '2d',
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    lines3D: [],
    buildPlate: null,
    // Variables para navegación de archivos
    availableFiles: [],
    currentFileIndex: 0
};

function toggleGcodeViewer() {
    const container = document.getElementById('gcode-viewer-container');
    const btn = document.getElementById('toggle-gcode-btn');
    
    if (!container || !btn) return;
    
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        btn.textContent = '👁️ Ocultar Visor';
        
        // Inicializar canvas y cargar archivos disponibles
        setTimeout(() => {
            initializeGcodeCanvas();
            loadAvailableGcodeFiles();  // Esto ahora cargará automáticamente el primer archivo
        }, 100);
    } else {
        container.classList.add('hidden');
        btn.textContent = '👁️ Mostrar Visor';
        
        // Detener animación si está activa
        if (gcodeData.isAnimating) {
            toggleLayerAnimation();
        }
        
        // Limpiar visor 3D si está activo
        if (gcodeData.viewMode === '3d' && typeof window.cleanup3DViewer === 'function') {
            window.cleanup3DViewer();
        }
    }
}

function initializeGcodeCanvas() {
    const canvas = document.getElementById('gcode-canvas');
    if (!canvas) return;
    
    gcodeData.canvas = canvas;
    
    // Ajustar tamaño del canvas al contenedor
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    gcodeData.ctx = canvas.getContext('2d');
    
    // Dibujar grid inicial
    drawGrid();
}

async function loadAvailableGcodeFiles() {
    try {
        console.log('🔍 Cargando archivos G-code de la sesión:', currentWizardSessionId);
        
        // Obtener lista de archivos G-code procesados de la sesión actual
        const response = await fetch(`/api/print/gcode-files/${currentWizardSessionId}`);
        const data = await response.json();
        
        if (!data.success || !data.files || data.files.length === 0) {
            console.warn('No hay archivos G-code disponibles para esta sesión');
            updateFileNavigationUI('Sin archivos', 0, 0);
            showToast('Info', 'No hay archivos G-code disponibles para previsualizar', 'info');
            return;
        }
        
        // Guardar archivos disponibles
        gcodeData.availableFiles = data.files;
        gcodeData.currentFileIndex = 0;
        
        console.log(`✅ Encontrados ${data.files.length} archivos G-code`);
        
        // Cargar automáticamente el primer archivo
        await loadGcodeFileByIndex(0);
        
        // Actualizar UI de navegación
        updateFileNavigationUI();
        
    } catch (error) {
        console.error('Error cargando lista de archivos G-code:', error);
        updateFileNavigationUI('Error al cargar', 0, 0);
        
        // Fallback: cargar demo
        console.log('📄 Cargando demo como fallback');
        loadGcodeFile('demo');
    }
}

async function loadGcodeFile(filePath) {
    if (!filePath) {
        console.warn('⚠️ loadGcodeFile llamado sin filePath');
        return;
    }
    
    console.log(`📂 loadGcodeFile iniciado: ${filePath}`);
    console.log(`📊 Modo actual: ${gcodeData.viewMode || '2d (default)'}`);
    
    const loadingEl = document.getElementById('gcode-loading');
    if (loadingEl) loadingEl.classList.remove('hidden');
    
    try {
        if (filePath === 'demo') {
            // Cargar datos de demostración
            console.log('🎨 Cargando G-code de demostración...');
            loadDemoGcode();
        } else {
            // Cargar archivo G-code real
            console.log('📄 Cargando archivo G-code:', filePath);
            const response = await fetch(`/api/print/gcode-content?file=${encodeURIComponent(filePath)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const gcodeContent = await response.text();
            console.log(`📏 Contenido recibido: ${gcodeContent.length} caracteres`);
            parseGcode(gcodeContent);
        }
        
        // Actualizar slider máximo
        const slider = document.getElementById('layer-slider');
        if (slider && gcodeData.layers.length > 0) {
            slider.max = gcodeData.layers.length - 1;
            slider.value = 0;
            console.log(`✅ Cargadas ${gcodeData.layers.length} capas`);
        } else {
            console.warn(`⚠️ No se detectaron capas o slider no encontrado. Capas: ${gcodeData.layers.length}`);
        }
        
        // Resetear a primera capa
        gcodeData.currentLayer = 0;
        
        // Actualizar UI
        updateLayerInfo();
        
        console.log(`🎨 Llamando updateGcodeVisualization() en modo: ${gcodeData.viewMode}`);
        
        // Renderizar según el modo actual (2D o 3D)
        updateGcodeVisualization();
        
        console.log('✨ Visor de G-code listo');
        
    } catch (error) {
        console.error('❌ Error cargando G-code:', error);
        showToast('Error', 'No se pudo cargar el archivo G-code', 'error');
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}

// Nuevas funciones para navegación entre archivos
async function loadGcodeFileByIndex(index) {
    if (index < 0 || index >= gcodeData.availableFiles.length) {
        console.warn('Índice de archivo fuera de rango:', index);
        return;
    }
    
    gcodeData.currentFileIndex = index;
    const file = gcodeData.availableFiles[index];
    
    console.log(`📄 Cargando archivo ${index + 1}/${gcodeData.availableFiles.length}: ${file.filename}`);
    
    // Si estamos en modo 3D, limpiar el visor antes de cargar nuevo archivo
    if (gcodeData.viewMode === '3d' && typeof window.cleanup3DViewer === 'function') {
        console.log('🧹 Limpiando visor 3D antes de cargar nuevo archivo...');
        window.cleanup3DViewer();
    }
    
    // Actualizar UI
    updateFileNavigationUI();
    
    // Cargar el archivo
    await loadGcodeFile(file.path);
    
    // Si estamos en modo 3D, reinicializar el visor después de cargar
    if (gcodeData.viewMode === '3d' && gcodeData.layers.length > 0) {
        console.log('🎬 Reinicializando visor 3D con nuevo archivo...');
        if (typeof window.initialize3DViewer === 'function') {
            window.initialize3DViewer();
        }
        if (typeof window.render3DLayer === 'function') {
            window.render3DLayer();
        }
    }
}

function updateFileNavigationUI(customFilename = null, customIndex = null, customTotal = null) {
    const filenameEl = document.getElementById('current-gcode-filename');
    const counterEl = document.getElementById('gcode-file-counter');
    const navigationEl = document.getElementById('file-navigation');
    const prevBtn = document.getElementById('btn-prev-file');
    const nextBtn = document.getElementById('btn-next-file');
    
    if (customFilename !== null) {
        // Modo manual (para mostrar mensajes de error)
        if (filenameEl) filenameEl.textContent = customFilename;
        if (counterEl) counterEl.textContent = `${customIndex}/${customTotal}`;
        if (navigationEl) navigationEl.classList.add('hidden');
        return;
    }
    
    // Modo normal (con archivos cargados)
    const totalFiles = gcodeData.availableFiles.length;
    const currentIndex = gcodeData.currentFileIndex;
    
    if (totalFiles === 0) {
        if (filenameEl) filenameEl.textContent = 'Sin archivos';
        if (counterEl) counterEl.textContent = '0/0';
        if (navigationEl) navigationEl.classList.add('hidden');
        return;
    }
    
    const currentFile = gcodeData.availableFiles[currentIndex];
    
    // Actualizar nombre del archivo (sin el prefijo kybercore_gcode_sessionid_)
    if (filenameEl && currentFile) {
        const cleanFilename = currentFile.filename.replace(/^kybercore_gcode_[a-f0-9-]+_/, '');
        filenameEl.textContent = cleanFilename;
    }
    
    // Actualizar contador
    if (counterEl) {
        counterEl.textContent = `${currentIndex + 1}/${totalFiles}`;
    }
    
    // Mostrar/ocultar navegación según cantidad de archivos
    if (navigationEl) {
        if (totalFiles > 1) {
            navigationEl.classList.remove('hidden');
            
            // Actualizar estado de botones
            if (prevBtn) {
                prevBtn.disabled = currentIndex === 0;
            }
            if (nextBtn) {
                nextBtn.disabled = currentIndex === totalFiles - 1;
            }
        } else {
            navigationEl.classList.add('hidden');
        }
    }
}

function previousGcodeFile() {
    if (gcodeData.currentFileIndex > 0) {
        loadGcodeFileByIndex(gcodeData.currentFileIndex - 1);
    }
}

function nextGcodeFile() {
    if (gcodeData.currentFileIndex < gcodeData.availableFiles.length - 1) {
        loadGcodeFileByIndex(gcodeData.currentFileIndex + 1);
    }
}

function parseGcode(gcodeContent) {
    console.log('🔍 Iniciando parseo de G-code...');
    const lines = gcodeContent.split('\n');
    console.log(`📊 Total de líneas a procesar: ${lines.length}`);
    
    let currentLayer = [];
    let currentZ = null;
    let lastZ = null;
    let currentX = 0, currentY = 0;
    let currentE = 0; // Para detectar retracciones
    let layerCount = 0;
    
    gcodeData.layers = [];
    gcodeData.bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
    
    lines.forEach((line, index) => {
        line = line.trim();
        
        // Detectar comentarios de capa (;LAYER:, ;LAYER_CHANGE, etc.)
        if (line.startsWith(';LAYER:') || line.startsWith(';LAYER_CHANGE') || line.includes('layer') && line.startsWith(';')) {
            if (currentLayer.length > 0 && lastZ !== null) {
                gcodeData.layers.push({ 
                    z: lastZ, 
                    moves: currentLayer, 
                    height: lastZ,
                    layerNumber: layerCount
                });
                console.log(`✅ Capa ${layerCount} guardada (Z=${lastZ.toFixed(2)}mm, ${currentLayer.length} movimientos)`);
                layerCount++;
                currentLayer = [];
            }
        }
        
        // Parsear movimientos G1 (extrusión) y G0 (desplazamiento)
        if (line.startsWith('G1 ') || line.startsWith('G0 ')) {
            const move = {
                type: 'travel', // Se determinará después según valor E
                x: currentX,
                y: currentY,
                z: currentZ !== null ? currentZ : 0,
                e: 0,
                f: 0
            };
            
            // Extraer coordenadas X, Y, Z
            const xMatch = line.match(/X([-\d.]+)/);
            const yMatch = line.match(/Y([-\d.]+)/);
            const zMatch = line.match(/Z([-\d.]+)/);
            const eMatch = line.match(/E([-\d.]+)/);
            const fMatch = line.match(/F([-\d.]+)/);
            
            // Extraer valor E y determinar tipo de movimiento
            let newE = currentE;
            if (eMatch) {
                newE = parseFloat(eMatch[1]);
                move.e = newE;
                
                // Determinar tipo basado en cambio de E
                const deltaE = newE - currentE;
                if (deltaE < -0.001) {
                    move.type = 'retract'; // Retracción
                } else if (deltaE > 0.001) {
                    move.type = 'extrude'; // Extrusión
                } else {
                    move.type = 'travel'; // Sin extrusión
                }
            } else if (line.startsWith('G0')) {
                move.type = 'travel'; // G0 siempre es travel
            }
            
            if (fMatch) move.f = parseFloat(fMatch[1]);
            
            // Detectar cambio de Z (nueva capa)
            if (zMatch) {
                const newZ = parseFloat(zMatch[1]);
                if (currentZ !== null && newZ !== currentZ && currentLayer.length > 0) {
                    // Guardar capa anterior antes de cambiar Z
                    gcodeData.layers.push({ 
                        z: currentZ, 
                        moves: currentLayer, 
                        height: currentZ,
                        layerNumber: layerCount
                    });
                    console.log(`✅ Capa ${layerCount} guardada por cambio Z (Z=${currentZ.toFixed(2)}mm, ${currentLayer.length} movimientos)`);
                    layerCount++;
                    currentLayer = [];
                }
                currentZ = newZ;
                lastZ = newZ;
                move.z = currentZ;
                
                // Actualizar bounds Z
                gcodeData.bounds.minZ = Math.min(gcodeData.bounds.minZ, currentZ);
                gcodeData.bounds.maxZ = Math.max(gcodeData.bounds.maxZ, currentZ);
            }
            
            if (xMatch) move.toX = parseFloat(xMatch[1]);
            if (yMatch) move.toY = parseFloat(yMatch[1]);
            if (eMatch) move.e = parseFloat(eMatch[1]);
            if (fMatch) move.f = parseFloat(fMatch[1]);
            
            // Actualizar posición actual
            if (move.toX !== undefined) {
                move.x = currentX;
                currentX = move.toX;
                gcodeData.bounds.minX = Math.min(gcodeData.bounds.minX, currentX);
                gcodeData.bounds.maxX = Math.max(gcodeData.bounds.maxX, currentX);
            }
            if (move.toY !== undefined) {
                move.y = currentY;
                currentY = move.toY;
                gcodeData.bounds.minY = Math.min(gcodeData.bounds.minY, currentY);
                gcodeData.bounds.maxY = Math.max(gcodeData.bounds.maxY, currentY);
            }
            
            // Actualizar E actual para detectar retracciones en próximo movimiento
            if (eMatch) {
                currentE = newE;
            }
            
            // Solo agregar movimientos con coordenadas válidas
            if (move.toX !== undefined || move.toY !== undefined) {
                currentLayer.push(move);
            }
        }
    });
    
    // Agregar última capa
    if (currentLayer.length > 0 && lastZ !== null) {
        gcodeData.layers.push({ 
            z: lastZ, 
            moves: currentLayer, 
            height: lastZ,
            layerNumber: layerCount
        });
        console.log(`✅ Última capa ${layerCount} guardada (Z=${lastZ.toFixed(2)}mm, ${currentLayer.length} movimientos)`);
    }
    
    console.log(`🎯 Parseo completo: ${gcodeData.layers.length} capas detectadas`);
    console.log(`📐 Bounds: X[${gcodeData.bounds.minX.toFixed(1)}, ${gcodeData.bounds.maxX.toFixed(1)}] Y[${gcodeData.bounds.minY.toFixed(1)}, ${gcodeData.bounds.maxY.toFixed(1)}] Z[${gcodeData.bounds.minZ.toFixed(1)}, ${gcodeData.bounds.maxZ.toFixed(1)}]`);
    
    // Actualizar slider
    const slider = document.getElementById('layer-slider');
    if (slider && gcodeData.layers.length > 0) {
        slider.max = gcodeData.layers.length - 1;
        slider.value = 0;
        console.log(`🎚️ Slider configurado: max=${slider.max}, value=${slider.value}`);
    } else if (gcodeData.layers.length === 0) {
        console.warn('⚠️ No se detectaron capas en el archivo G-code');
    }
    
    gcodeData.currentLayer = 0;
}

function loadDemoGcode() {
    console.log('🎨 Generando G-code de demostración...');
    
    // Generar datos de demostración (cubo de 50x50mm con 20 capas)
    gcodeData.layers = [];
    gcodeData.bounds = { minX: 75, maxX: 125, minY: 75, maxY: 125, minZ: 0, maxZ: 4 };
    
    for (let layer = 0; layer < 20; layer++) {
        const z = layer * 0.2;
        const moves = [];
        
        // Perímetro exterior (cuadrado)
        const size = 50;
        const centerX = 100;
        const centerY = 100;
        
        moves.push({ type: 'travel', x: centerX - size/2, y: centerY - size/2, toX: centerX - size/2, toY: centerY - size/2, z, e: 0, f: 3000 });
        moves.push({ type: 'extrude', x: centerX - size/2, y: centerY - size/2, toX: centerX + size/2, toY: centerY - size/2, z, e: 2, f: 1500 });
        moves.push({ type: 'extrude', x: centerX + size/2, y: centerY - size/2, toX: centerX + size/2, toY: centerY + size/2, z, e: 2, f: 1500 });
        moves.push({ type: 'extrude', x: centerX + size/2, y: centerY + size/2, toX: centerX - size/2, toY: centerY + size/2, z, e: 2, f: 1500 });
        moves.push({ type: 'extrude', x: centerX - size/2, y: centerY + size/2, toX: centerX - size/2, toY: centerY - size/2, z, e: 2, f: 1500 });
        
        // Relleno (líneas en zigzag)
        for (let i = 0; i < 8; i++) {
            const offset = (i + 1) * 5.5;
            moves.push({ type: 'travel', x: centerX - size/2 + offset, y: centerY - size/2 + 5, toX: centerX - size/2 + offset, toY: centerY - size/2 + 5, z, e: 0, f: 3000 });
            moves.push({ type: 'extrude', x: centerX - size/2 + offset, y: centerY - size/2 + 5, toX: centerX - size/2 + offset, toY: centerY + size/2 - 5, z, e: 1.5, f: 2000 });
        }
        
        gcodeData.layers.push({ z, moves, height: z });
    }
    
    console.log(`✅ Generadas ${gcodeData.layers.length} capas de demostración`);
    
    // Actualizar slider
    const slider = document.getElementById('layer-slider');
    if (slider) {
        slider.max = gcodeData.layers.length - 1;
        slider.value = 0;
        console.log('🎚️ Slider configurado: max =', slider.max);
    }
    
    gcodeData.currentLayer = 0;
}

function updateGcodeLayer(layerIndex) {
    gcodeData.currentLayer = parseInt(layerIndex);
    updateLayerInfo();
    updateGcodeVisualization();
}

function updateLayerInfo() {
    const currentLayerEl = document.getElementById('current-layer-display');
    const totalLayersEl = document.getElementById('total-layers-display');
    const layerHeightEl = document.getElementById('layer-height-display');
    const layerTimeEl = document.getElementById('layer-time');
    const layerFilamentEl = document.getElementById('layer-filament');
    const layerMovesEl = document.getElementById('layer-moves');
    
    if (gcodeData.layers.length === 0) {
        if (currentLayerEl) currentLayerEl.textContent = '0';
        if (totalLayersEl) totalLayersEl.textContent = '0';
        if (layerHeightEl) layerHeightEl.textContent = '0.00';
        if (layerTimeEl) layerTimeEl.textContent = '0 min';
        if (layerFilamentEl) layerFilamentEl.textContent = '0 g';
        if (layerMovesEl) layerMovesEl.textContent = '0';
        console.warn('⚠️ No hay capas para mostrar en updateLayerInfo');
        return;
    }
    
    const layer = gcodeData.layers[gcodeData.currentLayer];
    
    if (currentLayerEl) currentLayerEl.textContent = gcodeData.currentLayer + 1;
    if (totalLayersEl) totalLayersEl.textContent = gcodeData.layers.length;
    if (layerHeightEl) layerHeightEl.textContent = layer.height.toFixed(2);
    
    // Calcular estadísticas de la capa
    const extrudeMoves = layer.moves.filter(m => m.type === 'extrude').length;
    const totalFilament = layer.moves.reduce((sum, m) => sum + (m.e || 0), 0);
    const estimatedTime = (extrudeMoves * 0.5).toFixed(1); // Estimación simple
    
    if (layerTimeEl) layerTimeEl.textContent = `${estimatedTime} min`;
    if (layerFilamentEl) layerFilamentEl.textContent = `${totalFilament.toFixed(1)} g`;
    if (layerMovesEl) layerMovesEl.textContent = layer.moves.length;
    
    console.log(`📊 Capa ${gcodeData.currentLayer + 1}/${gcodeData.layers.length} - Altura: ${layer.height.toFixed(2)}mm, Movimientos: ${layer.moves.length}`);
}

function renderCurrentLayer() {
    if (!gcodeData.ctx || !gcodeData.canvas || gcodeData.layers.length === 0) return;
    
    const ctx = gcodeData.ctx;
    const canvas = gcodeData.canvas;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar grid
    const showGrid = document.getElementById('show-grid')?.checked;
    if (showGrid) {
        drawGrid();
    }
    
    // Configurar transformación para centrar y escalar el dibujo
    const bounds = gcodeData.bounds;
    const padding = 40;
    const scaleX = (canvas.width - padding * 2) / (bounds.maxX - bounds.minX);
    const scaleY = (canvas.height - padding * 2) / (bounds.maxY - bounds.minY);
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = padding - bounds.minX * scale;
    const offsetY = padding - bounds.minY * scale;
    
    // Dibujar todas las capas hasta la actual (con opacidad)
    const showTravels = document.getElementById('show-travels')?.checked;
    const colorBySpeed = document.getElementById('color-by-speed')?.checked;
    
    for (let i = 0; i <= gcodeData.currentLayer; i++) {
        const layer = gcodeData.layers[i];
        const opacity = i === gcodeData.currentLayer ? 1.0 : 0.3;
        
        layer.moves.forEach(move => {
            if (move.toX === undefined || move.toY === undefined) return;
            
            // Saltar desplazamientos si está deshabilitado
            if (move.type === 'travel' && !showTravels) return;
            
            ctx.beginPath();
            ctx.moveTo(move.x * scale + offsetX, move.y * scale + offsetY);
            ctx.lineTo(move.toX * scale + offsetX, move.toY * scale + offsetY);
            
            if (move.type === 'extrude') {
                // Color por velocidad o color sólido
                if (colorBySpeed && move.f) {
                    const speedRatio = Math.min(move.f / 3000, 1);
                    const hue = speedRatio * 120; // De rojo (0) a verde (120)
                    ctx.strokeStyle = `hsla(${hue}, 80%, 50%, ${opacity})`;
                } else {
                    ctx.strokeStyle = `rgba(37, 99, 235, ${opacity})`; // Azul
                }
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = `rgba(156, 163, 175, ${opacity * 0.5})`; // Gris claro
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 3]);
            }
            
            ctx.stroke();
            ctx.setLineDash([]);
        });
    }
    
    // Dibujar indicador de posición actual
    const currentLayer = gcodeData.layers[gcodeData.currentLayer];
    if (currentLayer.moves.length > 0) {
        const lastMove = currentLayer.moves[currentLayer.moves.length - 1];
        if (lastMove.toX !== undefined && lastMove.toY !== undefined) {
            ctx.beginPath();
            ctx.arc(lastMove.toX * scale + offsetX, lastMove.toY * scale + offsetY, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'; // Rojo
            ctx.fill();
        }
    }
}

function drawGrid() {
    if (!gcodeData.ctx || !gcodeData.canvas) return;
    
    const ctx = gcodeData.ctx;
    const canvas = gcodeData.canvas;
    
    ctx.strokeStyle = 'rgba(229, 231, 235, 0.5)';
    ctx.lineWidth = 1;
    
    // Líneas verticales
    for (let x = 0; x <= canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Líneas horizontales
    for (let y = 0; y <= canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Ejes principales
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.8)';
    ctx.lineWidth = 2;
    
    // Eje X
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // Eje Y
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
}

function previousLayer() {
    if (gcodeData.currentLayer > 0) {
        gcodeData.currentLayer--;
        const slider = document.getElementById('layer-slider');
        if (slider) slider.value = gcodeData.currentLayer;
        updateLayerInfo();
        updateGcodeVisualization();
    }
}

function nextLayer() {
    if (gcodeData.currentLayer < gcodeData.layers.length - 1) {
        gcodeData.currentLayer++;
        const slider = document.getElementById('layer-slider');
        if (slider) slider.value = gcodeData.currentLayer;
        updateLayerInfo();
        updateGcodeVisualization();
    }
}

function toggleLayerAnimation() {
    const btn = document.getElementById('play-pause-btn');
    if (!btn) return;
    
    if (gcodeData.isAnimating) {
        // Detener animación
        clearInterval(gcodeData.animationInterval);
        gcodeData.isAnimating = false;
        btn.innerHTML = '▶️ Reproducir';
    } else {
        // Iniciar animación
        gcodeData.isAnimating = true;
        btn.innerHTML = '⏸️ Pausar';
        
        gcodeData.animationInterval = setInterval(() => {
            if (gcodeData.currentLayer < gcodeData.layers.length - 1) {
                nextLayer();
            } else {
                // Reiniciar al llegar al final
                gcodeData.currentLayer = 0;
                const slider = document.getElementById('layer-slider');
                if (slider) slider.value = 0;
                updateLayerInfo();
                renderCurrentLayer();
            }
        }, 500); // 500ms por capa
    }
}

function updateGcodeVisualization() {
    console.log(`🔄 Actualizando visualización en modo: ${gcodeData.viewMode}`);
    
    // Redibujar con las nuevas opciones
    if (gcodeData.viewMode === '2d') {
        renderCurrentLayer();
    } else if (gcodeData.viewMode === '3d') {
        // Asegurarse de que el visor 3D esté inicializado
        if (!gcodeData.scene && typeof window.initialize3DViewer === 'function') {
            console.log('🎬 Inicializando visor 3D...');
            window.initialize3DViewer();
        }
        
        // Detectar si es archivo grande y usar renderizado apropiado
        const totalMoves = gcodeData.layers.reduce((acc, layer) => acc + layer.moves.length, 0);
        const isLargeFile = totalMoves > 30000; // Más de 30k movimientos = archivo grande
        
        if (isLargeFile) {
            console.log(`📦 Archivo grande detectado (${totalMoves} movimientos), usando renderizado progresivo`);
            showToast('Info', 'Archivo grande detectado. Renderizando de forma optimizada...', 'info');
            
            if (typeof window.render3DLayerProgressive === 'function') {
                window.render3DLayerProgressive();
            } else {
                console.warn('⚠️ Renderizado progresivo no disponible, usando estándar');
                window.render3DLayer();
            }
        } else {
            console.log(`📦 Archivo estándar (${totalMoves} movimientos), usando renderizado optimizado`);
            if (typeof window.render3DLayer === 'function') {
                window.render3DLayer();
            } else {
                console.error('❌ Función render3DLayer no disponible');
            }
        }
    }
}

// ===============================
// FUNCIONES PARA VISOR 3D
// ===============================

function switchViewMode(mode) {
    console.log(`🔄 Cambiando modo de vista a: ${mode}`);
    gcodeData.viewMode = mode;
    
    const canvas2D = document.getElementById('canvas-2d-container');
    const canvas3D = document.getElementById('canvas-3d-container');
    const btn2D = document.getElementById('btn-2d-view');
    const btn3D = document.getElementById('btn-3d-view');
    
    if (mode === '2d') {
        canvas2D?.classList.remove('hidden');
        canvas3D?.classList.add('hidden');
        btn2D?.classList.remove('bg-gray-200', 'hover:bg-gray-300');
        btn2D?.classList.add('bg-blue-500', 'text-white');
        btn3D?.classList.remove('bg-blue-500', 'text-white');
        btn3D?.classList.add('bg-gray-200', 'hover:bg-gray-300');
        renderCurrentLayer();
    } else {
        canvas2D?.classList.add('hidden');
        canvas3D?.classList.remove('hidden');
        btn2D?.classList.remove('bg-blue-500', 'text-white');
        btn2D?.classList.add('bg-gray-200', 'hover:bg-gray-300');
        btn3D?.classList.remove('bg-gray-200', 'hover:bg-gray-300');
        btn3D?.classList.add('bg-blue-500', 'text-white');
        
        // Inicializar visor 3D si no existe
        if (!gcodeData.scene) {
            if (typeof window.initialize3DViewer === 'function') {
                window.initialize3DViewer();
            } else {
                console.error('❌ Módulo de visor 3D no cargado');
                showToast('Error', 'No se pudo cargar el visor 3D', 'error');
                return;
            }
        }
        
        // Renderizar capa actual
        if (typeof window.render3DLayer === 'function') {
            window.render3DLayer();
        }
    }
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
        // 🆕 FASE 1: Validar estado de la impresora antes de confirmar
        showToast('Validando', 'Verificando estado de la impresora...', 'info');
        
        // Obtener printer_id de la variable global selectedPrinterData
        const printerId = selectedPrinterData?.printer_id;
        if (!printerId) {
            showToast('Error', 'No se ha seleccionado una impresora', 'error');
            return;
        }
        
        // Consultar estado detallado de la impresora
        const statusResult = await validatePrinterStatus(printerId);
        
        if (!statusResult.reachable) {
            // Impresora no alcanzable
            showToast('Impresora No Disponible', statusResult.recommendation || 'La impresora no está alcanzable', 'error');
            
            // TODO FASE 3: Ofrecer guardar trabajo
            // await saveJobAndNotify(currentWizardSessionId, statusResult);
            return;
        }
        
        if (statusResult.is_error) {
            // Impresora en estado de error
            showToast('Error Detectado', 'La impresora reporta un error. Intentando recuperación...', 'warning');
            
            // TODO FASE 2: Intentar recuperación automática
            // const recoverySuccess = await attemptRecoveryFlow(printerId);
            // if (!recoverySuccess) {
            //     showToast('Recuperación Fallida', 'No se pudo recuperar la impresora automáticamente', 'error');
            //     return;
            // }
            
            // Por ahora, solo informamos
            showToast('Error', `La impresora está en error: ${statusResult.state_message}`, 'error');
            return;
        }
        
        if (statusResult.is_printing) {
            // Impresora ocupada imprimiendo
            showToast('Impresora Ocupada', 'La impresora está actualmente imprimiendo', 'warning');
            
            // TODO FASE 4: Ofrecer cambiar de impresora
            // const switchPrinter = await switchToAnotherPrinter(currentWizardSessionId);
            // if (!switchPrinter) return;
            
            showToast('Impresora Ocupada', statusResult.recommendation || 'La impresora está actualmente imprimiendo otro trabajo', 'warning');
            return;
        }
        
        if (!statusResult.can_print) {
            // Impresora no lista (paused, standby, etc.)
            showToast('Impresora No Lista', `Estado actual: ${statusResult.status}. ${statusResult.recommendation || ''}`, 'warning');
            return;
        }
        
        // ✅ Impresora lista, proceder con confirmación
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

// 🆕 FASE 1: Función para validar el estado detallado de una impresora
async function validatePrinterStatus(printerId) {
    try {
        const response = await fetch(`/api/printers/${printerId}/status`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const status = await response.json();
        
        console.log('📊 Estado de impresora:', status);
        
        return status;
        
    } catch (error) {
        console.error('❌ Error validando estado de impresora:', error);
        
        return {
            printer_id: printerId,
            printer_name: 'Desconocida',
            reachable: false,
            status: 'error',
            state_message: error.message,
            can_print: false,
            errors: [`Error de conexión: ${error.message}`],
            recommendation: 'Verifica la conexión con el servidor KyberCore'
        };
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
