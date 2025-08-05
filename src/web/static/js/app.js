document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE ---
    let appData = {};

    // --- API URL ---
    const API_URL = 'http://127.0.0.1:8000';

    // --- DOM ELEMENTS ---
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const mainContent = document.getElementById('main-content');

    // --- INITIALIZATION ---
    async function init() {
        // Navigation
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('data-module');
                navigateTo(targetId);
            });
        });

        // Load initial module (e.g., dashboard)
        const initialModule = 'dashboard';
        sidebarLinks[0].classList.add('active');
        navigateTo(initialModule);
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