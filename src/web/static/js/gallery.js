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

    // Sistema de modal para detalles de proyecto
    function showProjectDetails(projectName) {
        const modal = document.getElementById('stl-preview-modal');
        const modalContent = document.getElementById('modal-content');
        const modalTitle = document.getElementById('modal-title');

        if (!modal || !modalContent || !modalTitle) {
            console.error('Modal elements not found');
            return;
        }

        modalTitle.textContent = projectName;

        modalContent.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <div class="bg-gray-100 rounded-lg p-4 h-64 flex items-center justify-center">
                        <div class="text-center">
                            <div class="text-6xl mb-4">📁</div>
                            <p class="text-gray-600">${projectName}</p>
                            <p class="text-sm text-gray-500 mt-2">Vista 3D del proyecto completo</p>
                        </div>
                    </div>

                    <div class="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <h4 class="font-medium text-gray-900 mb-3">📋 Archivos del Proyecto</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between items-center p-2 bg-white rounded border">
                                <span>archivo_principal.stl</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-gray-500">2.1 MB</span>
                                    <span class="text-green-600">✓</span>
                                </div>
                            </div>
                            <div class="flex justify-between items-center p-2 bg-white rounded border">
                                <span>componente_secundario.stl</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-gray-500">1.8 MB</span>
                                    <span class="text-green-600">✓</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <h3 class="text-xl font-bold text-gray-900">${projectName}</h3>

                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-medium text-gray-900 mb-2">📊 Estadísticas del Proyecto</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span>Total de archivos:</span>
                                <span>5 STL</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Tamaño total:</span>
                                <span>11.1 MB</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Fecha creación:</span>
                                <span>15 Jul 2025</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-blue-50 rounded-lg p-4">
                        <h4 class="font-medium text-blue-900 mb-2">🤖 Planificación IA del Proyecto</h4>
                        <div class="space-y-2 text-sm text-blue-800">
                            <p>• <strong>Materiales sugeridos:</strong> PLA para prototipos, PETG para piezas funcionales</p>
                            <p>• <strong>Tiempo estimado:</strong> 8h 45m</p>
                            <p>• <strong>Optimización:</strong> Listo para impresión</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <button id="print-project" class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors text-sm">
                            🚀 Imprimir Proyecto
                        </button>
                        <button class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-colors text-sm">
                            📋 Planificar Cola
                        </button>
                        <button class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                            📥 Exportar
                        </button>
                        <button class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                            📝 Editar
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    function closeModal() {
        const modal = document.getElementById('stl-preview-modal');
        if (modal) modal.classList.add('hidden');
    }

    // Delegación de eventos para botones
    function initEventListeners() {
        document.addEventListener('click', function(e){
            const button = e.target.closest('button');
            if (!button) return;

            const buttonText = button.textContent.trim();

            // Botones de "Ver Proyecto" y similares
            if (buttonText.includes('Ver Proyecto') || 
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
        window.closeModal = closeModal;
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
