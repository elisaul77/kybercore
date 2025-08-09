// Estado global y configuración para la gestión de flota
window.FleetState = (function() {
    
    // Estado global de la flota
    let fleetState = {
        isConnected: false,
        printerCount: 0,
        hasError: false
    };
    
    // Lista de impresoras
    let printers = [];
    
    // Variables para actualizaciones optimizadas
    let websocket = null;
    let isWebSocketConnected = false;
    let reconnectAttempts = 0;
    let maxReconnectAttempts = 5;
    let emergencyPollingInterval = null;
    let heartbeatInterval = null;
    let isSystemActive = false;

    return {
        // Getters y setters para el estado
        getFleetState: () => ({ ...fleetState }),
        setFleetState: (newState) => Object.assign(fleetState, newState),
        
        // Variables de WebSocket
        getWebSocket: () => websocket,
        setWebSocket: (ws) => { websocket = ws; },
        
        isWebSocketConnected: () => isWebSocketConnected,
        setWebSocketConnected: (connected) => { isWebSocketConnected = connected; },
        
        getReconnectAttempts: () => reconnectAttempts,
        setReconnectAttempts: (attempts) => { reconnectAttempts = attempts; },
        incrementReconnectAttempts: () => reconnectAttempts++,
        resetReconnectAttempts: () => { reconnectAttempts = 0; },
        
        getMaxReconnectAttempts: () => maxReconnectAttempts,
        
        // Control de intervalos
        getEmergencyPollingInterval: () => emergencyPollingInterval,
        setEmergencyPollingInterval: (interval) => { emergencyPollingInterval = interval; },
        clearEmergencyPollingInterval: () => {
            if (emergencyPollingInterval) {
                clearInterval(emergencyPollingInterval);
                emergencyPollingInterval = null;
            }
        },
        
        getHeartbeatInterval: () => heartbeatInterval,
        setHeartbeatInterval: (interval) => { heartbeatInterval = interval; },
        clearHeartbeatInterval: () => {
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
        },
        
        isSystemActive: () => isSystemActive,
        setSystemActive: (active) => { isSystemActive = active; },
        
        // Métodos para manejar impresoras
        getPrinters: () => [...printers],
        setPrinters: (newPrinters) => { 
            printers = newPrinters || []; 
            fleetState.printerCount = printers.length;
        },
        getPrinterById: (id) => printers.find(p => p.id === id),
        updatePrinter: (id, updateData) => {
            const index = printers.findIndex(p => p.id === id);
            if (index !== -1) {
                printers[index] = { ...printers[index], ...updateData };
            }
        },
        addPrinter: (printer) => {
            const existingIndex = printers.findIndex(p => p.id === printer.id);
            if (existingIndex !== -1) {
                printers[existingIndex] = printer;
            } else {
                printers.push(printer);
            }
            fleetState.printerCount = printers.length;
        },
        removePrinter: (id) => {
            printers = printers.filter(p => p.id !== id);
            fleetState.printerCount = printers.length;
        }
    };
})();
