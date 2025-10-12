document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE ---
    let appData = {};

    // --- API URL ---
    const API_URL = 'http://127.0.0.1:8000';

    // --- DOM ELEMENTS ---
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const mainContent = document.getElementById('main-content');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const closeIcon = document.getElementById('close-icon');

    // --- SIDEBAR STATE ---
    let sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    let isMobile = window.innerWidth < 1024;

    // --- INITIALIZATION ---
    async function init() {
        // Sidebar toggle functionality
        initSidebar();
        
        // Navigation
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('data-module');
                // Actualizar el hash de la URL
                window.location.hash = targetId;
                
                // Cerrar sidebar en móviles después de navegación
                if (isMobile) {
                    closeMobileSidebar();
                }
            });
        });

        // Escuchar cambios en el hash de la URL
        window.addEventListener('hashchange', handleHashChange);
        
        // Cargar el módulo inicial desde el hash o dashboard por defecto
        handleHashChange();
        
        // Listen for resize events
        window.addEventListener('resize', handleResize);
    }
    
    // --- HASH CHANGE HANDLER ---
    function handleHashChange() {
        // Obtener el módulo desde el hash (sin el #)
        let moduleId = window.location.hash.substring(1);
        
        // Si no hay hash, cargar dashboard por defecto
        if (!moduleId) {
            moduleId = 'dashboard';
            // Actualizar el hash sin recargar
            window.location.hash = moduleId;
            return; // El evento hashchange se disparará de nuevo
        }
        
        // Validar que el módulo existe
        const validModules = ['dashboard', 'new-job', 'recommender', 'analysis', 'fleet', 'consumables', 'orders', 'gallery', 'settings'];
        if (!validModules.includes(moduleId)) {
            console.warn(`Módulo desconocido: ${moduleId}, cargando dashboard`);
            moduleId = 'dashboard';
            window.location.hash = moduleId;
            return;
        }
        
        // Navegar al módulo
        navigateTo(moduleId);
    }

    // --- SIDEBAR FUNCTIONALITY ---
    function initSidebar() {
        // Apply saved sidebar state on desktop
        if (!isMobile && sidebarCollapsed) {
            sidebar.classList.add('collapsed');
        }
        updateToggleIcon();
        
        // Toggle button click handler
        sidebarToggle.addEventListener('click', toggleSidebar);
        
        // Overlay click handler (mobile)
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
        
        // Keyboard shortcut for sidebar toggle (Ctrl + B)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                toggleSidebar();
            }
        });
        
        // Initialize sidebar state based on screen size
        handleResize();
    }
    
    function toggleSidebar() {
        if (isMobile) {
            // Mobile: Show/hide sidebar with overlay
            const isOpen = sidebar.classList.contains('mobile-open');
            if (isOpen) {
                closeMobileSidebar();
            } else {
                openMobileSidebar();
            }
        } else {
            // Desktop: Collapse/expand sidebar
            sidebarCollapsed = !sidebarCollapsed;
            sidebar.classList.toggle('collapsed', sidebarCollapsed);
            // Save state to localStorage
            localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
            updateToggleIcon();
        }
    }
    
    function openMobileSidebar() {
        sidebar.classList.add('mobile-open');
        sidebarOverlay.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        updateToggleIcon();
    }
    
    function closeMobileSidebar() {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
        updateToggleIcon();
    }
    
    function updateToggleIcon() {
        const isOpen = isMobile ? sidebar.classList.contains('mobile-open') : !sidebarCollapsed;
        
        if (isOpen) {
            hamburgerIcon.classList.add('hidden');
            closeIcon.classList.remove('hidden');
        } else {
            hamburgerIcon.classList.remove('hidden');
            closeIcon.classList.add('hidden');
        }
    }
    
    function handleResize() {
        const wasMobile = isMobile;
        isMobile = window.innerWidth < 1024;
        
        if (wasMobile !== isMobile) {
            // Screen size changed, reset sidebar state
            if (isMobile) {
                // Switched to mobile
                sidebar.classList.remove('collapsed');
                closeMobileSidebar();
                sidebarCollapsed = false;
            } else {
                // Switched to desktop
                sidebar.classList.remove('mobile-open');
                sidebarOverlay.classList.remove('show');
                document.body.style.overflow = '';
            }
            updateToggleIcon();
        }
    }

    // --- NAVIGATION ---
    async function navigateTo(moduleId) {
        // Detener actualizaciones automáticas de otros módulos
        if (typeof stopFleetUpdates === 'function') {
            stopFleetUpdates();
        }
        
        // Update active link
        sidebarLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-module') === moduleId);
        });

        // Fetch and load module HTML
        try {
            const response = await fetch(`/api/${moduleId}/${moduleId}`);
            if (!response.ok) throw new Error(`Failed to load module: ${moduleId}`);
            mainContent.innerHTML = await response.text();

            // Ejecutar scripts incluidos en el HTML cargado (inline o con src).
            // Al asignar innerHTML los <script> no se ejecutan automáticamente,
            // por eso los recreamos y los añadimos al DOM para que se ejecuten.
            try {
                const scripts = Array.from(mainContent.querySelectorAll('script'));
                for (const oldScript of scripts) {
                    const newScript = document.createElement('script');
                    // copiar attributes (como type, src)
                    for (const attr of oldScript.attributes) {
                        newScript.setAttribute(attr.name, attr.value);
                    }
                    if (oldScript.src) {
                        // externo: esperar a que cargue
                        new Promise((resolve, reject) => {
                            newScript.onload = resolve;
                            newScript.onerror = reject;
                            document.head.appendChild(newScript);
                        }).catch(err => console.error('Error loading script:', err));
                    } else {
                        // inline: copiar el contenido y ejecutar
                        newScript.text = oldScript.textContent;
                        document.head.appendChild(newScript);
                        // remover inmediatamente para limpieza (el script ya se ejecutó)
                        document.head.removeChild(newScript);
                    }
                    // remover el script antiguo del container para evitar duplicados
                    if (oldScript.parentNode) oldScript.parentNode.removeChild(oldScript);
                }
            } catch (err) {
                console.error('Error al ejecutar scripts del módulo:', err);
            }
            // Initialize module-specific JavaScript
            if (moduleId === 'fleet') {
                if (typeof initFleetModule === 'function') {
                    console.log('Inicializando módulo de flota...');
                    setTimeout(initFleetModule, 100); // Pequeño delay para asegurar que el DOM esté listo
                }
            }
            
            // Initialize dashboard module (project management functionality)
            if (moduleId === 'dashboard') {
                if (typeof initProjectManagement === 'function') {
                    console.log('Inicializando módulo de gestión de proyectos...');
                    setTimeout(initProjectManagement, 100); // Pequeño delay para asegurar que el DOM esté listo
                }
            }
            
            // Initialize consumables module
            if (moduleId === 'consumables') {
                if (typeof initConsumablesModule === 'function') {
                    console.log('Inicializando módulo de consumibles...');
                    setTimeout(initConsumablesModule, 100);
                }
            }
            
            // Initialize orders module
            if (moduleId === 'orders') {
                if (typeof OrdersModule !== 'undefined' && typeof OrdersModule.init === 'function') {
                    console.log('Inicializando módulo de pedidos...');
                    setTimeout(() => OrdersModule.init(), 100);
                }
            }
            
            // Initialize gallery module
            if (moduleId === 'gallery') {
                console.log('Inicializando módulo de galería de proyectos...');
                // Inicializar el módulo de galería
                if (typeof window.initGalleryModule === 'function') {
                    window.initGalleryModule();
                }
                // Inicializar filtros de galería
                setTimeout(() => {
                    if (typeof window.initGalleryFilters === 'function') {
                        window.initGalleryFilters();
                    }
                }, 200);
                // Re-inicializar event listeners para el contenido dinámico
                if (typeof window.initGalleryEventListeners === 'function') {
                    window.initGalleryEventListeners();
                    console.log('Event listeners de galería inicializados');
                } else {
                    console.warn('initGalleryEventListeners no está disponible');
                }
            }
            // Add other module initializations here as needed
            // if (moduleId === 'recommender') { initRecommenderModule(); }

        } catch (error) {
            console.error('Navigation error:', error);
            mainContent.innerHTML = `<p class="text-red-500">Error al cargar el módulo.</p>`;
        }
    }

    // --- START THE APP ---
    init();
});