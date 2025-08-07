// Módulo de interfaz de usuario para la gestión de flota
window.FleetUI = (function() {
    
    // Función para actualizar estado simple (sin distracciones)
    function updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            let icon = '';
            let className = '';
            
            switch (type) {
                case 'connected':
                    icon = '🟢 ';
                    className = 'text-green-600';
                    break;
                case 'disconnected':
                    icon = '🔴 ';
                    className = 'text-red-600';
                    break;
                case 'error':
                    icon = '❌ ';
                    className = 'text-red-600';
                    break;
                case 'connecting':
                    icon = '🔄 ';
                    className = 'text-blue-600';
                    break;
                default:
                    icon = '🔄 ';
                    className = 'text-gray-600';
            }
            
            statusElement.textContent = icon + message;
            statusElement.className = `font-medium ${className}`;
        }
        console.log('Estado:', message);
    }
    
    // Función para actualizar estado de la flota (solo cuando cambie)
    function updateFleetStatus(hasError = null, printerCount = null) {
        const state = window.FleetState;
        const fleetState = state.getFleetState();
        
        // Si se pasan parámetros, actualizar el estado global
        if (hasError !== null) {
            state.setFleetState({ hasError });
        }
        if (printerCount !== null) {
            state.setFleetState({ printerCount });
        }
        
        const updatedState = state.getFleetState();
        
        // Actualizar la UI basado en el estado actual
        if (updatedState.hasError) {
            updateStatus('Error en la flota de impresoras', 'error');
        } else if (updatedState.isConnected) {
            if (updatedState.printerCount === 0) {
                updateStatus('Conectado - Sin impresoras registradas', 'connected');
            } else {
                const printerText = updatedState.printerCount === 1 ? 'impresora conectada' : 'impresoras conectadas';
                updateStatus(`${updatedState.printerCount} ${printerText}`, 'connected');
            }
        } else {
            updateStatus('Conectando...', 'connecting');
        }
    }
    
    // Actualiza el estado visual del span #last-update
    function updateLastUpdateStatus(state) {
        const el = document.getElementById('last-update');
        if (!el) return;
        let icon = '', text = '', color = '';
        switch (state) {
            case 'connected':
                icon = '🟢';
                text = 'Conectado';
                color = 'color: #16a34a;'; // verde
                break;
            case 'disconnected':
                icon = '🔴';
                text = 'Desconectado';
                color = 'color: #dc2626;'; // rojo
                break;
            case 'connecting':
            default:
                icon = '🔄';
                text = 'Conectando...';
                color = 'color: #2563eb;'; // azul
                break;
        }
        el.innerHTML = `<span style="${color} font-weight: 500;">${icon} ${text}</span>`;
    }
    
    // Sincronizar estados visuales de conexión
    function syncConnectionStatus() {
        const state = window.FleetState;
        const fleetState = state.getFleetState();
        
        // Si no hay impresoras conectadas (todas están unreachable o no hay impresoras)
        if (!fleetState.isConnected || fleetState.printerCount === 0) {
            updateStatus('Sin impresoras conectadas', 'disconnected');
            updateLastUpdateStatus('disconnected');
        } else {
            // Contar cuántas impresoras están realmente conectadas
            const tbody = document.getElementById('fleet-printers');
            let connectedCount = 0;
            if (tbody) {
                const rows = tbody.querySelectorAll('tr[data-printer-id]');
                rows.forEach(row => {
                    const statusSpan = row.querySelector('.status-badge');
                    if (statusSpan && !statusSpan.textContent.includes('unreachable')) {
                        connectedCount++;
                    }
                });
            }
            
            if (connectedCount > 0) {
                updateStatus(`${connectedCount} ${connectedCount === 1 ? 'impresora conectada' : 'impresoras conectadas'}`, 'connected');
                updateLastUpdateStatus('connected');
            } else {
                updateStatus('Sin impresoras conectadas', 'disconnected');
                updateLastUpdateStatus('disconnected');
            }
        }
    }
    
    return {
        updateStatus,
        updateFleetStatus,
        updateLastUpdateStatus,
        syncConnectionStatus
    };
})();
