// Gestión de flota para KyberCore SPA - Versión simplificada
window.initFleetModule = function() {
    console.log('🚀 Fleet module iniciado');
    
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
        updateStatus('Cargando datos iniciales...', 'loading');
        
        setTimeout(() => {
            loadRealData();
        }, 3000);
    }
    
    // Función para cargar datos reales (con estado simple)
    async function loadRealData() {
        try {
            const updateTime = new Date().toLocaleTimeString();
            console.log(`📊 Cargando datos reales a las ${updateTime}...`);
            
            const response = await fetch('/api/fleet/printers');
            if (response.ok) {
                const printers = await response.json();
                console.log(`📊 Recibidas ${printers.length} impresoras a las ${updateTime}`);
                
                const tbody = document.getElementById('fleet-printers');
                if (tbody) {
                    // Limpiar completamente la tabla para evitar que queden datos de prueba
                    tbody.innerHTML = '';
                    
                    printers.forEach(printer => {
                        // Crear nueva fila para cada impresora real
                        const row = document.createElement('tr');
                        row.setAttribute('data-printer-id', printer.id);
                        tbody.appendChild(row);
                        console.log(`➕ Impresora cargada: ${printer.name}`);
                        
                        const extTemp = printer.realtime_data?.extruder_temp || 'N/A';
                        const extTarget = printer.realtime_data?.extruder_target || 'N/A';
                        const bedTemp = printer.realtime_data?.bed_temp || 'N/A';
                        const bedTarget = printer.realtime_data?.bed_target || 'N/A';
                        
                        row.innerHTML = `
                            <td class="px-4 py-2">${printer.name}</td>
                            <td class="px-4 py-2">${printer.model}</td>
                            <td class="px-4 py-2">${printer.ip}</td>
                            <td class="px-4 py-2">
                                <span class="status-badge status-${printer.status}">${printer.status}</span>
                            </td>
                            <td class="px-4 py-2">${extTemp}°C / ${extTarget}°C</td>
                            <td class="px-4 py-2">${bedTemp}°C / ${bedTarget}°C</td>
                            <td class="px-4 py-2">${(printer.capabilities || []).join(', ')}</td>
                            <td class="px-4 py-2">${printer.location || ''}</td>
                            <td class="px-4 py-2">
                                <button onclick="deletePrinter('${printer.id}')" class="text-red-600 hover:underline">
                                    Eliminar
                                </button>
                            </td>
                        `;
                        
                        // Efecto visual de actualización suave
                        row.classList.add('bg-blue-50');
                        setTimeout(() => {
                            row.classList.remove('bg-blue-50');
                        }, 500);
                    });
                    
                    // Actualizar estado de la flota solo si cambió
                    const newPrinterCount = printers.length;
                    if (!fleetState.isConnected || fleetState.printerCount !== newPrinterCount || fleetState.hasError) {
                        fleetState.isConnected = true;
                        fleetState.printerCount = newPrinterCount;
                        fleetState.hasError = false;
                        updateFleetStatus();
                    }
                    
                    // Si no se ha intentado WebSocket aún, intentarlo
                    if (!websocket || websocket.readyState === WebSocket.CLOSED) {
                        setTimeout(connectWebSocket, 2000);
                    }
                }
            } else {
                console.error('❌ Error en respuesta:', response.status);
                if (!fleetState.hasError) {
                    fleetState.hasError = true;
                    fleetState.isConnected = false;
                    updateFleetStatus();
                }
            }
        } catch (error) {
            console.error('❌ Error de red:', error);
            if (!fleetState.hasError) {
                fleetState.hasError = true;
                fleetState.isConnected = false;
                updateFleetStatus();
            }
        }
    }
    
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
    
    // Estado global de la flota
    let fleetState = {
        isConnected: false,
        printerCount: 0,
        hasError: false
    };
    
    // Función para actualizar estado de la flota (solo cuando cambie)
    function updateFleetStatus() {
        if (fleetState.hasError) {
            updateStatus('Error en la flota de impresoras', 'error');
        } else if (fleetState.isConnected) {
            const printerText = fleetState.printerCount === 1 ? 'impresora conectada' : 'impresoras conectadas';
            updateStatus(`${fleetState.printerCount} ${printerText}`, 'connected');
        } else {
            updateStatus('Conectando...', 'connecting');
        }
    }
    
    // Variables para actualizaciones automáticas
    let updateInterval = null;
    let websocket = null;
    let isAutoUpdating = false;
    
    // Función para iniciar actualizaciones automáticas (simplificada)
    function startAutoUpdates() {
        if (isAutoUpdating) return;
        
        console.log('🔄 Iniciando actualizaciones automáticas cada 5 segundos');
        isAutoUpdating = true;
        
        // Actualizar inmediatamente
        loadRealData();
        
        // Configurar intervalo de actualización cada 5 segundos
        updateInterval = setInterval(() => {
            console.log('🔄 Actualizando datos automáticamente...');
            loadRealData();
        }, 5000);
    }
    
    // Función para detener actualizaciones automáticas (simplificada)
    function stopAutoUpdates() {
        if (!isAutoUpdating) return;
        
        console.log('🛑 Deteniendo actualizaciones automáticas');
        isAutoUpdating = false;
        
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.close();
        }
    }
    
    // Función WebSocket mejorada con manejo de mensajes
    function connectWebSocket() {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            return;
        }
        
        try {
            const wsUrl = `ws://${window.location.host}/api/ws/fleet`;
            console.log('🌐 Conectando WebSocket:', wsUrl);
            updateStatus('Conectando WebSocket...');
            
            websocket = new WebSocket(wsUrl);
            
            websocket.onopen = () => {
                console.log('🔗 WebSocket conectado exitosamente');
                updateStatus('Conectado en tiempo real al servidor', 'realtime');
                
                // Suscribirse a todas las actualizaciones de impresoras
                const subscriptionMessage = {
                    type: 'subscribe_all'
                };
                websocket.send(JSON.stringify(subscriptionMessage));
                console.log('📡 Suscripción enviada:', subscriptionMessage);
            };
            
            websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('📨 Mensaje WebSocket recibido:', message);
                    
                    switch (message.type) {
                        case 'connection_established':
                            console.log('🎯 Conexión establecida, ID:', message.client_id);
                            // No actualizar estado aquí, mantener la última información
                            break;
                            
                        case 'subscription_all_confirmed':
                            console.log(`✅ Suscrito a ${message.printer_count} impresoras`);
                            updateFleetStatus(false, message.printer_count);
                            break;
                            
                        case 'printer_update':
                            console.log('🔄 Actualización de impresora:', message.printer_id);
                            updateSinglePrinter(message.printer_id, message.data);
                            // No mostrar mensajes de tiempo real que distraen
                            break;
                            
                        case 'pong':
                            console.log('💓 Pong recibido');
                            break;
                            
                        case 'error':
                            console.error('❌ Error del servidor:', message.message);
                            updateFleetStatus(true, 0);
                            break;
                            
                        default:
                            console.log('📦 Mensaje no manejado:', message.type);
                    }
                } catch (error) {
                    console.error('❌ Error procesando mensaje WebSocket:', error);
                    updateStatus('Error procesando datos en tiempo real', 'error');
                }
            };
            
            websocket.onclose = (event) => {
                console.log('❌ WebSocket cerrado:', event.code, event.reason);
                // No mostrar mensaje de tiempo real desconectado
                
                // Si el WebSocket se cierra, continuar con polling
                if (isAutoUpdating && !updateInterval) {
                    console.log('🔄 WebSocket cerrado, continuando con polling');
                    updateInterval = setInterval(() => {
                        loadRealData();
                    }, 5000);
                }
            };
            
            websocket.onerror = (error) => {
                console.error('🔥 Error WebSocket:', error);
                updateFleetStatus(true, 0);
            };
            
        } catch (error) {
            console.error('❌ Error creando WebSocket:', error);
            // No mostrar mensaje de error, solo usar modo de polling
        }
    }
    
    // Función para actualizar una sola impresora desde WebSocket
    function updateSinglePrinter(printerId, printerData) {
        try {
            console.log(`🔧 Actualizando impresora ${printerId} vía WebSocket`);
            
            const tbody = document.getElementById('fleet-printers');
            if (!tbody) return;
            
            let row = document.querySelector(`tr[data-printer-id="${printerId}"]`);
            
            if (!row) {
                console.log(`➕ Creando nueva fila para ${printerId}`);
                row = document.createElement('tr');
                row.setAttribute('data-printer-id', printerId);
                tbody.appendChild(row);
            }
            
            const extTemp = printerData.realtime_data?.extruder_temp || 'N/A';
            const extTarget = printerData.realtime_data?.extruder_target || 'N/A';
            const bedTemp = printerData.realtime_data?.bed_temp || 'N/A';
            const bedTarget = printerData.realtime_data?.bed_target || 'N/A';
            
            row.innerHTML = `
                <td class="px-4 py-2">${printerData.name}</td>
                <td class="px-4 py-2">${printerData.model}</td>
                <td class="px-4 py-2">${printerData.ip}</td>
                <td class="px-4 py-2">
                    <span class="status-badge status-${printerData.status}">${printerData.status}</span>
                </td>
                <td class="px-4 py-2">${extTemp}°C / ${extTarget}°C</td>
                <td class="px-4 py-2">${bedTemp}°C / ${bedTarget}°C</td>
                <td class="px-4 py-2">${(printerData.capabilities || []).join(', ')}</td>
                <td class="px-4 py-2">${printerData.location || ''}</td>
                <td class="px-4 py-2">
                    <button onclick="deletePrinter('${printerId}')" class="text-red-600 hover:underline">
                        Eliminar
                    </button>
                </td>
            `;
            
            // Efecto visual de actualización más sutil
            row.classList.add('bg-green-50');
            setTimeout(() => {
                row.classList.remove('bg-green-50');
            }, 800);
            
            console.log(`✅ Impresora ${printerData.name} actualizada vía WebSocket`);
            
        } catch (error) {
            console.error('❌ Error actualizando impresora individual:', error);
        }
    }
    
    // Función pública para eliminar
    window.deletePrinter = async function(id) {
        try {
            const response = await fetch(`/api/fleet/printers/${id}`, { method: 'DELETE' });
            if (response.ok) {
                const row = document.querySelector(`tr[data-printer-id="${id}"]`);
                if (row) row.remove();
                console.log('Impresora eliminada');
            } else {
                alert('Error al eliminar');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        }
    };
    
    // Función pública para detener actualizaciones (mejorada)
    window.stopFleetUpdates = function() {
        console.log('🛑 Deteniendo todas las actualizaciones de flota');
        stopAutoUpdates();
    };
    
    // Configurar formulario
    const form = document.getElementById('add-printer-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const data = {
                name: document.getElementById('printer-name').value,
                model: document.getElementById('printer-model').value,
                ip: document.getElementById('printer-ip').value,
                status: 'offline',
                capabilities: document.getElementById('printer-capabilities').value.split(',').map(s => s.trim()).filter(s => s),
                location: document.getElementById('printer-location').value
            };
            
            try {
                const response = await fetch('/api/fleet/printers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    alert('Impresora agregada');
                    form.reset();
                    loadRealData();
                } else {
                    alert('Error al agregar');
                }
            } catch (error) {
                alert('Error de red');
            }
        });
    }
    
    // INICIALIZACIÓN MEJORADA
    console.log('🚀 Iniciando Fleet con actualizaciones automáticas...');
    
    const tbody = document.getElementById('fleet-printers');
    console.log('🔍 tbody disponible:', !!tbody);
    
    if (!tbody) {
        console.error('❌ ERROR: No se encontró tbody');
        updateStatus('Error: Tabla de impresoras no encontrada', 'error');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">🔄 Iniciando sistema de monitoreo KyberCore...</td></tr>';
    updateStatus('Iniciando sistema de gestión de flota...', 'loading');
    
    // Cargar datos iniciales y luego activar actualizaciones automáticas
    setTimeout(() => {
        loadTestData();
        
        // Después de cargar datos de prueba, activar actualizaciones automáticas
        setTimeout(() => {
            startAutoUpdates();
            
            // Intentar WebSocket para tiempo real después de activar polling
            setTimeout(() => {
                connectWebSocket();
            }, 2000);
        }, 1000);
    }, 500);
};
