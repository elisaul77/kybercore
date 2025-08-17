/**
 * Gallery Main Functions
 * Funciones principales para la gestión de la galería de proyectos
 */

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

// Inicialización de event listeners para la galería
function initGalleryEventListeners() {
    // Event listener para botones "Ver Proyecto"
    document.addEventListener('click', function(e) {
        const button = e.target.closest('button');
        if (!button) return;

        // Buscar botones "Ver Proyecto" en las tarjetas
        if (button.textContent.includes('Ver Proyecto') || button.textContent.includes('📂')) {
            e.preventDefault();
            const card = button.closest('.bg-white, .border');
            const titleEl = card ? card.querySelector('h3, .font-bold') : null;
            const title = titleEl ? titleEl.textContent.trim() : 'Proyecto Sin Nombre';
            showProjectDetails(title);
            return;
        }

        // Otros event listeners para acciones específicas...
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initGalleryEventListeners();
    console.log('Gallery main functions initialized');
});
