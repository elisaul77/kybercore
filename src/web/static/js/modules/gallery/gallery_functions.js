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
    const modal = window.projectModal;
    if (modal && typeof modal.open === 'function') {
        console.log('📂 Opening project modal with data:', finalProjectData.title);
        modal.open(finalProjectData);
    } else {
        console.error('❌ Project modal not initialized or not available:', {
            modalExists: !!modal,
            openFunction: modal && typeof modal.open
        });
        // Intentar inicializar el modal si no existe
        if (typeof initProjectModal === 'function') {
            initProjectModal();
            if (window.projectModal) {
                window.projectModal.open(finalProjectData);
            }
        }
    }
}

// Generar contenido HTML del modal con datos reales (traído desde archivo archivado si hace falta)
function generateProjectModalContent(project) {
    const imageUrl = project.imagen || '/static/images/placeholder-project.png';
    const archivos = project.archivos || [];
    const analisis = project.analisis_ia || project.aiAnalysis || {};
    const progreso = project.progreso || {};
    
    return `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Columna izquierda: Imagen y archivos -->
                <div class="space-y-4">
                    <!-- Imagen principal del proyecto -->
                    <div class="bg-gray-100 rounded-lg overflow-hidden">
                        <img src="${imageUrl}" alt="${project.nombre || project.title}" 
                             class="w-full h-64 object-cover" 
                             onerror="this.src='/static/images/placeholder-project.png'; this.onerror=null;">
                    </div>

                    <!-- Lista de archivos STL -->
                    <div class="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <h4 class="font-medium text-gray-900 mb-3">📋 Archivos del Proyecto (${archivos.length})</h4>
                        <div class="space-y-2 text-sm">
                            ${archivos.map(archivo => `
                                <div class="flex justify-between items-center p-2 bg-white rounded border hover:bg-gray-50">
                                    <div class="flex items-center gap-2">
                                        <span class="text-blue-600">📄</span>
                                        <span class="font-medium">${archivo.nombre}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs text-gray-500">${archivo.tamano || archivo.tamaño || ''}</span>
                                        <span class="text-green-600">✓</span>
                                        <button onclick="downloadFile('${project.id}', '${archivo.nombre}')" 
                                                class="text-blue-600 hover:text-blue-800 text-xs">
                                            ⬇️
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Enlaces externos -->
                    ${project.url ? `
                        <div class="bg-blue-50 rounded-lg p-4">
                            <h4 class="font-medium text-blue-900 mb-2">🔗 Enlaces</h4>
                            <a href="${project.url}" target="_blank" 
                               class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2">
                                <span>🌐</span>
                                Ver en fuente externa
                                <span>↗️</span>
                            </a>
                        </div>
                    ` : ''}
                </div>

                <!-- Columna derecha: Detalles del proyecto -->
                <div class="space-y-4">
                    <!-- Título y descripción -->
                    <div>
                        <h3 class="text-xl font-bold text-gray-900 mb-2">${project.nombre || project.title}</h3>
                        <p class="text-gray-600 text-sm mb-4">${project.descripcion || project.description || ''}</p>
                        
                        <!-- Badges -->
                        <div class="flex flex-wrap gap-2 mb-4">
                            <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">${project.tipo || ''}
                            </span>
                            <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">${project.estado || ''}
                            </span>
                            ${project.autor ? `
                                <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">👤 ${project.autor}
                                </span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Análisis de IA -->
                    <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                        <h4 class="font-medium text-purple-900 mb-3 flex items-center gap-2">🤖 Análisis de IA</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-purple-700">Tiempo estimado:</span>
                                <span class="font-medium">${analisis.tiempo_estimado || analisis.estimatedTime || 'No calculado'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-purple-700">Filamento total:</span>
                                <span class="font-medium">${analisis.filamento_total || analisis.filament || 'No calculado'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-purple-700">Costo estimado:</span>
                                <span class="font-medium">${analisis.costo_estimado || analisis.cost || 'No calculado'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-purple-700">Material sugerido:</span>
                                <span class="font-medium">${analisis.materials || analisis.material || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    `;
}

// Helper para descargar archivos del proyecto (llamado desde el modal)
function downloadFile(projectId, filename) {
    console.log('⬇️ downloadFile called for', projectId, filename);
    // Intento simple: abrir la ruta de descarga del API en una nueva pestaña
    const url = `/api/gallery/projects/${projectId}/files/${encodeURIComponent(filename)}/download`;
    window.open(url, '_blank');
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
    
    const numericProjectId = parseInt(projectId, 10);
    if (!numericProjectId) {
        showToast('Error', 'ID de proyecto no proporcionado', 'error');
        return;
    }
    
    showToast('Duplicando', `Creando copia del proyecto...`, 'info');
    
    fetch(`/api/gallery/projects/${numericProjectId}/duplicate`, { method: 'POST' })
        .then(resp => {
            console.log('🔍 Server response status:', resp.status);
            const isOk = resp.ok;
            return resp.json().then(data => ({ data, isOk }));
        })
        .then(({ data, isOk }) => {
            console.log('🔍 Server response data:', data);
            console.log('🔍 Server response ok:', isOk);
            
            // Manejar diferentes formatos de respuesta del servidor
            const isSuccess = isOk || data.success === true || data.status === 'success' || 
                              (data.message && data.message.toLowerCase().includes('duplicado'));
            
            if (isSuccess) {
                showToast('Proyecto Duplicado', data.message || 'Copia creada correctamente', 'success');
                console.log('✅ Project duplicated successfully on server, reloading page...');
                
                // Recargar solo el módulo de galería para mostrar el proyecto duplicado con el ID correcto del servidor
                setTimeout(() => {
                    console.log('🔄 Reloading gallery module...');
                    reloadGalleryModule();
                }, 1500); // Dar tiempo para que el usuario vea el toast de éxito
            } else {
                throw new Error(data.message || data.detail || 'Error en la duplicación');
            }
        })
        .catch(err => {
            console.error('❌ Error duplicating project:', err);
            showToast('Error', 'No se pudo duplicar el proyecto', 'error');
        });
}

function deleteProject(projectId) {
    console.log('🗑️ deleteProject called with ID:', projectId);
    
    // Convertir projectId a número para comparaciones consistentes
    const numericProjectId = parseInt(projectId, 10);
    
    if (!numericProjectId) {
        showToast('Error', 'ID de proyecto no proporcionado', 'error');
        return;
    }
    
    const card = document.querySelector(`.bg-white.rounded-2xl.shadow-lg[data-project-id="${numericProjectId}"]`);
    const projectName = card ? card.querySelector('h3')?.textContent : `proyecto ${numericProjectId}`;
    
    if (!confirm(`¿Estás seguro de que deseas eliminar "${projectName}"?`)) return;

    // Verificar si es un proyecto duplicado (ID generado temporalmente)
    const isDuplicatedProject = numericProjectId > 1000000000000; // IDs generados con Date.now()
    
    console.log('🔍 Project analysis:', {
        originalId: projectId,
        numericId: numericProjectId,
        isDuplicated: isDuplicatedProject,
        cardFound: !!card,
        projectName: projectName
    });
    
    if (isDuplicatedProject) {
        // Eliminar proyecto duplicado solo del DOM (no existe en servidor)
        console.log('📋 Deleting duplicated project (frontend only - temporary ID)');
        showToast('Proyecto Eliminado', 'Copia eliminada', 'success');
        
        if (card) {
            console.log('🎯 Found card for deletion:', card);
            console.log('🎯 Card parent:', card.parentNode);
            console.log('🎯 Card classes:', card.className);
            
            // Animación de eliminación mejorada
            card.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            
            console.log('⏱️ Starting removal animation...');
            
            setTimeout(() => {
                console.log('⏱️ Animation timeout reached, attempting removal...');
                if (card && card.parentNode) {
                    console.log('✅ Parent node exists, removing card...');
                    card.parentNode.removeChild(card);
                    console.log('✅ Duplicated project card removed from DOM');
                    updateGalleryStats(-1); // -1 proyecto
                    
                    // Verificar después de 1 segundo si el elemento realmente desapareció
                    setTimeout(() => {
                        const checkCard = document.querySelector(`.bg-white.rounded-2xl.shadow-lg[data-project-id="${numericProjectId}"]`);
                        if (checkCard) {
                            console.error('🚨 PROBLEMA: El elemento fue eliminado pero sigue en el DOM!', checkCard);
                            console.error('🚨 Esto indica que algo está restaurando el elemento');
                            // Forzar eliminación definitiva
                            checkCard.style.display = 'none';
                            checkCard.remove();
                        } else {
                            console.log('✅ CONFIRMADO: Elemento realmente eliminado del DOM');
                        }
                    }, 1000);
                } else {
                    console.warn('⚠️ Card or parent node no longer exists:', {card: !!card, parent: card ? !!card.parentNode : false});
                }
            }, 300);
        } else {
            console.warn('⚠️ Could not find card for duplicated project:', numericProjectId);
            showToast('Advertencia', 'No se encontró la tarjeta del proyecto', 'warning');
        }
        return;
    }

    // Proyecto original - eliminar del servidor
    console.log('🔄 Deleting original project via server');
    showToast('Eliminando', `Eliminando proyecto...`, 'warning');
      fetch(`/api/gallery/projects/${numericProjectId}/delete`, { method: 'POST' })
          .then(resp => resp.json())
          .then(data => {
              showToast('Proyecto Eliminado', data.message || 'Eliminado', 'success');
            // Remover tarjeta del DOM con animación
            if (card) {
                card.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    if (card.parentNode) {
                        card.remove();
                        console.log('✅ Original project card removed from DOM');
                    }
                    // Actualizar estadísticas después de eliminar
                    updateGalleryStats(-1); // -1 proyecto
                }, 300);
            }
        })
        .catch(err => {
            console.error('❌ Error deleting project:', err);
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
                    ${proyecto.favorito ? '⭐' : '☆'}
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
        
        // Asegurar que los event listeners funcionen para el nuevo elemento
        // Usar setTimeout para asegurar que el elemento esté completamente integrado
        setTimeout(() => {
            // Verificar que el elemento esté accesible en el DOM
            const verifyCard = document.querySelector(`.bg-white.rounded-2xl.shadow-lg[data-project-id="${newProjectId}"]`);
            if (verifyCard) {
                console.log('✅ Duplicated project card verified in DOM and ready for interactions');
                // Forzar reflow para asegurar que el DOM esté actualizado
                verifyCard.offsetHeight; // trigger reflow
                
                // Reinicializar los event listeners para asegurar que funcionen
                console.log('🔄 Reinitializing gallery event listeners for new element...');
                reinitializeGallery();
            } else {
                console.warn('⚠️ Could not verify duplicated project card in DOM');
            }
        }, 100);
        
        console.log('🎯 Event listeners should be active for duplicate project:', newProjectId);
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
    
    // Verificar si es un proyecto duplicado
    const isDuplicatedProject = projectId > 1000000000000;
    
    // Helper: actualizar UI de todas las estrellas del proyecto
    function setFavoriteUI(id, isFav) {
        const favButtons = document.querySelectorAll(`[data-action="favorite"][data-project-id="${id}"]`);
        favButtons.forEach(btn => {
            btn.classList.toggle('text-yellow-400', !!isFav);
            btn.classList.toggle('text-gray-400', !isFav);
            // Actualizar símbolo interno (mantener limpio)
            btn.textContent = !!isFav ? '⭐' : '☆';
            btn.setAttribute('aria-pressed', !!isFav ? 'true' : 'false');
        });
    }

    // Determinar estado actual visual
    let currentlyFavorite = false;
    if (buttonEl) {
        currentlyFavorite = buttonEl.classList.contains('text-yellow-400') || (String(buttonEl.textContent).includes('⭐'));
        // UI optimista: cambiar inmediatamente el estado visual (se corregirá tras la respuesta)
        setFavoriteUI(projectId, !currentlyFavorite);
    }

    if (isDuplicatedProject) {
        // Para proyectos duplicados, solo actualizar la UI
        console.log('📋 Toggling favorite for duplicated project (frontend only)');
        showToast('Favorito', `${!currentlyFavorite ? 'Agregado a' : 'Removido de'} favoritos`, 'success');
        return;
    }

    fetch(`/api/gallery/projects/${projectId}/favorite`, { method: 'POST' })
        .then(resp => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.json();
        })
        .then(data => {
            if (data && typeof data.favorito !== 'undefined') {
                // Actualizar todas las estrellas según respuesta real del servidor
                setFavoriteUI(projectId, !!data.favorito);
                showToast('Favorito', data.message || 'Favorito actualizado', 'success');
            } else {
                // Respuesta inesperada: revertir y notificar
                setFavoriteUI(projectId, currentlyFavorite);
                showToast('Error', 'Respuesta inesperada del servidor', 'error');
            }
        })
        .catch(err => {
            console.error(err);
            // Revertir el estado visual si falló la petición
            setFavoriteUI(projectId, currentlyFavorite);
            showToast('Error', 'No se pudo actualizar favorito', 'error');
        });
}

