// Módulo para manejar mensajes WebSocket de la gestión de flota
window.FleetMessageHandler = (function() {
    
    function handleMessage(message) {
        const state = window.FleetState;
        const ui = window.FleetUI;
        const table = window.FleetTable;
        
        switch (message.type) {
            case 'connection_established':
                console.log('🎯 Conexión establecida, ID:', message.client_id);
                break;
                
            case 'subscription_all_confirmed':
                console.log(`✅ Suscrito a ${message.printer_count} impresoras`);
                ui.updateFleetStatus(false, message.printer_count);
                ui.syncConnectionStatus();
                break;
                
            case 'initial_data':
            case 'fleet_data':
                if (message.printers) {
                    console.log(`📊 Datos de flota recibidos: ${message.printers.length} impresoras`);
                    
                    // Actualizar estado de las impresoras
                    if (window.FleetState) {
                        window.FleetState.setPrinters(message.printers);
                    }
                    
                    // Renderizar tabla
                    table.populateFleetTable(message.printers);
                    ui.updateFleetStatus(false, message.printers.length);
                    
                    // Emitir evento para actualizar módulos dependientes
                    if (window.FleetEventBus) {
                        console.log('📡 Emitiendo evento printersUpdated...');
                        window.FleetEventBus.emit('printersUpdated', message.printers);
                    }
                    
                    // syncConnectionStatus() ya se llama desde populateFleetTable
                }
                break;
                
            case 'printer_update':
                console.log('🔄 Actualización de impresora:', message.printer_id);
                
                // Actualizar impresora en el estado
                if (window.FleetState && message.data) {
                    window.FleetState.updatePrinter(message.printer_id, message.data);
                }
                
                // Actualizar tabla
                table.updateSinglePrinter(message.printer_id, message.data);
                
                // Emitir evento para módulos dependientes con impresoras actualizadas
                if (window.FleetEventBus && window.FleetState) {
                    const updatedPrinters = window.FleetState.getPrinters();
                    window.FleetEventBus.emit('printersUpdated', updatedPrinters);
                }
                break;
                
            case 'pong':
                console.log('💓 Heartbeat confirmado');
                break;
                
            case 'info':
                console.log('ℹ️ Información del servidor:', message.message);
                // Si el mensaje es sobre no hay impresoras, mostrar estado conectado pero sin impresoras
                if (message.message.includes('No hay impresoras registradas')) {
                    ui.updateFleetStatus(false, 0);
                    ui.syncConnectionStatus();
                }
                break;
                
            case 'error':
                console.error('❌ Error del servidor:', message.message);
                ui.updateFleetStatus(true, 0);
                ui.syncConnectionStatus();
                break;
        }
    }
    
    return {
        handleMessage
    };
})();
