// Módulo de gestión de datos para la flota
window.FleetData = (function() {
    
    // Función para cargar datos de prueba
    function loadTestData() {
        console.log('📊 Cargando datos de prueba...');
        
        const tbody = document.getElementById('fleet-printers');
        console.log('tbody encontrado:', !!tbody);
        
        if (!tbody) {
            console.error('No se encontró tbody');
            return;
        }
        
        tbody.innerHTML = `
            <tr data-printer-id="test-1">
                <td class="px-4 py-2">Impresora Prueba</td>
                <td class="px-4 py-2">Generic</td>
                <td class="px-4 py-2">192.168.1.100</td>
                <td class="px-4 py-2">
                    <span class="status-badge status-ready">ready</span>
                </td>
                <td class="px-4 py-2">25.5°C / 0°C</td>
                <td class="px-4 py-2">23.1°C / 0°C</td>
                <td class="px-4 py-2">print, pause</td>
                <td class="px-4 py-2">Laboratorio</td>
                <td class="px-4 py-2">
                    <button onclick="alert('Eliminar')" class="text-red-600 hover:underline">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
        
        console.log('Fila de prueba agregada');
        window.FleetUI.updateStatus('Cargando datos iniciales...', 'loading');
        
        setTimeout(() => {
            loadRealData();
        }, 3000);
    }
    
    // Función para cargar datos reales (con estado simple)
    async function loadRealData() {
        try {
            const updateTime = new Date().toLocaleTimeString();
            console.log(`📊 Cargando datos reales a las ${updateTime}...`);
            
            const response = await fetch('/api/fleet/printers', { cache: 'no-store' });
            if (response.ok) {
                const printers = await response.json();
                console.log(`📊 Recibidas ${printers.length} impresoras a las ${updateTime}`);
                
                // Actualizar estado de las impresoras
                if (window.FleetState) {
                    window.FleetState.setPrinters(printers);
                }
                
                // Renderizar tabla
                window.FleetTable.renderPrinters(printers);
                
                // 🎴 NUEVO: Renderizar tarjetas
                console.log('🎴 Intentando renderizar tarjetas...');
                if (window.FleetCards) {
                    console.log('🎴 FleetCards disponible, llamando a renderCards');
                    window.FleetCards.renderCards(printers);
                } else {
                    console.error('❌ FleetCards no está disponible');
                }
                
                // Emitir evento para actualizar módulos dependientes
                if (window.FleetEventBus) {
                    window.FleetEventBus.emit('printersUpdated', printers);
                }
                
                // Verificar si al menos una impresora está conectada
                const isAnyPrinterConnected = printers.some(printer => printer.status !== 'unreachable');
                const newPrinterCount = printers.length;
                
                const state = window.FleetState;
                const currentFleetState = state.getFleetState();
                
                // Actualizar estado de la flota solo si cambió
                if (currentFleetState.isConnected !== isAnyPrinterConnected || 
                    currentFleetState.printerCount !== newPrinterCount || 
                    currentFleetState.hasError) {
                    
                    state.setFleetState({
                        isConnected: isAnyPrinterConnected,
                        printerCount: newPrinterCount,
                        hasError: false
                    });
                    window.FleetUI.syncConnectionStatus();
                }
                
                // Si no se ha intentado WebSocket aún, intentarlo
                const ws = state.getWebSocket();
                if (!ws || ws.readyState === WebSocket.CLOSED) {
                    setTimeout(() => window.FleetCommunication.connectWebSocketOptimized(), 2000);
                }
            } else {
                console.error('❌ Error en respuesta:', response.status);
                const state = window.FleetState;
                const currentFleetState = state.getFleetState();
                if (!currentFleetState.hasError) {
                    state.setFleetState({
                        hasError: true,
                        isConnected: false
                    });
                    window.FleetUI.updateFleetStatus();
                }
            }
        } catch (error) {
            console.error('❌ Error de red:', error);
            const state = window.FleetState;
            const currentFleetState = state.getFleetState();
            if (!currentFleetState.hasError) {
                state.setFleetState({
                    hasError: true,
                    isConnected: false
                });
                window.FleetUI.updateFleetStatus();
            }
        }
    }
    
    return {
        loadTestData,
        loadRealData
    };
})();
