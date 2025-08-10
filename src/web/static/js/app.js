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
                navigateTo(targetId);
                
                // Cerrar sidebar en móviles después de navegación
                if (isMobile) {
                    closeMobileSidebar();
                }
            });
        });

        // Load initial module (e.g., dashboard)
        const initialModule = 'dashboard';
        sidebarLinks[0].classList.add('active');
        navigateTo(initialModule);
        
        // Listen for resize events
        window.addEventListener('resize', handleResize);
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

            // Initialize module-specific JavaScript
            if (moduleId === 'fleet') {
                if (typeof initFleetModule === 'function') {
                    initFleetModule();
                }
            }
            
            // Initialize dashboard module (project management functionality)
            if (moduleId === 'dashboard') {
                if (typeof initProjectManagement === 'function') {
                    console.log('Inicializando módulo de gestión de proyectos...');
                    setTimeout(initProjectManagement, 100); // Pequeño delay para asegurar que el DOM esté listo
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