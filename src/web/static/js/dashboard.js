/**
 * Dashboard JavaScript Module
 * Maneja la funcionalidad del dashboard centrado en proyectos
 */

class DashboardManager {
    constructor() {
        this.currentView = 'detail'; // 'detail' o 'gantt'
        this.init();
    }

    init() {
        this.initViewToggle();
        this.initProjectInteractions();
        this.initPrinterActions();
        this.loadDashboardData();
        
        // Auto-actualización cada 30 segundos
        setInterval(() => {
            this.updateKPIs();
            this.updateProjects();
        }, 30000);
    }

    /**
     * Inicializa el toggle entre vista detallada y Gantt
     */
    initViewToggle() {
        const detailBtn = document.querySelector('button[data-view="detail"]');
        const ganttBtn = document.querySelector('button[data-view="gantt"]');

        if (detailBtn && ganttBtn) {
            detailBtn.addEventListener('click', () => this.switchView('detail'));
            ganttBtn.addEventListener('click', () => this.switchView('gantt'));
        }
    }

    /**
     * Cambia entre vista detallada y Gantt
     */
    switchView(view) {
        const detailView = document.getElementById('detail-view');
        const ganttView = document.getElementById('gantt-view');
        const detailBtn = document.querySelector('button[data-view="detail"]');
        const ganttBtn = document.querySelector('button[data-view="gantt"]');

        if (!detailView || !ganttView || !detailBtn || !ganttBtn) return;

        if (view === 'gantt') {
            detailView.classList.add('hidden');
            ganttView.classList.remove('hidden');
            this.currentView = 'gantt';
            
            ganttBtn.className = 'px-3 py-1 bg-white rounded-lg text-indigo-600 text-xs font-medium';
            detailBtn.className = 'px-3 py-1 bg-white/20 rounded-lg text-xs border border-white/30';
            
            this.animateGanttBars();
        } else {
            detailView.classList.remove('hidden');
            ganttView.classList.add('hidden');
            this.currentView = 'detail';
            
            detailBtn.className = 'px-3 py-1 bg-white rounded-lg text-indigo-600 text-xs font-medium';
            ganttBtn.className = 'px-3 py-1 bg-white/20 rounded-lg text-xs border border-white/30';
        }
    }

    /**
     * Anima las barras del Gantt al mostrar
     */
    animateGanttBars() {
        setTimeout(() => {
            const ganttBars = document.querySelectorAll('#gantt-view .grid-cols-7 > div:not(.bg-gray-200)');
            ganttBars.forEach((bar, index) => {
                bar.style.transform = 'scaleX(0)';
                bar.style.transformOrigin = 'left';
                bar.style.transition = `transform 0.${index + 3}s ease-out`;
                
                setTimeout(() => {
                    bar.style.transform = 'scaleX(1)';
                }, index * 100);
            });
        }, 100);
    }

