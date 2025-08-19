/**
 * Gallery Main Functions
 * Funciones principales para la gestión de la galería de proyectos
 */

console.log('📦 gallery_functions.js loaded at:', new Date().toISOString());

// Función para mostrar detalles de un proyecto en el modal
function showProjectDetails(projectTitle, projectData = null) {
    // Datos de ejemplo o datos reales del proyecto
    const defaultProjectData = {
        id: projectTitle.toLowerCase().replace(/\s+/g, '-'),
        title: projectTitle,
        icon: '📁',
        files: [
            { name: 'pieza_principal.stl', size: '2.1 MB', validated: true },
            { name: 'engranaje_1.stl', size: '1.3 MB', validated: true },
            { name: 'engranaje_2.stl', size: '1.3 MB', validated: true },
            { name: 'carcasa_superior.stl', size: '3.2 MB', validated: true },
            { name: 'carcasa_inferior.stl', size: '3.1 MB', validated: true }
        ],
        stats: {
            pieces: '5 piezas',
            totalTime: '8h 45m',
            filament: '120.5g',
            cost: '€3.25',
            volume: '45.3 cm³',
            created: '15 Jul 2025'
        },
        aiAnalysis: {
            sequence: 'Primero las carcasas, luego engranajes',
            parallelization: '2 impresoras pueden trabajar simultáneamente',
            materials: 'PETG para ejes, PLA para carcasas',
            postProcessing: 'Lijado requerido en engranajes',
            estimatedTime: '8h 45m (con 2 impresoras)'
        },
        status: {
            items: [
                'Todos los archivos STL validados',
                'Análisis de ensamblaje completado',
                'Tolerancias verificadas (±0.1mm)',
                'Listo para impresión inmediata'
            ]
        }
    };

    // Usar datos proporcionados o datos por defecto
    const finalProjectData = projectData || defaultProjectData;
    finalProjectData.title = projectTitle; // Asegurar que el título coincida

    // Abrir el modal con los datos del proyecto
    if (typeof projectModal !== 'undefined' && projectModal) {
        projectModal.open(finalProjectData);
    } else {
        console.error('Project modal not initialized');
    }
}

// Sistema de notificaciones toast
function showToast(title, message, type = 'info', duration = 3000) {
    // Crear contenedor si no existe
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `bg-white border-l-4 p-4 shadow-lg rounded-r max-w-sm transform transition-all duration-300 ease-in-out translate-x-full`;
    
    // Clases de color según tipo
    const typeClasses = {
        'success': 'border-green-500',
        'error': 'border-red-500',
        'warning': 'border-yellow-500',
        'info': 'border-blue-500'
    };
    
    toast.classList.add(typeClasses[type] || typeClasses.info);
    
    toast.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="font-semibold text-gray-800">${title}</div>
                <div class="text-gray-600 text-sm mt-1">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-400 hover:text-gray-600">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            </button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Auto eliminar
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }
    }, duration);
}

// Funciones de simulación para botones del header
function createNewProject() {
    showToast('Nuevo Proyecto', 'Abriendo asistente para crear nuevo proyecto...', 'info');
    setTimeout(() => {
        showToast('Proyecto Creado', 'Proyecto "MiniBot v2.1" creado exitosamente', 'success');
    }, 2000);
}

function analyzeAllProjects() {
    showToast('Análisis IA', 'Iniciando análisis inteligente de todos los proyectos...', 'info');
    setTimeout(() => {
        showToast('Análisis Completo', 'Se han identificado 3 optimizaciones y 2 recomendaciones', 'success');
    }, 3000);
}

function showProjectsStatistics() {
    showToast('Estadísticas', 'Generando reporte estadístico completo...', 'info');
    setTimeout(() => {
        showToast('Reporte Generado', 'Estadísticas disponibles: 12 proyectos, 147 impresiones exitosas', 'success');
    }, 2500);
}

// Funciones de acciones individuales de proyecto
function exportProject(projectId) {
    console.log('📤 exportProject called with ID:', projectId);
    if (!projectId) {
        showToast('Error', 'ID de proyecto no proporcionado', 'error');
        return;
    }
    showToast('Exportando', `Preparando exportación del proyecto...`, 'info');
    fetch(`/api/gallery/projects/${projectId}/export`, { method: 'POST' })
        .then(resp => resp.json())
        .then(data => {
            showToast('Exportación Completa', data.message || 'Exportación finalizada', 'success');
        })
        .catch(err => {
            console.error(err);
            showToast('Error', 'No se pudo exportar el proyecto', 'error');
        });
}

function duplicateProject(projectId) {
    console.log('📋 duplicateProject called with ID:', projectId);
    if (!projectId) {
        showToast('Error', 'ID de proyecto no proporcionado', 'error');
        return;
    }
    showToast('Duplicando', `Creando copia del proyecto...`, 'info');
    fetch(`/api/gallery/projects/${projectId}/duplicate`, { method: 'POST' })
        .then(resp => resp.json())
        .then(data => {
            showToast('Proyecto Duplicado', data.message || 'Copia creada', 'success');
            if (typeof reloadGallery === 'function') reloadGallery();
        })
        .catch(err => {
            console.error(err);
            showToast('Error', 'No se pudo duplicar el proyecto', 'error');
        });
}

