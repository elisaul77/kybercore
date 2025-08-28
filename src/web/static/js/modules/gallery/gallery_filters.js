// 🎯 Módulo de Filtros y Búsqueda para Galería KyberCore
// Maneja la funcionalidad de búsqueda, filtrado y ordenamiento de proyectos

window.GalleryFilters = (function() {
    // Estado interno del módulo
    let currentFilters = {
        search: '',
        type: 'Todos los tipos',
        status: 'Todos los estados',
        sortBy: 'Fecha de creación'
    };

    let originalProjects = [];
    let filteredProjects = [];

    // Elementos DOM
    let searchInput;
    let typeSelect;
    let statusSelect;
    let sortSelect;
    let projectsContainer;

    /**
     * Inicializa el módulo de filtros y búsqueda
     */
    function init() {
        console.log('🎯 Inicializando módulo de filtros y búsqueda...');

        // Obtener referencias a elementos DOM
        searchInput = document.getElementById('gallery-search-input');
        typeSelect = document.getElementById('gallery-type-filter');
        statusSelect = document.getElementById('gallery-status-filter');
        sortSelect = document.getElementById('gallery-sort-select');
        projectsContainer = document.getElementById('gallery-projects-container');

        if (!searchInput || !typeSelect || !statusSelect || !sortSelect || !projectsContainer) {
            console.warn('⚠️ Algunos elementos de filtro no encontrados, funcionalidad limitada');
            return false;
        }

        // Configurar event listeners
        setupEventListeners();

        // Cargar proyectos iniciales
        loadInitialProjects();

        console.log('✅ Módulo de filtros y búsqueda inicializado');
        return true;
    }

    /**
     * Configura los event listeners para los controles de filtro
     */
    function setupEventListeners() {
        // Event listener para búsqueda en tiempo real
        searchInput.addEventListener('input', debounce(handleSearch, 300));

        // Event listeners para selects
        typeSelect.addEventListener('change', handleFilterChange);
        statusSelect.addEventListener('change', handleFilterChange);
        sortSelect.addEventListener('change', handleSortChange);

        console.log('🎧 Event listeners configurados');
    }

    /**
     * Carga los proyectos iniciales desde el DOM
     */
    function loadInitialProjects() {
        const projectElements = projectsContainer.querySelectorAll('[data-project-id]');
        originalProjects = Array.from(projectElements).map(element => ({
            element: element,
            id: element.dataset.projectId,
            name: getProjectName(element),
            description: getProjectDescription(element),
            type: getProjectType(element),
            status: getProjectStatus(element),
            createdDate: getProjectCreatedDate(element),
            author: getProjectAuthor(element)
        }));

        filteredProjects = [...originalProjects];
        console.log(`📦 Cargados ${originalProjects.length} proyectos iniciales`);
        
        // Actualizar estadísticas iniciales
        updateFilterStats();
    }

    /**
     * Maneja el evento de búsqueda
     */
    function handleSearch(event) {
        currentFilters.search = event.target.value.toLowerCase();
        applyFilters();
    }

    /**
     * Maneja el cambio en los filtros
     */
    function handleFilterChange(event) {
        const filterType = event.target.id.replace('gallery-', '').replace('-filter', '').replace('-select', '');
        currentFilters[filterType] = event.target.value;
        applyFilters();
    }

    /**
     * Maneja el cambio en el ordenamiento
     */
    function handleSortChange(event) {
        currentFilters.sortBy = event.target.value;
        applyFilters();
    }

    /**
     * Aplica todos los filtros y búsqueda
     */
    function applyFilters() {
        console.log('🔍 Aplicando filtros:', currentFilters);

        // Filtrar proyectos
        filteredProjects = originalProjects.filter(project => {
            // Filtro de búsqueda
            const matchesSearch = !currentFilters.search ||
                project.name.toLowerCase().includes(currentFilters.search) ||
                project.description.toLowerCase().includes(currentFilters.search) ||
                project.author.toLowerCase().includes(currentFilters.search);

            // Filtro de tipo
            const matchesType = currentFilters.type === 'Todos los tipos' ||
                project.type === currentFilters.type;

            // Filtro de estado
            const matchesStatus = currentFilters.status === 'Todos los estados' ||
                project.status === currentFilters.status;

            return matchesSearch && matchesType && matchesStatus;
        });

        // Ordenar proyectos
        sortProjects();

        // Actualizar UI
        updateProjectsDisplay();

        // Actualizar estadísticas
        updateFilterStats();

        console.log(`✅ Filtros aplicados: ${filteredProjects.length} proyectos encontrados`);
    }

    /**
     * Ordena los proyectos según el criterio seleccionado
     */
    function sortProjects() {
        filteredProjects.sort((a, b) => {
            switch (currentFilters.sortBy) {
                case 'Nombre (A-Z)':
                    return a.name.localeCompare(b.name);
                case 'Estado':
                    return a.status.localeCompare(b.status);
                case 'Tipo':
                    return a.type.localeCompare(b.type);
                case 'Fecha de creación':
                default:
                    return new Date(b.createdDate) - new Date(a.createdDate);
            }
        });
    }

    /**
     * Actualiza la visualización de proyectos
     */
    function updateProjectsDisplay() {
        // Ocultar todos los proyectos primero
        originalProjects.forEach(project => {
            project.element.style.display = 'none';
        });

        // Mostrar solo los proyectos filtrados
        filteredProjects.forEach(project => {
            project.element.style.display = 'block';
        });

        // Si no hay resultados, mostrar mensaje
        if (filteredProjects.length === 0) {
            showNoResultsMessage();
        } else {
            hideNoResultsMessage();
        }
    }

    /**
     * Actualiza las estadísticas de filtros
     */
    function updateFilterStats() {
        const statsElement = document.getElementById('gallery-filter-stats');
        if (statsElement) {
            statsElement.textContent = `${filteredProjects.length} de ${originalProjects.length} proyectos`;
        }
    }

    /**
     * Muestra mensaje cuando no hay resultados
     */
    function showNoResultsMessage() {
        let noResultsMsg = projectsContainer.querySelector('.no-results-message');
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results-message col-span-full text-center py-12';
            noResultsMsg.innerHTML = `
                <div class="text-gray-400">
                    <div class="text-6xl mb-4">🔍</div>
                    <h3 class="text-xl font-semibold mb-2">No se encontraron proyectos</h3>
                    <p class="text-sm">Intenta ajustar los filtros de búsqueda</p>
                    <button onclick="GalleryFilters.clearFilters()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        Limpiar filtros
                    </button>
                </div>
            `;
            projectsContainer.appendChild(noResultsMsg);
        }
        noResultsMsg.style.display = 'block';
    }

    /**
     * Oculta mensaje de no resultados
     */
    function hideNoResultsMessage() {
        const noResultsMsg = projectsContainer.querySelector('.no-results-message');
        if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
    }

    // Funciones auxiliares para extraer datos de los elementos del DOM

    function getProjectName(element) {
        const titleElement = element.querySelector('h3');
        return titleElement ? titleElement.textContent.trim() : '';
    }

    function getProjectDescription(element) {
        const descElement = element.querySelector('p.text-gray-600');
        return descElement ? descElement.textContent.trim() : '';
    }

    function getProjectType(element) {
        const typeBadge = element.querySelector('.bg-blue-100');
        return typeBadge ? typeBadge.textContent.trim() : '';
    }

    function getProjectStatus(element) {
        const statusBadge = element.querySelector('.absolute.top-3.left-3');
        if (statusBadge) {
            const statusText = statusBadge.textContent.trim();
            // Mapear texto del badge al valor del filtro
            const statusMap = {
                'Completado': 'completado',
                'En Progreso': 'en_progreso',
                'Listo': 'listo',
                'Problemas': 'problemas'
            };
            return statusMap[statusText] || statusText.toLowerCase();
        }
        return '';
    }

    function getProjectCreatedDate(element) {
        // Por ahora usamos la fecha actual como fallback
        // En una implementación real, esto vendría de los datos del proyecto
        return new Date().toISOString();
    }

    function getProjectAuthor(element) {
        const authorElement = element.querySelector('.text-xs.text-gray-500');
        return authorElement ? authorElement.textContent.replace('Por: ', '').trim() : '';
    }

    // Función de debounce para optimizar la búsqueda
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // API pública del módulo
    return {
        init,
        clearFilters: function() {
            currentFilters = {
                search: '',
                type: 'Todos los tipos',
                status: 'Todos los estados',
                sortBy: 'Fecha de creación'
            };

            // Resetear elementos del formulario
            if (searchInput) searchInput.value = '';
            if (typeSelect) typeSelect.value = 'Todos los tipos';
            if (statusSelect) statusSelect.value = 'Todos los estados';
            if (sortSelect) sortSelect.value = 'Fecha de creación';

            applyFilters();
        },
        reloadProjects: function() {
            console.log('🔄 Recargando proyectos en el módulo de filtros...');
            loadInitialProjects();
            applyFilters();
        },
        getCurrentFilters: () => ({ ...currentFilters }),
        getFilteredCount: () => filteredProjects.length,
        getTotalCount: () => originalProjects.length
    };
})();

console.log('🎯 Módulo GalleryFilters cargado');