    /**
     * Inicializa interacciones con proyectos
     */
    initProjectInteractions() {
        const projectCards = document.querySelectorAll('[data-project-card]');
        
        projectCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.expandProjectDetails(card);
                }
            });
        });
    }

    /**
     * Inicializa acciones de impresoras
     */
    initPrinterActions() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const buttonText = button.textContent.toLowerCase();
            
            if (buttonText.includes('pausar')) {
                this.pausePrinter(button);
            } else if (buttonText.includes('reanudar')) {
                this.resumePrinter(button);
            } else if (buttonText.includes('cancelar')) {
                this.cancelPrint(button);
            }
        });
    }

    /**
     * Pausa una impresora
     */
    pausePrinter(button) {
        const printerCard = button.closest('.border');
        const printerName = printerCard.querySelector('.text-sm.text-gray-500').textContent;
        
        button.disabled = true;
        button.textContent = '⏸ Pausando...';
        
        // Simulación de pausa (aquí iría la llamada real a la API)
        setTimeout(() => {
            button.textContent = '▶ Reanudar';
            button.className = 'px-2 py-1 bg-green-600 text-white rounded text-xs';
            
            const statusBadge = printerCard.querySelector('.bg-blue-100');
            if (statusBadge) {
                statusBadge.className = 'text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800';
                statusBadge.textContent = 'Pausada';
            }
            
            button.disabled = false;
            this.showNotification(`Impresora ${printerName} pausada correctamente`, 'success');
        }, 1000);
    }

    /**
     * Reanuda una impresora
     */
    resumePrinter(button) {
        const printerCard = button.closest('.border');
        const printerName = printerCard.querySelector('.text-sm.text-gray-500').textContent;
        
        button.disabled = true;
        button.textContent = '▶ Reanudando...';
        
        // Simulación de reanudación
        setTimeout(() => {
            button.textContent = '⏸ Pausar';
            button.className = 'px-2 py-1 bg-yellow-500 text-white rounded text-xs';
            
            const statusBadge = printerCard.querySelector('.bg-yellow-100');
            if (statusBadge) {
                statusBadge.className = 'text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800';
                statusBadge.textContent = 'Imprimiendo';
            }
            
            button.disabled = false;
            this.showNotification(`Impresora ${printerName} reanudada correctamente`, 'success');
        }, 1000);
    }

    /**
     * Cancela una impresión
     */
    cancelPrint(button) {
        const printerCard = button.closest('.border');
        const printerName = printerCard.querySelector('.text-sm.text-gray-500').textContent;
        
        if (confirm(`¿Estás seguro de cancelar la impresión en ${printerName}?`)) {
            button.disabled = true;
            button.textContent = '❌ Cancelando...';
            
            // Simulación de cancelación
            setTimeout(() => {
                // Aquí se ocultaría o actualizaría la tarjeta
                this.showNotification(`Impresión en ${printerName} cancelada`, 'warning');
                this.updateProjects(); // Actualizar vista
            }, 1500);
        }
    }

    /**
     * Carga datos iniciales del dashboard
     */
    async loadDashboardData() {
        try {
            // Aquí irían las llamadas reales a las APIs
            // const [kpis, projects, queue] = await Promise.all([
            //     fetch('/api/dashboard/summary').then(r => r.json()),
            //     fetch('/api/projects/active').then(r => r.json()),
            //     fetch('/api/queue').then(r => r.json())
            // ]);
            
            // Por ahora usamos datos de ejemplo
            this.updateKPIsWithData({
                fleetStatus: { total: 8, active: 3, idle: 4, error: 1 },
                queueSize: 12,
                completionRate: 92,
                activeProjects: 3,
                successRate: 92,
                efficiency: 85,
                material: 2.3
            });
            
        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
            this.showNotification('Error cargando datos del dashboard', 'error');
        }
    }

    /**
     * Actualiza los KPIs con datos reales
     */
    updateKPIsWithData(data) {
        const kpiElements = {
            'fleet-status': data.fleetStatus.active,
            'queue-size': data.queueSize,
            'completion-rate': `${data.completionRate}%`,
            'active-projects': data.activeProjects,
            'success-rate': `${data.successRate}%`,
            'efficiency': `${data.efficiency}%`,
            'material-usage': `${data.material}kg`
        };

        Object.entries(kpiElements).forEach(([key, value]) => {
            const element = document.querySelector(`[data-kpi="${key}"]`);
            if (element) {
                element.textContent = value;
                element.classList.add('animate-pulse');
                setTimeout(() => element.classList.remove('animate-pulse'), 1000);
            }
        });
    }

    /**
     * Actualiza KPIs
     */
    async updateKPIs() {
        try {
            // Simular actualización de KPIs
            const elements = document.querySelectorAll('[data-kpi]');
            elements.forEach(el => {
                el.classList.add('animate-pulse');
                setTimeout(() => el.classList.remove('animate-pulse'), 500);
            });
        } catch (error) {
            console.error('Error actualizando KPIs:', error);
        }
    }

    /**
     * Actualiza información de proyectos
     */
    async updateProjects() {
        try {
            // Aquí iría la lógica de actualización de proyectos
            console.log('Actualizando proyectos...');
        } catch (error) {
            console.error('Error actualizando proyectos:', error);
        }
    }

    /**
     * Muestra notificaciones al usuario
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
        
        const bgColors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        notification.className += ` ${bgColors[type] || bgColors.info}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Expande detalles de un proyecto
     */
    expandProjectDetails(card) {
        // Aquí se podría implementar expansión de detalles
        console.log('Expandiendo detalles del proyecto');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});

// Exportar para uso modular si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
}
