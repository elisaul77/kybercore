// Gestión de flota para KyberCore SPA con WebSockets en tiempo real
window.initFleetModule = function() {
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 1000; // 1 segundo base
    let isConnected = false;
    let printerData = new Map(); // Cache de datos de impresoras

    // Configuración WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ws/fleet`;

    function connectWebSocket() {
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
            return; // Ya hay una conexión activa
        }

        console.log('Intentando conectar WebSocket...');
        updateConnectionStatus(false, 'Conectando...');
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = function(event) {
            console.log('✅ Conexión WebSocket establecida');
            isConnected = true;
            reconnectAttempts = 0;
            updateConnectionStatus(true, 'Conectado en tiempo real');
            
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
            console.log('❌ Conexión WebSocket cerrada');
            isConnected = false;
            updateConnectionStatus(false, 'Desconectado');
            
            if (event.code !== 1000) { // No fue cierre normal
                attemptReconnect();
            }
        };
        
        ws.onerror = function(error) {
            console.error('🔥 Error WebSocket:', error);
            updateConnectionStatus(false, 'Error de conexión');
        };
    }

    function sendMessage(message) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket no está conectado, no se puede enviar mensaje');
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
        if (ws) {
            ws.close(1000, 'Módulo cambiado'); // Cierre normal
            ws = null;
        }
        isConnected = false;
    };

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