// Inicialización de event listeners para la galería

function initGalleryClickHandler() {
    // Limpiar cualquier listener previo
    if (window._kyberGalleryHandler) {
        document.removeEventListener('click', window._kyberGalleryHandler, true);
        console.log('🧹 Removed previous gallery click handler');
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
                console.log('👁️ View action triggered for project:', projectId);
                console.log('🔍 Click details:', {
                    element: el.tagName,
                    action: action,
                    projectId: projectId,
                    modalExists: !!window.projectModal
                });
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

        e.preventDefault();
        e.stopPropagation();
    };

    document.addEventListener('click', window._kyberGalleryHandler, true);
    window._kyber_gallery_click_bound = true;
    console.log('✅ Gallery capture-phase click handler bound successfully');
}

// Función para forzar reinicialización
function reinitializeGallery() {
    console.log('🔄 Force reinitializing gallery system...');
    window._gallerySystemInitialized = false;
    window._kyber_gallery_click_bound = false;
    initGallery();
}

// Función de inicialización unificada
function initGallery() {
    // Prevenir múltiples inicializaciones
    if (window._gallerySystemInitialized) {
        console.log('⚠️ Gallery system already initialized, skipping');
        return;
    }
    
    console.log('🚀 Initializing gallery system...');
    initGalleryClickHandler();
    
    // Asegurar que el modal esté inicializado también
    if (typeof initProjectModal === 'function' && !window.projectModal) {
        initProjectModal();
    }
    
    window._gallerySystemInitialized = true;
    console.log('✅ Gallery system initialized');
}

