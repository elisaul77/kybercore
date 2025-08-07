// Módulo de comunicación WebSocket para la gestión de flota
window.FleetCommunication = (function() {
    
    // WebSocket optimizado con reconexión inteligente
    function connectWebSocketOptimized() {
        const state = window.FleetState;
        const ui = window.FleetUI;
        
        if (state.getWebSocket() && state.getWebSocket().readyState === WebSocket.OPEN) {
            console.log('🔌 WebSocket ya está conectado');
            return;
        }
        
        try {
            const wsUrl = `ws://${window.location.host}/api/ws/fleet`;
            console.log(`🌐 Conectando WebSocket optimizado (intento ${state.getReconnectAttempts() + 1}/${state.getMaxReconnectAttempts()}):`, wsUrl);
            
            const websocket = new WebSocket(wsUrl);
            state.setWebSocket(websocket);
            
            websocket.onopen = () => {
                console.log('✅ WebSocket conectado exitosamente');
                state.setWebSocketConnected(true);
                state.resetReconnectAttempts();
                ui.updateLastUpdateStatus('connected');
                
                // Detener polling de emergencia si estaba activo
                if (state.getEmergencyPollingInterval()) {
                    console.log('🛑 Deteniendo polling de emergencia - WebSocket conectado');
                    state.clearEmergencyPollingInterval();
                }
                
                // Suscribirse a actualizaciones
                const subscriptionMessage = { type: 'subscribe_all' };
                websocket.send(JSON.stringify(subscriptionMessage));
                console.log('📡 Suscripción enviada');
                
                // Iniciar heartbeat para mantener conexión
                startHeartbeat();
                
                // Cargar datos iniciales vía WebSocket
                requestInitialData();
            };
            
            websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('📨 Mensaje WebSocket:', message.type);
                    
                    window.FleetMessageHandler.handleMessage(message);
                } catch (error) {
                    console.error('❌ Error procesando mensaje WebSocket:', error);
                }
            };
            
            websocket.onclose = (event) => {
                console.log('❌ WebSocket desconectado:', event.code, event.reason);
                state.setWebSocketConnected(false);
                ui.updateLastUpdateStatus('disconnected');
                state.clearHeartbeatInterval();
                
                if (state.isSystemActive() && state.getReconnectAttempts() < state.getMaxReconnectAttempts()) {
                    state.incrementReconnectAttempts();
                    const delay = Math.min(1000 * Math.pow(2, state.getReconnectAttempts()), 10000);
                    console.log(`🔄 Reintentando conexión en ${delay}ms (intento ${state.getReconnectAttempts()}/${state.getMaxReconnectAttempts()})`);
                    setTimeout(() => {
                        if (state.isSystemActive()) {
                            ui.updateLastUpdateStatus('connecting');
                            connectWebSocketOptimized();
                        }
                    }, delay);
                } else if (state.isSystemActive()) {
                    console.log('⚠️ Máximo de reintentos alcanzado, activando polling de emergencia');
                    ui.updateLastUpdateStatus('disconnected');
                    startEmergencyPolling();
                }
            };
            
            websocket.onerror = (error) => {
                console.error('🔥 Error WebSocket:', error);
                state.setWebSocketConnected(false);
                ui.updateLastUpdateStatus('disconnected');
            };
            
        } catch (error) {
            console.error('❌ Error creando WebSocket:', error);
            const state = window.FleetState;
            if (state.isSystemActive() && state.getReconnectAttempts() < state.getMaxReconnectAttempts()) {
                setTimeout(() => startEmergencyPolling(), 2000);
            }
        }
    }
    
    // Heartbeat para mantener conexión WebSocket activa
    function startHeartbeat() {
        const state = window.FleetState;
        if (state.getHeartbeatInterval()) return;
        
        const interval = setInterval(() => {
            const ws = state.getWebSocket();
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000); // Ping cada 30 segundos
        
        state.setHeartbeatInterval(interval);
    }
    
    // Solicitar datos iniciales vía WebSocket
    function requestInitialData() {
        const state = window.FleetState;
        const ws = state.getWebSocket();
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'get_initial_data' }));
        }
    }
    
    // Polling de emergencia - solo cuando WebSocket falla completamente
    function startEmergencyPolling() {
        const state = window.FleetState;
        if (state.getEmergencyPollingInterval() || state.isWebSocketConnected()) return;
        
        console.log('🚨 Activando polling de emergencia (cada 15 segundos)');
        
        // Cargar datos inmediatamente
        window.FleetData.loadRealData();
        
        // Polling cada 15 segundos
        const interval = setInterval(() => {
            if (!state.isWebSocketConnected() && state.isSystemActive()) {
                console.log('📊 Polling de emergencia...');
                window.FleetData.loadRealData();
            } else {
                // Si WebSocket se reconectó, detener polling
                state.clearEmergencyPollingInterval();
                console.log('✅ WebSocket reconectado, deteniendo polling de emergencia');
            }
        }, 15000);
        
        state.setEmergencyPollingInterval(interval);
    }
    
    // Sistema de comunicación optimizado - WebSocket principal
    function startOptimizedCommunication() {
        const state = window.FleetState;
        if (state.isSystemActive()) return;
        
        console.log('🚀 Iniciando sistema de comunicación optimizado (WebSocket principal)');
        state.setSystemActive(true);
        
        // Mostrar estado inicial
        window.FleetUI.updateLastUpdateStatus('connecting');
        // Intentar WebSocket inmediatamente
        connectWebSocketOptimized();
        // Solo polling de emergencia si WebSocket falla completamente
        setTimeout(() => {
            if (!state.isWebSocketConnected()) {
                console.log('⚠️ WebSocket no disponible, activando polling de emergencia');
                window.FleetUI.updateLastUpdateStatus('disconnected');
                startEmergencyPolling();
            }
        }, 5000);
    }
    
    // Función para detener todo el sistema de comunicación
    function stopOptimizedCommunication() {
        const state = window.FleetState;
        if (!state.isSystemActive()) return;
        
        console.log('🛑 Deteniendo sistema de comunicación');
        state.setSystemActive(false);
        state.setWebSocketConnected(false);
        
        const ws = state.getWebSocket();
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
        
        state.clearEmergencyPollingInterval();
        state.clearHeartbeatInterval();
    }
    
    return {
        connectWebSocketOptimized,
        startOptimizedCommunication,
        stopOptimizedCommunication,
        startHeartbeat,
        requestInitialData,
        startEmergencyPolling
    };
})();
