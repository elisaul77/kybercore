// Gestión de flota para KyberCore SPA con WebSockets en tiempo real (optimizado)
window.initFleetModule = function() {
    let ws = null;
    let reconnectAtte                
            case 'error':
                console.error('❌ Error del servidor:', message.message);
                updateConnectionStatus(false, `Error: ${message.message}`);
                break;
                
            default:
                console.log('📦 Mensaje no manejado:', message);
        }
    }

    function updateSinglePrinter(printerId, printerData) {
        // Actualizar cache local con datos esenciales
        printerData.last_update_time = Date.now();
        printerData.last_update_display = new Date().toLocaleTimeString();
        printerData.printer_id = printerId;
        printerData.realtime_data = printerData.realtime_data || {};
        
        // Extraer temperaturas
        printerData.hotend_temp = printerData.realtime_data.extruder_temp || 'N/A';
        printerData.hotend_target = printerData.realtime_data.extruder_target || 'N/A';
        printerData.bed_temp = printerData.realtime_data.bed_temp || 'N/A';
        printerData.bed_target = printerData.realtime_data.bed_target || 'N/A';
        
        // Estado y color
        printerData.status_color = getStatusColor(printerData.status);
        
        // Formatear displays de temperatura
        printerData.hotend_display = `${printerData.hotend_temp}°C`;
        if (printerData.hotend_target && printerData.hotend_target !== 'N/A' && printerData.hotend_target > 0) {
            printerData.hotend_display += ` / ${printerData.hotend_target}°C`;
        }
        
        printerData.bed_display = `${printerData.bed_temp}°C`;
        if (printerData.bed_target && printerData.bed_target !== 'N/A' && printerData.bed_target > 0) {
            printerData.bed_display += ` / ${printerData.bed_target}°C`;
        }

        // Estado formateado
        printerData.status_display = printerData.status || 'unknown';
        printerData.status_display = printerData.status_display.charAt(0).toUpperCase() + printerData.status_display.slice(1);

        // Capacidades y ubicación
        printerData.capabilities_display = Array.isArray(printerData.capabilities) 
            ? printerData.capabilities.join(', ') 
            : (printerData.capabilities || 'N/A');
        printerData.location_display = printerData.location || 'N/A';

        // Estados booleanos útiles
        printerData.isOnline = printerData.status !== 'unreachable' && printerData.status !== 'error' && printerData.status !== 'timeout';
        printerData.canPrint = printerData.status === 'ready' || printerData.status === 'idle';
        printerData.isPrinting = printerData.status === 'printing';
        printerData.hasWarning = printerData.status === 'error' || printerData.status === 'timeout';

        // Metadatos de cache
        printerData.cached_at = Date.now();
        printerData.is_realtime = true;
        printerData.data_source = 'websocket';

        // Almacenar en el mapa de datos
        printerData.set(printerId, printerData);
        
        // Actualizar la tabla si está visible
        updatePrinterTable();
        
        console.log(`🔄 Actualizada impresora ${printerData.name}: ${printerData.status_display}`);
    }

    function attemptReconnect() {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }

        // Backoff exponencial con jitter para evitar thundering herd
        const baseDelay = baseReconnectDelay * Math.pow(2, reconnectAttempts - 1);
        const jitter = Math.random() * 1000; // Hasta 1 segundo de jitter
        const delay = Math.min(baseDelay + jitter, 30000); // Máximo 30 segundos
        
        console.log(`🔄 Reintentando conexión en ${Math.round(delay/1000)}s (intento ${reconnectAttempts}/${maxReconnectAttempts})`);
        updateConnectionStatus(false, `Reintentando en ${Math.round(delay/1000)}s...`);
        
        reconnectTimeout = setTimeout(() => {
            if (reconnectAttempts <= maxReconnectAttempts) {
                connectWebSocket();
            } else {
                updateConnectionStatus(false, 'Conexión fallida - Máximo de intentos alcanzado');
                console.warn('🔄 Máximo de intentos de reconexión alcanzado');
            }
        }, delay);
    }    const maxReconnectAttempts = 3;  // Reducido de 5 a 3
    const baseReconnectDelay = 2000; // 2 segundos base
    let isConnected = false;
    let printerData = new Map(); // Cache de datos de impresoras
    let reconnectTimeout = null;
    let pingInterval = null;
    let connectionAttemptTime = null;

    // Configuración WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ws/fleet`;

    function connectWebSocket() {
        // Evitar múltiples intentos de conexión simultáneos
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
            return;
        }

        console.log(`Intento de conexión ${reconnectAttempts + 1}/${maxReconnectAttempts + 1}`);
        updateConnectionStatus(false, 'Conectando...');
        connectionAttemptTime = Date.now();
        
        try {
            ws = new WebSocket(wsUrl);
            
            // Timeout para conexión más agresivo
            const connectionTimeout = setTimeout(() => {
                if (ws && ws.readyState === WebSocket.CONNECTING) {
                    console.warn('⏰ Timeout de conexión WebSocket');
                    ws.close();
                }
            }, 5000); // Reducido a 5 segundos
            
            ws.onopen = function(event) {
                clearTimeout(connectionTimeout);
                const connectionTime = Date.now() - connectionAttemptTime;
                console.log(`✅ Conexión WebSocket establecida en ${connectionTime}ms`);
                isConnected = true;
                reconnectAttempts = 0;
                updateConnectionStatus(true, 'Conectado en tiempo real');
                
                // Configurar ping periódico para mantener la conexión viva
                startPingInterval();
                
                // Suscribirse a todas las impresoras
                sendMessage({
                    type: 'subscribe_all'
                });
            };
            
            ws.onmessage = function(event) {
                try {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Error parseando mensaje WebSocket:', error);
                }
            };
            
            ws.onclose = function(event) {
                clearTimeout(connectionTimeout);
                stopPingInterval();
                console.log(`❌ Conexión WebSocket cerrada: ${event.code} - ${event.reason}`);
                isConnected = false;
                updateConnectionStatus(false, 'Desconectado');
                
                // Solo reconectar si no fue un cierre intencional y no hemos excedido intentos
                if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
                    attemptReconnect();
                } else if (reconnectAttempts >= maxReconnectAttempts) {
                    updateConnectionStatus(false, 'Conexión fallida - Demasiados intentos');
                    console.warn('🔄 Máximo de intentos de reconexión alcanzado');
                }
            };
            
            ws.onerror = function(error) {
                clearTimeout(connectionTimeout);
                console.error('🔥 Error WebSocket:', error);
                updateConnectionStatus(false, 'Error de conexión');
            };
            
        } catch (error) {
            console.error('Error creando WebSocket:', error);
            updateConnectionStatus(false, 'Error de conexión');
            attemptReconnect();
        }
    }

    function startPingInterval() {
        // Enviar ping cada 30 segundos para mantener conexión viva
        stopPingInterval(); // Limpiar intervalo anterior si existe
        pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                sendMessage({ type: 'ping' });
            }
        }, 30000);
    }

    function stopPingInterval() {
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
        }
    }

    function attemptReconnect() {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }

        reconnectAttempts++;
        
        // Backoff exponencial: 2s, 4s, 8s, 16s...
        const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
        
        console.log(`🔄 Reintentando conexión en ${delay/1000}s (intento ${reconnectAttempts}/${maxReconnectAttempts})`);
        updateConnectionStatus(false, `Reintentando en ${delay/1000}s...`);
        
        reconnectTimeout = setTimeout(() => {
            if (reconnectAttempts <= maxReconnectAttempts) {
                connectWebSocket();
            }
        }, delay);
    }

    function sendMessage(message) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error enviando mensaje:', error);
            }
        } else {
            console.warn('WebSocket no está conectado, no se puede enviar mensaje:', message.type);
        }
    }

    function handleWebSocketMessage(message) {
        console.log('📨 Mensaje recibido:', message.type);
        
        switch (message.type) {
            case 'connection_established':
                console.log(`🎯 Cliente conectado: ${message.client_id}`);
                break;
                
            case 'printer_update':
                updateSinglePrinter(message.printer_id, message.data);
                break;
                
            case 'subscription_all_confirmed':
                console.log(`✅ Suscrito a ${message.printer_count} impresoras`);
                break;
                
            case 'pong':
                // Respuesta al ping, conexión está viva
                break;
                console.log(`📡 Suscrito a ${message.printer_count} impresoras`);
                break;
                
            case 'error':
                console.error('❌ Error del servidor:', message.message);
                break;
                
            default:
                console.log('📦 Mensaje no manejado:', message.type);
        }
    }

    function updateSinglePrinter(printerId, data) {
        // Actualizar cache local
        printerData.set(printerId, data);
        
        // Actualizar UI solo para esta impresora
        updatePrinterRow(data);
        
        // Actualizar timestamp
        updateLastUpdateTime();
    }

    function updatePrinterRow(printer) {
        const tbody = document.getElementById('fleet-printers');
        if (!tbody) return;

        // Buscar fila existente o crear nueva
        let row = document.querySelector(`tr[data-printer-id="${printer.id}"]`);
        
        if (!row) {
            // Crear nueva fila
            row = document.createElement('tr');
            row.setAttribute('data-printer-id', printer.id);
            tbody.appendChild(row);
        }

        // Extraer temperaturas
        const extruderTemp = printer.realtime_data?.extruder_temp ?? 'N/A';
        const extruderTarget = printer.realtime_data?.extruder_target ?? 'N/A';
        const bedTemp = printer.realtime_data?.bed_temp ?? 'N/A';
        const bedTarget = printer.realtime_data?.bed_target ?? 'N/A';

        // Formatear temperaturas con animación de cambio
        const extruderDisplay = formatTemperature(extruderTemp, extruderTarget);
        const bedDisplay = formatTemperature(bedTemp, bedTarget);

        // Actualizar contenido de la fila
        row.innerHTML = `
            <td class="px-4 py-2">${printer.name}</td>
            <td class="px-4 py-2">${printer.model}</td>
            <td class="px-4 py-2">${printer.ip}</td>
            <td class="px-4 py-2">
                <span class="status-badge status-${printer.status}">${printer.status}</span>
            </td>
            <td class="px-4 py-2 temperature-cell" data-temp-type="extruder">
                ${extruderDisplay}
            </td>
            <td class="px-4 py-2 temperature-cell" data-temp-type="bed">
                ${bedDisplay}
            </td>
            <td class="px-4 py-2">${printer.capabilities?.join(', ') || ''}</td>
            <td class="px-4 py-2">${printer.location || ''}</td>
            <td class="px-4 py-2">
                <button onclick="deletePrinter('${printer.id}')" class="text-red-600 hover:underline">
                    Eliminar
                </button>
            </td>
        `;

        // Agregar animación de actualización
        row.classList.add('updated');
        setTimeout(() => row.classList.remove('updated'), 300);
    }

    function formatTemperature(current, target) {
        const currentStr = typeof current === 'number' ? current.toFixed(1) : current;
        const targetStr = typeof target === 'number' ? target.toFixed(1) : target;
        
        // Determinar clase CSS basada en temperatura
        let tempClass = 'temp-normal';
        if (typeof current === 'number') {
            if (current > 200) {
                tempClass = 'temp-critical';
            } else if (current > 150) {
                tempClass = 'temp-warning';
            }
        }
        
        return `<span class="${tempClass}">${currentStr} / ${targetStr}</span>`;
    }

    function updateConnectionStatus(connected, message = '') {
        const statusElement = document.getElementById('connection-status');
        const indicatorElement = document.getElementById('connection-indicator');
        
        if (statusElement) {
            statusElement.textContent = message || (connected ? 'Conectado en tiempo real' : 'Desconectado');
            statusElement.className = connected ? 'text-green-600' : 'text-red-600';
        }
        
        if (indicatorElement) {
            indicatorElement.className = connected 
                ? 'ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse'
                : 'ml-2 inline-block w-2 h-2 bg-red-500 rounded-full';
        }
    }

    function updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            const now = new Date();
            lastUpdateElement.textContent = `Última actualización: ${now.toLocaleTimeString()}`;
        }
    }

    function attemptReconnect() {
        if (reconnectAttempts >= maxReconnectAttempts) {
            console.error('❌ Máximo de intentos de reconexión alcanzado');
            updateConnectionStatus(false, 'Conexión perdida');
            return;
        }

        reconnectAttempts++;
        const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1); // Backoff exponencial
        
        console.log(`🔄 Reintentando conexión en ${delay}ms (intento ${reconnectAttempts}/${maxReconnectAttempts})`);
        updateConnectionStatus(false, `Reconectando... (${reconnectAttempts}/${maxReconnectAttempts})`);
        
        setTimeout(() => {
            connectWebSocket();
        }, delay);
    }

    // Función para limpiar conexiones al cambiar de módulo
    window.stopFleetUpdates = function() {
        console.log('🛑 Deteniendo actualizaciones de flota');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Módulo cambiado'); // Cierre normal
        }
        ws = null;
        isConnected = false;
        reconnectAttempts = 0;
    };

    // Limpiar al cerrar la página o recargar
    window.addEventListener('beforeunload', function() {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Página cerrada');
        }
    });

    // Limpiar al cambiar de pestaña (pausa/resume)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Página oculta, pausar reconexiones
            if (ws && ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        } else {
            // Página visible, reconectar si es necesario
            if (!isConnected && ws && ws.readyState === WebSocket.CLOSED) {
                setTimeout(connectWebSocket, 1000);
            }
        }
    });

    // Funciones existentes para manejo de formularios
    window.deletePrinter = async function(id) {
        try {
            const response = await fetch(`/api/fleet/printers/${id}`, { method: 'DELETE' });
            if (response.ok) {
                // Remover de cache local
                printerData.delete(id);
                // Remover fila de la tabla
                const row = document.querySelector(`tr[data-printer-id="${id}"]`);
                if (row) {
                    row.remove();
                }
                console.log(`✅ Impresora ${id} eliminada`);
            } else {
                console.error('❌ Error al eliminar impresora');
            }
        } catch (error) {
            console.error('❌ Error de red al eliminar impresora:', error);
        }
    };

    // Configurar formulario de agregar impresora
    const form = document.getElementById('add-printer-form');
    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const capabilitiesValue = document.getElementById('printer-capabilities').value;
            const data = {
                name: document.getElementById('printer-name').value,
                model: document.getElementById('printer-model').value,
                ip: document.getElementById('printer-ip').value,
                status: 'offline',
                capabilities: capabilitiesValue.split(',').map(item => item.trim()).filter(item => item),
                location: document.getElementById('printer-location').value
            };
            
            try {
                const response = await fetch('/api/fleet/printers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    alert('Impresora agregada con éxito');
                    e.target.reset();
                    // No necesitamos fetchPrinters(), WebSocket se encargará de la actualización
                } else {
                    const errorData = await response.json();
                    alert(`Error al agregar la impresora: ${errorData.detail}`);
                }
            } catch (error) {
                console.error('Error en la solicitud:', error);
                alert('Ocurrió un error de red. Por favor, inténtalo de nuevo.');
            }
        });
    }

    // Inicializar conexión WebSocket
    console.log('🚀 Iniciando módulo Fleet con WebSockets');
    connectWebSocket();

    // Limpiar tabla inicial
    const tbody = document.getElementById('fleet-printers');
    if (tbody) {
        tbody.innerHTML = '<tr data-connecting><td colspan="9" class="text-center py-4">Conectando...</td></tr>';
    }

    // Limpiar conexiones al cerrar ventana/pestaña
    window.addEventListener('beforeunload', function() {
        if (ws) {
            ws.close(1000, 'Ventana cerrada');
        }
    });

    // Heartbeat para mantener conexión viva
    setInterval(() => {
        if (isConnected) {
            sendMessage({ type: 'ping' });
        }
    }, 30000); // Ping cada 30 segundos
};