function deleteProject(projectId) {
    console.log('🗑️ deleteProject called with ID:', projectId);
    if (!projectId) {
        showToast('Error', 'ID de proyecto no proporcionado', 'error');
        return;
    }
    if (!confirm(`¿Estás seguro de que deseas eliminar el proyecto con ID ${projectId}?`)) return;

    showToast('Eliminando', `Eliminando proyecto...`, 'warning');
    fetch(`/api/gallery/projects/${projectId}/delete`, { method: 'POST' })
        .then(resp => resp.json())
        .then(data => {
            showToast('Proyecto Eliminado', data.message || 'Eliminado', 'success');
            // Remover tarjeta del DOM
            const card = document.querySelector(`[data-project-id="${projectId}"]`);
            if (card) card.remove();
            if (typeof reloadGallery === 'function') reloadGallery();
        })
        .catch(err => {
            console.error(err);
            showToast('Error', 'No se pudo eliminar el proyecto', 'error');
        });
}

// Toggle favorito
function favoriteProject(projectId, buttonEl) {
    console.log('⭐ favoriteProject called with ID:', projectId, 'buttonEl:', buttonEl);
    fetch(`/api/gallery/projects/${projectId}/favorite`, { method: 'POST' })
        .then(resp => resp.json())
        .then(data => {
            if (data && typeof data.favorito !== 'undefined') {
                // Actualizar UI solo si el backend confirma
                if (buttonEl) {
                    buttonEl.classList.toggle('text-yellow-400', data.favorito);
                    buttonEl.classList.toggle('text-gray-400', !data.favorito);
                }
                showToast('Favorito', data.message || 'Favorito actualizado', 'success');
            } else {
                showToast('Error', 'Respuesta inesperada del servidor', 'error');
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Error', 'No se pudo actualizar favorito', 'error');
        });
}

// Inicialización de event listeners para la galería

function initGalleryClickHandler() {
    if (window._kyber_gallery_click_bound) {
        console.log('⚠️ Gallery click handler already bound, skipping');
        return;
    }

    const _kyberGalleryHandler = function(e) {
        const el = e.target.closest('[data-action]');
        if (!el) return;

        const action = el.getAttribute('data-action');
        let projectId = el.getAttribute('data-project-id');
        if (!projectId) {
            const card = el.closest('[data-project-id]');
            if (card) projectId = card.getAttribute('data-project-id');
        }

        console.log('🔍 Gallery click captured:', el);
        console.log('⚡ Action:', action, 'ProjectID:', projectId);
        if (!action) return;

        e.preventDefault();
        const normalizedAction = action === 'view-project' ? 'view' : action;

        switch (normalizedAction) {
            case 'view': {
                console.log('👁️ View action triggered');
                if (projectId) {
                    fetch(`/api/gallery/projects/${projectId}`)
                        .then(resp => { if (!resp.ok) throw new Error('Proyecto no encontrado'); return resp.json(); })
                        .then(projectData => {
                            const modalData = {
                                id: projectData.id,
                                title: projectData.nombre || projectData.title || `Proyecto ${projectData.id}`,
                                files: projectData.archivos || projectData.files || [],
                                stats: {
                                    pieces: (projectData.badges && projectData.badges.piezas) ? projectData.badges.piezas : (projectData.files ? `${projectData.files.length} piezas` : 'N/A'),
                                    totalTime: (projectData.aiAnalysis && projectData.aiAnalysis.tiempo_estimado) ? projectData.aiAnalysis.tiempo_estimado : 'N/A',
                                    filament: (projectData.aiAnalysis && projectData.aiAnalysis.filamento_total) ? projectData.aiAnalysis.filamento_total : 'N/A',
                                    cost: (projectData.aiAnalysis && projectData.aiAnalysis.costo_estimado) ? projectData.aiAnalysis.costo_estimado : 'N/A',
                                    volume: (projectData.aiAnalysis && projectData.aiAnalysis.volumen_total) ? projectData.aiAnalysis.volumen_total : 'N/A',
                                    created: projectData.fecha_creacion || projectData.created || 'N/A'
                                },
                                aiAnalysis: projectData.aiAnalysis || projectData.analisis_ia || {},
                                status: { items: [projectData.estado, projectData.progreso && projectData.progreso.mensaje].filter(Boolean) }
                            };
                            console.log('🎨 Mapped modal data:', modalData);
                            showProjectDetails(modalData.title, modalData);
                        })
                        .catch(err => { console.error(err); showToast('Error', 'No se pudo cargar el proyecto', 'error'); });
                } else {
                    const card = el.closest('[data-project-id]');
                    const titleEl = card ? card.querySelector('h3') : null;
                    const title = titleEl ? titleEl.textContent.trim() : 'Proyecto';
                    showProjectDetails(title);
                }
                break;
            }
            case 'favorite': {
                console.log('⭐ Favorite action triggered');
                if (projectId) favoriteProject(parseInt(projectId, 10), el);
                break;
            }
            case 'export': {
                console.log('📤 Export action triggered');
                if (projectId) exportProject(parseInt(projectId, 10));
                break;
            }
            case 'duplicate': {
                console.log('📋 Duplicate action triggered');
                if (projectId) duplicateProject(parseInt(projectId, 10));
                break;
            }
            case 'delete': {
                console.log('🗑️ Delete action triggered');
                if (projectId) deleteProject(parseInt(projectId, 10));
                break;
            }
        }

        e.stopPropagation && e.stopPropagation();
        e.stopImmediatePropagation && e.stopImmediatePropagation();
    };

    document.addEventListener('click', _kyberGalleryHandler, true);
    window._kyber_gallery_click_bound = true;
    console.log('✅ Gallery capture-phase click handler bound successfully');
}

// Inicializar inmediatamente si el DOM está listo, o esperar si no
if (document.readyState === 'loading') {
    console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 DOMContentLoaded fired for gallery_functions.js');
        initGalleryClickHandler();
    });
} else {
    console.log('✅ DOM already loaded, initializing immediately');
    initGalleryClickHandler();
}

// Fin de gallery_functions.js
