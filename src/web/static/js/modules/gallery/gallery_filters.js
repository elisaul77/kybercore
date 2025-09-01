// Filtros de galería - implementación modular
(function() {
    'use strict';
    
    let originalProjects = [];
    
    /**
     * Inicializa los filtros de la galería
     */
    function initGalleryFilters() {
        console.log('🔍 Inicializando filtros de galería...');
        
        // Obtener elementos
        const searchInput = document.getElementById('gallery-search');
        const typeSelect = document.getElementById('gallery-type');
        const statusSelect = document.getElementById('gallery-status');
        const sortSelect = document.getElementById('gallery-sort');
        const grid = document.getElementById('gallery-grid');
        
        if (!searchInput || !typeSelect || !statusSelect || !sortSelect || !grid) {
            console.log('⚠️ No se encontraron todos los elementos de filtros');
            return;
        }
        
        // Cargar proyectos originales
        loadOriginalProjects();
        
        // Debounce para búsqueda
        let searchTimeout;
        function debounce(func, wait) {
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(searchTimeout);
                    func(...args);
                };
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(later, wait);
            };
        }
        
        // Event listeners
        searchInput.addEventListener('input', debounce(applyFilters, 300));
        typeSelect.addEventListener('change', applyFilters);
        statusSelect.addEventListener('change', applyFilters);
        sortSelect.addEventListener('change', applyFilters);
        
        console.log('✅ Filtros de galería iniciados');
        applyFilters(); // Aplicar filtros iniciales
    }
    
    /**
     * Carga los proyectos originales del DOM
     */
    function loadOriginalProjects() {
        // Solo buscar proyectos dentro del grid de la galería específico
        const grid = document.getElementById('gallery-grid');
        if (!grid) {
            console.warn('⚠️ No se encontró el grid de galería');
            return;
        }
        
        // Buscar solo elementos directos del grid (evitar elementos anidados en modales)
        const projectCards = Array.from(grid.children).filter(child => 
            child.hasAttribute('data-project-id')
        );
        
        originalProjects = projectCards.map(card => {
            const nameEl = card.querySelector('h3');
            const descEl = card.querySelector('p.text-gray-600');
            const typeEl = card.querySelector('.bg-blue-100');
            const statusEl = card.querySelector('.absolute.top-3.left-3');
            
            return {
                element: card,
                id: card.getAttribute('data-project-id'),
                name: nameEl ? nameEl.textContent.trim() : '',
                description: descEl ? descEl.textContent.trim() : '',
                type: typeEl ? typeEl.textContent.trim() : '',
                status: statusEl ? statusEl.textContent.trim() : ''
            };
        });
        
        console.log(`📋 Cargados ${originalProjects.length} proyectos para filtrar`);
    }
    
    /**
     * Aplica los filtros y ordenamiento a los proyectos
     */
    function applyFilters() {
        const searchTerm = document.getElementById('gallery-search').value.toLowerCase();
        const selectedType = document.getElementById('gallery-type').value;
        const selectedStatus = document.getElementById('gallery-status').value;
        const sortBy = document.getElementById('gallery-sort').value;
        
        console.log('🔍 Aplicando filtros:', { searchTerm, selectedType, selectedStatus, sortBy });
        
        // Filtrar proyectos
        let filteredProjects = originalProjects.filter(project => {
            // Filtro de búsqueda
            if (searchTerm) {
                const searchText = (project.name + ' ' + project.description).toLowerCase();
                if (!searchText.includes(searchTerm)) return false;
            }
            
            // Filtro de tipo
            if (selectedType && selectedType !== '') {
                if (!project.type.includes(selectedType)) return false;
            }
            
            // Filtro de estado
            if (selectedStatus && selectedStatus !== '') {
                if (!project.status.includes(selectedStatus)) return false;
            }
            
            return true;
        });
        
        // Ordenar proyectos
        switch(sortBy) {
            case 'nombre':
                filteredProjects.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'estado':
                filteredProjects.sort((a, b) => a.status.localeCompare(b.status));
                break;
            case 'tipo':
                filteredProjects.sort((a, b) => a.type.localeCompare(b.type));
                break;
            case 'fecha':
            default:
                // Mantener orden original (que viene del servidor)
                break;
        }
        
        // Mostrar/ocultar proyectos y reordenar
        const grid = document.getElementById('gallery-grid');
        
        // Resetear todos los elementos a visible primero
        originalProjects.forEach(project => {
            project.element.style.display = 'block';
            project.element.style.order = '';
        });
        
        // Solo si hay ordenamiento, usar la lógica de reordenar
        if (sortBy !== 'fecha') {
            // Ocultar todos primero
            originalProjects.forEach(project => {
                project.element.style.display = 'none';
            });
            
            // Mostrar y reordenar solo los proyectos filtrados
            filteredProjects.forEach((project, index) => {
                project.element.style.display = 'block';
                project.element.style.order = index;
            });
        } else {
            // Para filtrado simple (sin reordenamiento), solo mostrar/ocultar
            originalProjects.forEach(project => {
                const shouldShow = filteredProjects.includes(project);
                project.element.style.display = shouldShow ? 'block' : 'none';
            });
        }
        
        // Mostrar mensaje si no hay resultados
        showNoResultsMessage(filteredProjects.length === 0);
        
        console.log(`✅ Filtrado completado: ${filteredProjects.length}/${originalProjects.length} proyectos mostrados`);
    }
    
    /**
     * Muestra u oculta el mensaje de "no hay resultados"
     * @param {boolean} show - Si debe mostrar el mensaje
     */
    function showNoResultsMessage(show) {
        const grid = document.getElementById('gallery-grid');
        let noResultsMsg = document.getElementById('no-results-message');
        
        if (show) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.id = 'no-results-message';
                noResultsMsg.className = 'col-span-full text-center py-12 text-gray-500';
                noResultsMsg.innerHTML = `
                    <div class="text-6xl mb-4">🔍</div>
                    <h3 class="text-xl font-semibold mb-2">No se encontraron proyectos</h3>
                    <p>Intenta ajustar los filtros de búsqueda</p>
                `;
                grid.appendChild(noResultsMsg);
            }
            noResultsMsg.style.display = '';
        } else if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
    }
    
    /**
     * Reinicia los filtros a su estado inicial
     */
    function resetFilters() {
        document.getElementById('gallery-search').value = '';
        document.getElementById('gallery-type').value = '';
        document.getElementById('gallery-status').value = '';
        document.getElementById('gallery-sort').value = 'nombre';
        applyFilters();
    }
    
    /**
     * Obtiene el estado actual de los filtros
     * @returns {Object} Estado actual de los filtros
     */
    function getFiltersState() {
        return {
            searchTerm: document.getElementById('gallery-search').value,
            selectedType: document.getElementById('gallery-type').value,
            selectedStatus: document.getElementById('gallery-status').value,
            sortBy: document.getElementById('gallery-sort').value
        };
    }
    
    /**
     * Establece el estado de los filtros
     * @param {Object} state - Estado de los filtros a aplicar
     */
    function setFiltersState(state) {
        if (state.searchTerm !== undefined) {
            document.getElementById('gallery-search').value = state.searchTerm;
        }
        if (state.selectedType !== undefined) {
            document.getElementById('gallery-type').value = state.selectedType;
        }
        if (state.selectedStatus !== undefined) {
            document.getElementById('gallery-status').value = state.selectedStatus;
        }
        if (state.sortBy !== undefined) {
            document.getElementById('gallery-sort').value = state.sortBy;
        }
        applyFilters();
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGalleryFilters);
    } else {
        initGalleryFilters();
    }
    
    // Exponer funciones públicas
    window.GalleryFilters = {
        init: initGalleryFilters,
        reset: resetFilters,
        getState: getFiltersState,
        setState: setFiltersState,
        applyFilters: applyFilters
    };
    
    // Compatibilidad con llamadas directas
    window.initGalleryFilters = initGalleryFilters;
    
})();
