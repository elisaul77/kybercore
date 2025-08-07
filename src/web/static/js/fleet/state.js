// Estado global y configuración para la gestión de flota
window.FleetState = (function() {
    
    // Estado global de la flota
    let fleetState = {
        isConnected: false,
        printerCount: 0,
        hasError: false
    };
    
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
        setSystemActive: (active) => { isSystemActive = active; }
    };
})();