// Exponer funciones globalmente para otros módulos
window.initGallery = initGallery;
window.reinitializeGallery = reinitializeGallery;

// Exponer un inicializador único compatible para el integrador
window.initGalleryModule = function() {
    try {
        initGallery();
        if (typeof initGalleryClickHandler === 'function') {
            initGalleryClickHandler();
        }
        console.log('✅ initGalleryModule executed');
    } catch (err) {
        console.error('❌ Error initializing gallery module:', err);
    }
};

// Compatibilidad: exponer alias legacy si existen
if (typeof initGalleryClickHandler === 'function') {
    window.initGalleryEventListeners = initGalleryClickHandler;
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
} else {
    // Usar setTimeout para asegurar que todos los scripts se hayan cargado
    setTimeout(initGallery, 0);
}

// Hook para sistemas externos que recargan el módulo de galería
window.addEventListener('galleryModuleReloaded', function() {
    console.log('🔄 Gallery module reload detected, reinitializing...');
    reinitializeGallery();
});

// Función que pueden llamar otros módulos cuando recargan la galería
window.notifyGalleryReload = function() {
    console.log('📢 Notifying gallery reload...');
    window.dispatchEvent(new CustomEvent('galleryModuleReloaded'));
};

// Función para recargar el módulo de galería completo
function reloadGalleryModule() {
    console.log('🔄 Reloading gallery module...');
    
    // Disparar evento personalizado para que otros sistemas sepan que se va a recargar
    window.dispatchEvent(new CustomEvent('galleryModuleReloading'));
    
    // Solución simple: recargar solo los datos de proyectos vía API
    console.log('🔄 Fetching updated project data...');
    fetch('/api/gallery/projects')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ Updated project data received:', data);
            
            // Encontrar el grid de proyectos
            const projectGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4');
            const projects = data.projects || data.proyectos || []; // Manejar ambos formatos
            
            console.log('🔍 Project grid found:', !!projectGrid);
            console.log('🔍 Projects data count:', projects.length);
            
            if (projectGrid) {
                // Limpiar el grid actual
                projectGrid.innerHTML = '';
                console.log('🧹 Cleared existing project grid');
                
                // Reconstruir cada proyecto
                projects.forEach(project => {
                    const projectCard = createProjectCardHTML(project);
                    projectGrid.appendChild(projectCard);
                });
                
                console.log('✅ Gallery module reloaded with', projects.length, 'projects');
                
                // Reinicializar event listeners
                setTimeout(() => {
                    reinitializeGallery();
                    console.log('✅ Event listeners reinitialized');
                }, 100);
                
                // Actualizar estadísticas si están disponibles
                if (data.statistics) {
                    updateGalleryStats(0); // Recalcular estadísticas
                }
                
            } else {
                console.warn('⚠️ Could not find project grid');
                showToast('Error', 'No se pudo actualizar la galería', 'error');
            }
        })
        .catch(error => {
            console.error('❌ Error fetching updated project data:', error);
            console.log('🔄 Falling back to page reload...');
            window.location.reload();
        });
}

