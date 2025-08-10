// Función para inicializar la funcionalidad de vista Gantt
function initProjectManagement() {
    const detailViewBtn = document.getElementById('detail-view-btn');
    const ganttViewBtn = document.getElementById('gantt-view-btn');
    const detailView = document.getElementById('detail-view');
    const ganttView = document.getElementById('gantt-view');

    console.log('Inicializando Project Management...', {
        detailViewBtn,
        ganttViewBtn,
        detailView,
        ganttView
    });

    if (detailViewBtn && ganttViewBtn && detailView && ganttView) {
        console.log('Elementos encontrados, configurando event listeners...');
        
        detailViewBtn.addEventListener('click', () => {
            console.log('Click en Detail View');
            detailView.classList.remove('hidden');
            ganttView.classList.add('hidden');
            detailViewBtn.classList.add('bg-white', 'text-indigo-600');
            detailViewBtn.classList.remove('bg-white/20', 'border', 'border-white/30');
            ganttViewBtn.classList.add('bg-white/20', 'border', 'border-white/30');
            ganttViewBtn.classList.remove('bg-white', 'text-indigo-600');
        });

        ganttViewBtn.addEventListener('click', () => {
            console.log('Click en Gantt View');
            ganttView.classList.remove('hidden');
            detailView.classList.add('hidden');
            ganttViewBtn.classList.add('bg-white', 'text-indigo-600');
            ganttViewBtn.classList.remove('bg-white/20', 'border', 'border-white/30');
            detailViewBtn.classList.add('bg-white/20', 'border', 'border-white/30');
            detailViewBtn.classList.remove('bg-white', 'text-indigo-600');
        });
        
        console.log('Event listeners configurados correctamente');
    } else {
        console.log('No se encontraron todos los elementos necesarios para Project Management');
    }
}

// Ejecutar al cargar el DOM
document.addEventListener('DOMContentLoaded', initProjectManagement);

// También exponer la función globalmente para que pueda ser llamada cuando se carga el módulo dashboard
window.initProjectManagement = initProjectManagement;

// Observar cambios en el DOM para re-inicializar cuando se carga dinámicamente el dashboard
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
            // Verificar si se ha añadido el elemento del dashboard
            const addedNodes = Array.from(mutation.addedNodes);
            const hasProjectManagement = addedNodes.some(node => {
                return node.nodeType === Node.ELEMENT_NODE && 
                       (node.querySelector('#detail-view-btn') || node.querySelector('#gantt-view-btn'));
            });
            
            if (hasProjectManagement) {
                console.log('Detectado módulo de gestión de proyectos cargado dinámicamente');
                setTimeout(initProjectManagement, 100); // Pequeño delay para asegurar que el DOM esté listo
            }
        }
    });
});

// Observar cambios en el contenido principal
observer.observe(document.body, {
    childList: true,
    subtree: true
});
