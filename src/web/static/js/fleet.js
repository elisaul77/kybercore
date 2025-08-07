// Gestión de flota para KyberCore SPA - Versión modularizada
// Este archivo principal solo organiza y llama a los módulos específicos

window.initFleetModule = function() {
    console.log('🚀 Fleet module iniciado - Versión modularizada');
    
    // Función pública para detener actualizaciones (optimizada)
    window.stopFleetUpdates = function() {
        console.log('🛑 Deteniendo sistema de comunicación optimizado');
        window.FleetCommunication.stopOptimizedCommunication();
    };
    
    // Exponer funciones globales para compatibilidad con onclick en HTML
    window.deletePrinter = window.FleetCommands.deletePrinter;
    window.homePrinter = window.FleetCommands.homePrinter;
    window.pausePrinter = window.FleetCommands.pausePrinter;
    window.resumePrinter = window.FleetCommands.resumePrinter;
    window.cancelPrinter = window.FleetCommands.cancelPrinter;
    
    // INICIALIZACIÓN OPTIMIZADA
    console.log('🚀 Iniciando Fleet con sistema de comunicación optimizado...');
    
    const tbody = document.getElementById('fleet-printers');
    console.log('🔍 tbody disponible:', !!tbody);
    
    if (!tbody) {
        console.error('❌ ERROR: No se encontró tbody');
        window.FleetUI.updateStatus('Error: Tabla de impresoras no encontrada', 'error');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4">🔄 Iniciando sistema optimizado KyberCore...</td></tr>';
    window.FleetUI.updateStatus('Iniciando sistema optimizado...', 'loading');
    
    // Inicializar formularios
    window.FleetForms.initAddPrinterForm();
    
    // Cargar datos de prueba iniciales y luego activar sistema optimizado
    setTimeout(() => {
        window.FleetData.loadTestData();
        
        // Activar sistema de comunicación optimizado después de datos de prueba
        setTimeout(() => {
            window.FleetCommunication.startOptimizedCommunication();
        }, 2000);
    }, 500);
};