/* Minimal gallery integrator
   Calls the modular initializer exposed by gallery functions. */
console.log('📁 gallery integrator loaded');

(function(){
    function init() {
        if (typeof window !== 'undefined' && typeof window.initGalleryModule === 'function') {
            try {
                window.initGalleryModule();
            } catch (err) {
                console.error('Error executing initGalleryModule:', err);
            }
        } else {
            console.log('initGalleryModule not available yet; will try again on DOMContentLoaded');
            document.addEventListener('DOMContentLoaded', function() {
                if (typeof window.initGalleryModule === 'function') {
                    window.initGalleryModule();
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
})();
// GALERÍA DE PROYECTOS - JavaScript modular
(function(){
    'use strict';
    
    // Sistema de notificaciones toast
    function initToastSystem() {
        if (!document.getElementById('toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(toastContainer);
        }
    }
    
    function showToast(title, message, type = 'info', duration = 3000) {
        initToastSystem();
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `bg-white border-l-4 p-4 shadow-lg rounded-r max-w-sm transform transition-all duration-300 ease-in-out translate-x-full`;
        
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
        
        // Animación de entrada
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
    
    // Función para abrir el modal real de "Nuevo Proyecto"
    // En producción no debe haber toasts de simulación: delegamos únicamente al ProjectModal.
    function createNewProject() {
        // Si initProjectModal ya está disponible, usarlo
        if (typeof window !== 'undefined' && typeof window.initProjectModal === 'function') {
            try {
                window.initProjectModal();
                if (window.projectModal && typeof window.projectModal.open === 'function') {
                    window.projectModal.open({ mode: 'import' });
                    return;
                }
            } catch (err) {
                console.error('Error opening ProjectModal:', err);
            }
        }

        // Si no está disponible, cargar el script dinámicamente y abrir el modal cuando cargue
        const scriptPath = '/static/js/modules/gallery/project_modal.js';
        if (!document.querySelector(`script[src="${scriptPath}"]`)) {
            const script = document.createElement('script');
            script.src = scriptPath;
            script.async = true;
            script.onload = () => {
                try {
                    if (typeof window.initProjectModal === 'function') {
                        window.initProjectModal();
                        if (window.projectModal && typeof window.projectModal.open === 'function') {
                            window.projectModal.open({ mode: 'import' });
                        } else {
                            console.error('ProjectModal loaded but window.projectModal.open not available');
                        }
                    } else {
                        console.error('project_modal.js loaded but initProjectModal is not defined');
                    }
                } catch (e) {
                    console.error('Error after loading project_modal.js:', e);
                }
            };
            script.onerror = () => console.error('Failed to load project_modal.js');
            document.head.appendChild(script);
            return;
        }

        // Si el script ya está presente pero no inicializado correctamente, registrar el error
        console.error('createNewProject: project_modal.js present but ProjectModal is not initialized.');
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
    
    // Funciones de acción de proyectos individuales
    function exportProject(projectName) {
        showToast('Exportando', `Preparando exportación del proyecto "${projectName}"...`, 'info');
        setTimeout(() => {
            showToast('Exportación Completa', `Proyecto "${projectName}" exportado como archivo ZIP`, 'success');
        }, 2000);
    }
    
    function duplicateProject(projectName) {
        showToast('Duplicando', `Creando copia del proyecto "${projectName}"...`, 'info');
        setTimeout(() => {
            showToast('Proyecto Duplicado', `Copia creada: "${projectName} - Copia"`, 'success');
        }, 1500);
    }
    
    function deleteProject(projectName) {
        if (confirm(`¿Estás seguro de que deseas eliminar el proyecto "${projectName}"?`)) {
            showToast('Eliminando', `Eliminando proyecto "${projectName}"...`, 'warning');
            setTimeout(() => {
                showToast('Proyecto Eliminado', `El proyecto "${projectName}" ha sido eliminado`, 'success');
            }, 1000);
        }
    }

    // Sistema de modal para detalles de proyecto - DATOS REALES
    async function viewProject(projectId) {
        const modal = document.getElementById('stl-preview-modal');
        const modalContent = document.getElementById('modal-content');
        const modalTitle = document.getElementById('modal-title');

        if (!modal || !modalContent || !modalTitle) {
            console.error('Modal elements not found');
            return;
        }

        // Mostrar loading
        modalTitle.textContent = 'Cargando proyecto...';
        modalContent.innerHTML = `
            <div class="flex justify-center items-center h-64">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        `;
        modal.classList.remove('hidden');

        try {
            // Cargar datos del proyecto desde la API
            const response = await fetch(`/api/gallery/projects/${projectId}`);
            if (!response.ok) {
                throw new Error('Error al cargar el proyecto');
            }
            
            const project = await response.json();
            
            // Actualizar título del modal
            modalTitle.textContent = project.nombre;

            // Generar contenido del modal con datos reales
            modalContent.innerHTML = generateProjectModalContent(project);

        } catch (error) {
            console.error('Error loading project:', error);
            modalTitle.textContent = 'Error';
            modalContent.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-red-500 text-6xl mb-4">⚠️</div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Error al cargar el proyecto</h3>
                    <p class="text-gray-600">${error.message}</p>
                    <button onclick="closeModal()" class="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                        Cerrar
                    </button>
                </div>
            `;
        }
    }

    // Generar contenido HTML del modal con datos reales
    function generateProjectModalContent(project) {
        const imageUrl = project.imagen || '/static/images/placeholder-project.png';
        const archivos = project.archivos || [];
        const analisis = project.analisis_ia || {};
        const progreso = project.progreso || {};
        
        return `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Columna izquierda: Imagen y archivos -->
                <div class="space-y-4">
                    <!-- Imagen principal del proyecto -->
                    <div class="bg-gray-100 rounded-lg overflow-hidden">
                        <img src="${imageUrl}" alt="${project.nombre}" 
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
                                        <span class="text-xs text-gray-500">${archivo.tamaño}</span>
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
                                Ver en Thingiverse
                                <span>↗️</span>
                            </a>
                        </div>
                    ` : ''}
                </div>

                <!-- Columna derecha: Detalles del proyecto -->
                <div class="space-y-4">
                    <!-- Título y descripción -->
                    <div>
                        <h3 class="text-xl font-bold text-gray-900 mb-2">${project.nombre}</h3>
                        <p class="text-gray-600 text-sm mb-4">${project.descripcion}</p>
                        
                        <!-- Badges -->
                        <div class="flex flex-wrap gap-2 mb-4">
                            <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                ${project.tipo}
                            </span>
                            <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                ${project.estado}
                            </span>
                            ${project.autor ? `
                                <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                    👤 ${project.autor}
                                </span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Análisis de IA -->
                    <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                        <h4 class="font-medium text-purple-900 mb-3 flex items-center gap-2">
                            🤖 Análisis de IA
                        </h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-purple-700">Tiempo estimado:</span>
                                <span class="font-medium">${analisis.tiempo_estimado || 'No calculado'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-purple-700">Filamento total:</span>
                                <span class="font-medium">${analisis.filamento_total || 'No calculado'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-purple-700">Costo estimado:</span>
                                <span class="font-medium">${analisis.costo_estimado || 'No calculado'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-purple-700">Material sugerido:</span>
                                <span class="font-medium">${analisis.materiales || 'PLA'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-purple-700">Impresoras compatibles:</span>
                                <span class="font-medium">${analisis.impresoras_sugeridas || 'Cualquier FDM'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Progreso del proyecto -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-medium text-gray-900 mb-3">📊 Estado del Proyecto</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between text-sm">
                                <span>Progreso:</span>
                                <span class="font-medium">${progreso.porcentaje || 0}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                                     style="width: ${progreso.porcentaje || 0}%"></div>
                            </div>
                            <div class="text-sm text-gray-600">
                                ${progreso.mensaje || 'Proyecto listo para imprimir'}
                            </div>
                            <div class="flex justify-between text-sm">
                                <span>Piezas completadas:</span>
                                <span class="font-medium">${progreso.piezas_completadas || 0} / ${progreso.piezas_totales || archivos.length}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Botones de acción -->
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="startPrinting(${project.id})" 
                                class="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors">
                            🖨️ Imprimir
                        </button>
                        <button onclick="toggleFavorite(${project.id})" 
                                class="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-colors">
                            ${project.favorito ? '❤️' : '🤍'} Favorito
                        </button>
                        <button onclick="exportProject(${project.id})" 
                                class="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors">
                            📤 Exportar
                        </button>
                        <button onclick="duplicateProject(${project.id})" 
                                class="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-colors">
                            📋 Duplicar
                        </button>
                    </div>

                    <!-- Metadatos adicionales -->
                    <div class="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
                        <div class="grid grid-cols-2 gap-2">
                            <div>Creado: ${project.fecha_creacion || 'No disponible'}</div>
                            <div>ID: ${project.thingiverse_id || 'Local'}</div>
                        </div>
                        ${project.tags ? `
                            <div class="mt-2">
                                <span class="font-medium">Tags:</span> ${project.tags.join(', ')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Funciones auxiliares para acciones del modal
    async function downloadFile(projectId, filename) {
        try {
            const slug = getProjectSlug(projectId);
            const response = await fetch(`/api/gallery/projects/${slug}/file/${filename}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                showToast('Descarga iniciada', `Descargando ${filename}`, 'success');
            }
        } catch (error) {
            showToast('Error', 'Error al descargar el archivo', 'error');
        }
    }

    function getProjectSlug(projectId) {
        const slugMap = {
            1: 'atx-power-supply-6749455',
            2: 'aquarium-guard-tower-3139513',
            3: 'flexi-dog-2810483'
        };
        return slugMap[projectId] || 'unknown';
    }

    function startPrinting(projectId) {
        showToast('Función pendiente', 'La función de impresión se integrará con el módulo de flota', 'info');
    }

    async function toggleFavorite(projectId) {
        try {
            const response = await fetch(`/api/gallery/projects/${projectId}/favorite`, {
                method: 'POST'
            });
            if (response.ok) {
                const data = await response.json();
                showToast('Favorito actualizado', data.message, 'success');
                // Recargar el modal para reflejar el cambio
                setTimeout(() => viewProject(projectId), 500);
            }
        } catch (error) {
            showToast('Error', 'Error al actualizar favorito', 'error');
        }
    }

    function exportProject(projectId) {
        showToast('Función pendiente', 'La función de exportación estará disponible pronto', 'info');
    }

    function duplicateProject(projectId) {
        showToast('Función pendiente', 'La función de duplicación estará disponible pronto', 'info');
    }

    function deleteProject(projectId) {
        showToast('Función pendiente', 'La función de eliminación estará disponible pronto', 'info');
    }

    // Función para cerrar el modal
    function closeModal() {
        const modal = document.getElementById('stl-preview-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Función showProjectDetails original (ahora usa datos reales)
    function showProjectDetails(projectName) {
        // Buscar proyecto por nombre y llamar a viewProject con el ID
        const projectMap = {
            'ATX Power Supply': 1,
            'Aquarium Guard Tower': 2,
            'Flexi Dog': 3
        };
        const projectId = projectMap[projectName] || 1;
        viewProject(projectId);
    }

    // Variable para controlar si los event listeners ya están inicializados
    let eventListenersInitialized = false;

    // Delegación de eventos para botones
    function initEventListeners() {
        // Evitar agregar múltiples event listeners
        if (eventListenersInitialized) {
            console.log('Gallery event listeners ya están inicializados');
            return;
        }

        console.log('Inicializando event listeners de gallery...');
        
        document.addEventListener('click', function(e){
            const button = e.target.closest('button');
            if (!button) return;

            // Solo procesar si el botón está dentro del módulo de galería
            const gallerySection = button.closest('#galeria');
            if (!gallerySection) return;

            // Nuevo sistema: usar data-action
            const action = button.getAttribute('data-action');
            const projectId = button.getAttribute('data-project-id');

            if (action === 'view-project' && projectId) {
                e.preventDefault();
                console.log('Opening project:', projectId);
                viewProject(parseInt(projectId));
                return;
            }

            const buttonText = button.textContent.trim();

            // Sistema legacy: buscar por texto del botón
            if (buttonText.includes('Ver Proyecto') || 
                buttonText.includes('👁️ Ver Proyecto') ||
                buttonText.includes('📂 Ver Proyecto') ||
                buttonText.includes('Continuar Diseño') ||
                buttonText.includes('📝 Continuar Diseño') ||
                buttonText.includes('Iniciar Proyecto') ||
                buttonText.includes('🚀 Iniciar Proyecto') ||
                buttonText.includes('Optimizar') ||
                buttonText.includes('⚡ Optimizar')) {
                
                e.preventDefault();
                const card = button.closest('.bg-white');
                const titleEl = card ? card.querySelector('h3') : null;
                const title = titleEl ? titleEl.textContent.trim() : 'Proyecto';
                showProjectDetails(title);
                return;
            }

            // Botón de cerrar modal
            if (button.id === 'close-modal' || buttonText === '✖') {
                e.preventDefault();
                closeModal();
                return;
            }

            // Botón de imprimir dentro del modal
            if (button.id === 'print-project') {
                e.preventDefault();
                closeModal();
                showToast('Impresión Programada', 'El proyecto ha sido añadido a la cola de impresión', 'success');
                return;
            }
        });

        // Cerrar modal al clicar fuera del contenido
        document.addEventListener('click', function(e){
            const modal = document.getElementById('stl-preview-modal');
            if (modal && e.target === modal) {
                closeModal();
            }
        });

        eventListenersInitialized = true;
        console.log('Gallery event listeners inicializados correctamente');
    }

    // Exposición de funciones globales
    function exposeGlobalFunctions() {
        window.createNewProject = createNewProject;
        window.analyzeAllProjects = analyzeAllProjects;
        window.showProjectsStatistics = showProjectsStatistics;
        window.exportProject = exportProject;
        window.duplicateProject = duplicateProject;
        window.deleteProject = deleteProject;
        window.showProjectDetails = showProjectDetails;
        window.viewProject = viewProject;
        window.closeModal = closeModal;
        window.initGalleryEventListeners = initEventListeners;
    // Funciones que pueden ser llamadas desde plantillas/modals inline
    window.startPrinting = startPrinting;
    window.toggleFavorite = toggleFavorite;
    window.showToast = showToast;
    }

    // Inicialización del módulo de galería
    function initGalleryModule() {
        initEventListeners();
        exposeGlobalFunctions();
        console.log('Módulo de galería de proyectos inicializado correctamente');
    }

    // Auto-inicialización cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGalleryModule);
    } else {
        initGalleryModule();
    }

    // Exponer función de inicialización para uso externo
    window.initGalleryModule = initGalleryModule;

})();
