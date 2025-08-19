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
            // Si el servidor devuelve los datos del proyecto duplicado, agregarlo al DOM
            if (data.proyecto) {
                addProjectToGallery(data.proyecto);
            } else {
                // Fallback: crear una copia del proyecto original si no viene en la respuesta
                const originalCard = document.querySelector(`[data-project-id="${projectId}"]`);
                if (originalCard) {
                    createDuplicateFromOriginal(originalCard, data.newProjectId || (Date.now()));
                }
            }
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
            // Remover tarjeta del DOM con animación
            const card = document.querySelector(`[data-project-id="${projectId}"]`);
            if (card) {
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    card.remove();
                    // Actualizar estadísticas después de eliminar
                    updateGalleryStats(-1); // -1 proyecto
                }, 300);
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Error', 'No se pudo eliminar el proyecto', 'error');
        });
}

// Función para agregar un proyecto al DOM dinámicamente
function addProjectToGallery(proyecto) {
    const gallery = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4');
    if (!gallery) {
        console.error('No se encontró el contenedor de la galería');
        return;
    }

    // Crear el HTML de la nueva tarjeta
    const estadoColors = {
        'completado': 'bg-green-500',
        'en_progreso': 'bg-blue-500',
        'listo': 'bg-purple-500',
        'problemas': 'bg-yellow-500'
    };
    
    const progressColors = {
        'completado': 'bg-green-500',
        'en_progreso': 'bg-blue-500',
        'listo': 'bg-purple-500',
        'problemas': 'bg-yellow-500'
    };

    const estadoClass = estadoColors[proyecto.estado] || 'bg-gray-500';
    const progressClass = progressColors[proyecto.estado] || 'bg-gray-500';
    const favoriteClass = proyecto.favorito ? 'text-yellow-400' : 'text-gray-400';

    const cardHTML = `
        <div data-project-id="${proyecto.id}" class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300" style="opacity: 0; transform: scale(0.8);">
            <!-- Imagen del proyecto -->
            <div class="relative h-48 bg-gray-100">
                ${proyecto.imagen ? 
                    `<img src="${proyecto.imagen}" alt="${proyecto.nombre}" class="w-full h-full object-cover">` :
                    `<div class="w-full h-full flex items-center justify-center text-gray-400">
                        <div class="text-center">
                            <div class="text-4xl mb-2">🏗️</div>
                            <p class="text-sm">Sin imagen</p>
                        </div>
                    </div>`
                }
                
                <!-- Badge de estado -->
                <div class="absolute top-3 left-3 ${estadoClass} text-white px-3 py-1 rounded-full text-sm font-medium">
                    ${proyecto.badges?.estado || proyecto.estado}
                </div>
                
                <!-- Botón de favorito -->
                <button data-action="favorite" data-project-id="${proyecto.id}" class="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors ${favoriteClass}">
                    ⭐
                </button>
            </div>
            
            <!-- Contenido del proyecto -->
            <div class="p-6">
                <div class="flex items-start justify-between mb-3">
                    <h3 class="font-bold text-lg text-gray-900 leading-tight">${proyecto.nombre}</h3>
                    <div class="flex flex-col gap-1 text-xs">
                        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">${proyecto.badges?.tipo || 'Proyecto'}</span>
                        <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-md">${proyecto.badges?.piezas || (proyecto.archivos?.length || 0) + ' archivos'}</span>
                    </div>
                </div>
                
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">${proyecto.descripcion || 'Sin descripción'}</p>
                
                <!-- Progreso -->
                <div class="mb-4">
                    <div class="flex justify-between text-sm mb-1">
                        <span>Progreso</span>
                        <span>${proyecto.progreso?.porcentaje || 0}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="h-2 ${progressClass} rounded-full" style="width: ${proyecto.progreso?.porcentaje || 0}%"></div>
                    </div>
                    <div class="text-xs text-${proyecto.estado === 'completado' ? 'green' : 'blue'}-700 mt-1">${proyecto.progreso?.mensaje || 'Estado: ' + proyecto.estado}</div>
                </div>
                
                <!-- Botones de acción -->
                <div class="space-y-2">
                    <button data-action="view-project" data-project-id="${proyecto.id}" class="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:from-blue-600 hover:to-blue-700 transition-colors">
                        👁️ Ver Proyecto
                    </button>
                    
                    <div class="grid grid-cols-3 gap-2">
                        <button data-action="export" data-project-id="${proyecto.id}" class="px-2 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200 transition-colors">
                            📤 Exportar
                        </button>
                        <button data-action="duplicate" data-project-id="${proyecto.id}" class="px-2 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs hover:bg-purple-200 transition-colors">
                            📋 Duplicar
                        </button>
                        <button data-action="delete" data-project-id="${proyecto.id}" class="px-2 py-2 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 transition-colors">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
                
                <!-- Información adicional -->
                <div class="mt-4 pt-4 border-t border-gray-100">
                    <div class="flex items-center justify-between text-xs text-gray-500">
                        <span>Por: ${proyecto.autor || 'Usuario'}</span>
                        <span>${proyecto.archivos?.length || 0} archivos</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Agregar la nueva tarjeta al final de la galería
    gallery.insertAdjacentHTML('beforeend', cardHTML);
    
    // Animar la entrada
    const newCard = gallery.lastElementChild;
    setTimeout(() => {
        newCard.style.transition = 'opacity 0.3s, transform 0.3s';
        newCard.style.opacity = '1';
        newCard.style.transform = 'scale(1)';
    }, 50);

    console.log('✅ Proyecto agregado al DOM:', proyecto.nombre);
    // Actualizar estadísticas
    updateGalleryStats(1); // +1 proyecto
}

// Función para crear un duplicado basado en el proyecto original del DOM
function createDuplicateFromOriginal(originalCard, newProjectId) {
    const newCard = originalCard.cloneNode(true);
    
    // Actualizar el ID del nuevo proyecto
    newCard.setAttribute('data-project-id', newProjectId);
    
    // Actualizar todos los botones con el nuevo ID
    const actionButtons = newCard.querySelectorAll('[data-project-id]');
    actionButtons.forEach(button => {
        button.setAttribute('data-project-id', newProjectId);
    });
    
    // Modificar el título para indicar que es una copia
    const titleElement = newCard.querySelector('h3');
    if (titleElement) {
        titleElement.textContent = titleElement.textContent + ' - Copia';
    }
    
    // Resetear el estado de favorito para la copia
    const favoriteButton = newCard.querySelector('[data-action="favorite"]');
    if (favoriteButton) {
        favoriteButton.classList.remove('text-yellow-400');
        favoriteButton.classList.add('text-gray-400');
    }
    
    // Preparar animación
    newCard.style.opacity = '0';
    newCard.style.transform = 'scale(0.8)';
    
    // Agregar al DOM
    const gallery = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4');
    if (gallery) {
        gallery.appendChild(newCard);
        
        // Animar la entrada
        setTimeout(() => {
            newCard.style.transition = 'opacity 0.3s, transform 0.3s';
            newCard.style.opacity = '1';
            newCard.style.transform = 'scale(1)';
        }, 50);
        
        // Actualizar estadísticas
        updateGalleryStats(1);
        console.log('✅ Proyecto duplicado agregado al DOM con ID:', newProjectId);
    }
}

// Función para actualizar las estadísticas de la galería
function updateGalleryStats(projectChange = 0) {
    // Actualizar contador de proyectos totales
    const totalProjectsEl = document.querySelector('.bg-gradient-to-br.from-blue-500 .text-3xl');
    if (totalProjectsEl && projectChange !== 0) {
        const currentTotal = parseInt(totalProjectsEl.textContent) || 0;
        totalProjectsEl.textContent = currentTotal + projectChange;
    }
    
    // Recalcular número de archivos STL dinámicamente
    const totalFilesEl = document.querySelector('.bg-gradient-to-br.from-green-500 .text-3xl');
    if (totalFilesEl) {
        const allCards = document.querySelectorAll('[data-project-id]');
        let totalFiles = 0;
        allCards.forEach(card => {
            const fileCountEl = card.querySelector('.text-xs.text-gray-500:last-child');
            if (fileCountEl) {
                const fileText = fileCountEl.textContent;
                const fileCount = parseInt(fileText.match(/(\d+)/)?.[0] || '0');
                totalFiles += fileCount;
            }
        });
        totalFilesEl.textContent = totalFiles;
    }
}

// Toggle favorito
function favoriteProject(projectId, buttonEl) {
    console.log('⭐ favoriteProject called with ID:', projectId, 'buttonEl:', buttonEl);
    
    // UI optimista: cambiar inmediatamente el estado visual
    let currentlyFavorite = false;
    if (buttonEl) {
        currentlyFavorite = buttonEl.classList.contains('text-yellow-400');
        // Cambiar inmediatamente el estado visual
        buttonEl.classList.toggle('text-yellow-400', !currentlyFavorite);
        buttonEl.classList.toggle('text-gray-400', currentlyFavorite);
    }
    
    fetch(`/api/gallery/projects/${projectId}/favorite`, { method: 'POST' })
        .then(resp => resp.json())
        .then(data => {
            if (data && typeof data.favorito !== 'undefined') {
                // Verificar si necesitamos corregir el estado UI optimista
                const targetButton = buttonEl || document.querySelector(`[data-project-id="${projectId}"][data-action="favorite"]`);
                if (targetButton) {
                    const currentVisualState = targetButton.classList.contains('text-yellow-400');
                    if (currentVisualState !== data.favorito) {
                        // Corregir si el servidor responde algo diferente
                        targetButton.classList.toggle('text-yellow-400', data.favorito);
                        targetButton.classList.toggle('text-gray-400', !data.favorito);
                    }
                }
                showToast('Favorito', data.message || 'Favorito actualizado', 'success');
            } else {
                showToast('Error', 'Respuesta inesperada del servidor', 'error');
            }
        })
        .catch(err => {
            console.error(err);
            // Revertir el estado visual si falló la petición
            if (buttonEl) {
                buttonEl.classList.toggle('text-yellow-400', currentlyFavorite);
                buttonEl.classList.toggle('text-gray-400', !currentlyFavorite);
            }
            showToast('Error', 'No se pudo actualizar favorito', 'error');
        });
}

// Inicialización de event listeners para la galería

function initGalleryClickHandler() {
    if (window._kyber_gallery_click_bound) {
        console.log('⚠️ Gallery click handler already bound, skipping');
        return;
    }

    window._kyberGalleryHandler = function(e) {
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
                if (projectId) {
                    // Asegurar que tenemos el botón correcto
                    const favoriteButton = el.closest('[data-action="favorite"]') || el;
                    favoriteProject(parseInt(projectId, 10), favoriteButton);
                }
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

    document.addEventListener('click', window._kyberGalleryHandler, true);
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