// Función para crear HTML de tarjeta de proyecto desde datos de API
function createProjectCardHTML(project) {
    console.log('🏗️ Creating project card for:', project.nombre || project.name);
    
    // Crear el elemento de la tarjeta
    const card = document.createElement('div');
    card.setAttribute('data-project-id', project.id);
    card.className = 'bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300';
    
    // Mapear colores de estado
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
    
    const progressTextColors = {
        'completado': 'text-green-700',
        'en_progreso': 'text-blue-700',
        'listo': 'text-purple-700',
        'problemas': 'text-yellow-700'
    };
    
    // Determinar botón de ver proyecto según estado
    let viewButtonClass = 'w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white px-3 py-2 rounded-lg text-sm hover:from-gray-500 hover:to-gray-600 transition-colors';
    switch(project.estado) {
        case 'completado':
            viewButtonClass = 'w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-lg text-sm hover:from-green-600 hover:to-green-700 transition-colors';
            break;
        case 'en_progreso':
            viewButtonClass = 'w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:from-blue-600 hover:to-blue-700 transition-colors';
            break;
        case 'listo':
            viewButtonClass = 'w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:from-purple-600 hover:to-purple-700 transition-colors';
            break;
        case 'problemas':
            viewButtonClass = 'w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 py-2 rounded-lg text-sm hover:from-yellow-600 hover:to-yellow-700 transition-colors';
            break;
    }
    
    const estado = project.estado || 'listo';
    const estadoClass = estadoColors[estado] || 'bg-gray-500';
    const progressClass = progressColors[estado] || 'bg-gray-500';
    const progressTextClass = progressTextColors[estado] || 'text-gray-700';
    const porcentaje = (project.progreso && project.progreso.porcentaje) || 0;
    
    // HTML completo que coincide con el template
    card.innerHTML = `
        <!-- Imagen del proyecto -->
        <div class="relative h-48 bg-gray-100">
            ${project.imagen ? 
                `<img src="${project.imagen}" alt="${project.nombre || project.name}" class="w-full h-full object-cover">` :
                `<div class="w-full h-full flex items-center justify-center text-gray-400">
                    <div class="text-center">
                        <div class="text-4xl mb-2">🏗️</div>
                        <p class="text-sm">Sin imagen</p>
                    </div>
                </div>`
            }
            
            <!-- Badge de estado -->
            <div class="absolute top-3 left-3 ${estadoClass} text-white px-3 py-1 rounded-full text-sm font-medium">
                ${(project.badges && project.badges.estado) || estado}
            </div>
            
            <!-- Botón de favorito -->
            <button data-action="favorite" data-project-id="${project.id}" class="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors ${project.favorito ? 'text-yellow-400' : 'text-gray-400'}">
                ⭐
            </button>
        </div>
        
        <!-- Contenido del proyecto -->
        <div class="p-6">
            <div class="flex items-start justify-between mb-3">
                <h3 class="font-bold text-lg text-gray-900 leading-tight">${project.nombre || project.name || 'Proyecto sin nombre'}</h3>
                <div class="flex flex-col gap-1 text-xs">
                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">${(project.badges && project.badges.tipo) || 'Proyecto'}</span>
                    <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-md">${(project.badges && project.badges.piezas) || '1 pieza'}</span>
                </div>
            </div>
            
            <p class="text-gray-600 text-sm mb-4 line-clamp-2">${project.descripcion || 'Sin descripción'}</p>
            
            <!-- Progreso -->
            <div class="mb-4">
                <div class="flex justify-between text-sm mb-1">
                    <span>Progreso</span>
                    <span>${porcentaje}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 ${progressClass} rounded-full" style="width: ${porcentaje}%"></div>
                </div>
                <div class="text-xs ${progressTextClass} mt-1">${(project.progreso && project.progreso.mensaje) || 'Listo para imprimir'}</div>
            </div>
            
            <!-- Botones de acción -->
            <div class="space-y-2">
                <button data-action="view-project" data-project-id="${project.id}" class="${viewButtonClass}">
                    👁️ Ver Proyecto
                </button>
                
                <div class="grid grid-cols-3 gap-2">
                    <button data-action="export" data-project-id="${project.id}" class="px-2 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200 transition-colors">
                        📤 Exportar
                    </button>
                    <button data-action="duplicate" data-project-id="${project.id}" class="px-2 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs hover:bg-purple-200 transition-colors">
                        📋 Duplicar
                    </button>
                    <button data-action="delete" data-project-id="${project.id}" class="px-2 py-2 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 transition-colors">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
            
            <!-- Información adicional -->
            <div class="mt-4 pt-4 border-t border-gray-100">
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>Por: ${project.autor || 'Usuario'}</span>
                    <span>${(project.archivos && project.archivos.length) || 0} archivos</span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Función para crear un nuevo proyecto
function createNewProject() {
    console.log('🆕 Creating new project...');
    
    // Crear modal para subir archivo ZIP
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">📁 Crear Nuevo Proyecto</h2>
                <button id="close-new-project-modal" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            
            <form id="new-project-form" enctype="multipart/form-data">
                <div class="space-y-4">
                    <!-- Nombre del proyecto -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nombre del Proyecto</label>
                        <input type="text" id="project-name" name="name" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                               placeholder="Mi Proyecto Increíble">
                    </div>
                    
                    <!-- Descripción -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                        <textarea id="project-description" name="description" rows="3"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  placeholder="Describe tu proyecto..."></textarea>
                    </div>
                    
                    <!-- Subir archivo ZIP -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Archivo del Proyecto (.zip)</label>
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors"
                             id="drop-zone">
                            <input type="file" id="project-zip" name="zip_file" accept=".zip" class="hidden">
                            <div id="drop-text">
                                <div class="text-4xl mb-2">📦</div>
                                <p class="text-gray-600">Arrastra tu archivo ZIP aquí o <button type="button" class="text-purple-600 hover:text-purple-700 underline" onclick="document.getElementById('project-zip').click()">selecciónalo</button></p>
                                <p class="text-sm text-gray-500 mt-2">Sube un archivo ZIP con tus modelos STL, G-code, etc.</p>
                            </div>
                            <div id="file-info" class="hidden">
                                <div class="text-4xl mb-2">✅</div>
                                <p class="text-green-600 font-medium" id="file-name"></p>
                                <p class="text-sm text-gray-500" id="file-size"></p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Opciones adicionales -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                        <select id="project-category" name="category" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                            <option value="funcional">Funcional</option>
                            <option value="decorativo">Decorativo</option>
                            <option value="mecanico">Mecánico</option>
                            <option value="herramientas">Herramientas</option>
                            <option value="prototipo">Prototipo</option>
                        </select>
                    </div>
                </div>
                
                <div class="flex gap-3 mt-8">
                    <button type="button" id="cancel-new-project" 
                            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" id="create-project-btn"
                            class="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-colors disabled:opacity-50"
                            disabled>
                        Crear Proyecto
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Agregar modal al DOM
    document.body.appendChild(modal);
    
    // Event listeners
    setupNewProjectModal(modal);
}

// Configurar event listeners para el modal de nuevo proyecto
function setupNewProjectModal(modal) {
    const closeBtn = modal.querySelector('#close-new-project-modal');
    const cancelBtn = modal.querySelector('#cancel-new-project');
    const form = modal.querySelector('#new-project-form');
    const fileInput = modal.querySelector('#project-zip');
    const dropZone = modal.querySelector('#drop-zone');
    const createBtn = modal.querySelector('#create-project-btn');
    
    // Cerrar modal
    const closeModal = () => {
        modal.remove();
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Manejar drag & drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-purple-400', 'bg-purple-50');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-purple-400', 'bg-purple-50');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-purple-400', 'bg-purple-50');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.endsWith('.zip')) {
            fileInput.files = files;
            updateFileInfo(files[0]);
        } else {
            showToast('Error', 'Por favor sube un archivo ZIP válido', 'error');
        }
    });
    
    // Manejar selección de archivo
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            updateFileInfo(e.target.files[0]);
        }
    });
    
    // Actualizar info del archivo
    function updateFileInfo(file) {
        const dropText = modal.querySelector('#drop-text');
        const fileInfo = modal.querySelector('#file-info');
        const fileName = modal.querySelector('#file-name');
        const fileSize = modal.querySelector('#file-size');
        
        dropText.classList.add('hidden');
        fileInfo.classList.remove('hidden');
        fileName.textContent = file.name;
        fileSize.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
        
        createBtn.disabled = false;
    }
    
    // Manejar envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        
        if (!formData.get('zip_file') || formData.get('zip_file').size === 0) {
            showToast('Error', 'Por favor selecciona un archivo ZIP', 'error');
            return;
        }
        
        createBtn.disabled = true;
        createBtn.textContent = 'Creando Proyecto...';
        
        try {
            console.log('🚀 Submitting new project...');
            const response = await fetch('/api/gallery/projects/create', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                showToast('Proyecto Creado', result.message || 'Proyecto creado correctamente', 'success');
                console.log('✅ Project created successfully:', result);
                
                closeModal();
                
                // Recargar galería para mostrar el nuevo proyecto
                setTimeout(() => {
                    reloadGalleryModule();
                }, 1500);
                
            } else {
                throw new Error(result.message || result.detail || 'Error al crear el proyecto');
            }
            
        } catch (error) {
            console.error('❌ Error creating project:', error);
            showToast('Error', error.message || 'No se pudo crear el proyecto', 'error');
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = 'Crear Proyecto';
        }
    });
}

// Hacer disponible globalmente
window.createNewProject = createNewProject;

console.log('📦 gallery_functions.js fully loaded and ready');

// Fin de gallery_functions.js
