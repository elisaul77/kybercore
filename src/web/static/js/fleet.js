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
    
    // Activar sistema de comunicación optimizado directamente (sin datos de prueba)
    setTimeout(() => {
        window.FleetCommunication.startOptimizedCommunication();
    }, 500);
    
    // Inicializar comandos masivos
    window.FleetBulkCommands.init();
    
    // Agregar event listener para el botón de actualización forzada
    const forceUpdateBtn = document.getElementById('force-update-btn');
    if (forceUpdateBtn) {
        forceUpdateBtn.addEventListener('click', () => {
            console.log('🔄 Actualización forzada solicitada por el usuario');
            window.FleetCommunication.forceUpdate();
        });
    }
};

// 🚀 MÓDULO DE DATOS DE FLOTA
window.FleetData = {
    printers: [],
    
    loadTestData() {
        console.log('📊 Cargando datos de prueba...');
        this.printers = [
            {
                id: "printer-test-1",
                name: "Impresora Prueba",
                model: "Generic",
                ip_address: "192.168.1.100",
                status: "idle",
                progress: 0,
                hotend_temp: 25,
                bed_temp: 23,
                capabilities: "PLA, ABS",
                location: "Laboratorio"
            }
        ];
        // NUEVO: render inmediato y refresco de selección
        if (window.FleetUI && window.FleetUI.renderPrinters) {
            window.FleetUI.renderPrinters(this.printers);
        }
        if (window.FleetBulkCommands && window.FleetBulkCommands.refreshPrinterSelection) {
            window.FleetBulkCommands.refreshPrinterSelection();
        }
    },
    
    getPrinters() {
        return this.printers || [];
    },
    
    addPrinter(printer) {
        if (!this.printers) this.printers = [];
        this.printers.push(printer);
        // Notificar cambios
        if (window.FleetUI && window.FleetUI.renderPrinters) {
            window.FleetUI.renderPrinters(this.printers);
        }
        if (window.FleetBulkCommands && window.FleetBulkCommands.refreshPrinterSelection) {
            window.FleetBulkCommands.refreshPrinterSelection();
        }
    },
    
    updatePrinter(printerId, updates) {
        const index = this.printers.findIndex(p => p.id === printerId);
        if (index !== -1) {
            // Fusionar cambios para no perder datos
            this.printers[index] = { ...this.printers[index], ...updates };
            
            // Notificar a la UI para que actualice la fila específica
            if (window.FleetUI && window.FleetUI.updatePrinterRow) {
                window.FleetUI.updatePrinterRow(this.printers[index]);
            }
        }
    },
    
    removePrinter(printerId) {
        this.printers = this.printers.filter(p => p.id !== printerId);
        // Notificar a la UI para que re-renderice la tabla completa
        if (window.FleetUI && window.FleetUI.renderPrinters) {
            window.FleetUI.renderPrinters(this.printers);
        }
        if (window.FleetBulkCommands && window.FleetBulkCommands.refreshPrinterSelection) {
            window.FleetBulkCommands.refreshPrinterSelection();
        }
    },
    
    setPrinters(newPrinters) {
        this.printers = newPrinters || [];
        // Notificar a la UI para que re-renderice la tabla completa
        if (window.FleetUI && window.FleetUI.renderPrinters) {
            window.FleetUI.renderPrinters(this.printers);
        }
        if (window.FleetBulkCommands && window.FleetBulkCommands.refreshPrinterSelection) {
            window.FleetBulkCommands.refreshPrinterSelection();
        }
    }
};

// 🚀 MÓDULO DE INTERFAZ DE USUARIO
window.FleetUI = {
    updateStatus(message, type = 'info') {
        console.log('Estado: ' + message);
        
        // Actualizar elementos de estado si existen
        const statusElement = document.getElementById('connection-status');
        const lastUpdateElement = document.getElementById('last-update');
        
        if (statusElement) {
            statusElement.textContent = message;
        }
        
        if (lastUpdateElement && type === 'ok') {
            lastUpdateElement.textContent = `Última actualización: ${new Date().toLocaleTimeString()}`;
        }
    },
    
    // Renderiza la tabla completa
    renderPrinters(printers) {
        const tbody = document.getElementById('fleet-printers');
        if (!tbody) return;
        
        if (!printers || printers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center text-gray-500 py-4">No hay impresoras conectadas</td></tr>';
            return;
        }
        
        tbody.innerHTML = printers.map(p => this.getPrinterRowHtml(p)).join('');
    },

    // Actualiza una única fila de la tabla para evitar re-renderizar todo
    updatePrinterRow(printer) {
        const row = document.getElementById(`printer-row-${printer.id}`);
        if (row) {
            // Re-renderizar solo la fila que cambió
            row.innerHTML = this.getPrinterRowHtml(printer, true);
        } else {
            // Si la fila no existe, podría ser una nueva impresora, re-renderizar todo
            this.renderPrinters(window.FleetData.getPrinters());
        }
    },

    // Genera el HTML para una fila de impresora
    getPrinterRowHtml(p, inner = false) {
        const statusClass = p.status === 'printing' ? 'bg-green-100 text-green-800' : 
                           p.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                           p.status === 'idle' ? 'bg-gray-100 text-gray-800' : 
                           p.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                           p.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
        
        const progressBar = (p.status === 'printing' || p.status === 'paused') && p.progress > 0 ? 
            `<div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${p.progress}%"></div>
            </div>
            <span class="text-xs font-medium">${p.progress}%</span>` : 
            '<span class="text-gray-400">-</span>';
            
        const rowContent = `
            <td class="px-4 py-2">
                <input type="checkbox" class="printer-checkbox rounded" value="${p.id}">
            </td>
            <td class="px-4 py-2 font-medium">${p.name}</td>
            <td class="px-4 py-2">${p.model || '-'}</td>
            <td class="px-4 py-2">${p.ip_address || '-'}</td>
            <td class="px-4 py-2">
                <span class="px-2 py-1 rounded-full text-xs font-semibold ${statusClass}">${p.status}</span>
            </td>
            <td class="px-4 py-2">
                <div class="flex flex-col gap-1 items-center">
                    ${progressBar}
                </div>
            </td>
            <td class="px-4 py-2 font-mono text-center">${p.hotend_temp ? p.hotend_temp.toFixed(1) : '-'}</td>
            <td class="px-4 py-2 font-mono text-center">${p.bed_temp ? p.bed_temp.toFixed(1) : '-'}</td>
            <td class="px-4 py-2 text-xs">${p.capabilities || '-'}</td>
            <td class="px-4 py-2">${p.location || '-'}</td>
            <td class="px-4 py-2">
                <div class="flex gap-1">
                    <button onclick="window.FleetCommands.homePrinter('${p.id}')" 
                            class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" 
                            title="Home">🏠</button>
                    <button onclick="window.FleetCommands.pausePrinter('${p.id}')" 
                            class="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600" 
                            title="Pausar">⏸</button>
                    <button onclick="window.FleetCommands.resumePrinter('${p.id}')" 
                            class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" 
                            title="Reanudar">▶</button>
                    <button onclick="window.FleetCommands.cancelPrinter('${p.id}')" 
                            class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" 
                            title="Cancelar">❌</button>
                </div>
            </td>
        `;

        return inner ? rowContent : `<tr id="printer-row-${p.id}" class="border-b hover:bg-gray-50 transition-colors duration-200">${rowContent}</tr>`;
    }
};

// 🚀 MÓDULO DE FORMULARIOS
window.FleetForms = {
    initAddPrinterForm() {
        console.log('📝 Inicializando formularios de flota...');
        // Inicialización de formularios
    }
};

// 🚀 MÓDULO DE COMUNICACIÓN
window.FleetCommunication = {
    websocket: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectInterval: 3000,
    pingInterval: null,
    isConnected: false,

    async startOptimizedCommunication() {
        console.log('🚀 Iniciando comunicación optimizada...');
        window.FleetUI.updateStatus('Conectando...', 'loading');
        
        try {
            // Cargar impresoras reales del backend
            const response = await fetch('/api/fleet/printers');
            if (response.ok) {
                const printers = await response.json();
                console.log('📡 Impresoras cargadas del backend:', printers);
                
                // Convertir datos del backend al formato esperado por el frontend
                const formattedPrinters = printers.map(p => ({
                    id: p.id,
                    name: p.name,
                    model: p.model,
                    ip_address: p.ip,
                    status: p.status,
                    progress: p.realtime_data?.print_progress || 0,
                    hotend_temp: p.realtime_data?.extruder_temp || 0,
                    bed_temp: p.realtime_data?.bed_temp || 0,
                    capabilities: Array.isArray(p.capabilities) ? p.capabilities.join(', ') : (p.capabilities || '-'),
                    location: p.location || '-'
                }));
                
                window.FleetData.setPrinters(formattedPrinters);
                window.FleetUI.updateStatus(`${formattedPrinters.length} impresora(s) conectada(s)`, 'ok');
                
                // Iniciar conexión WebSocket para actualizaciones en tiempo real
                this.connectWebSocket();
                
            } else {
                console.error('❌ Error al cargar impresoras:', response.statusText);
                window.FleetUI.updateStatus('Error al cargar impresoras', 'error');
                this.updateConnectionStatus('Error de conexión', 'error');
            }
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            window.FleetUI.updateStatus('Error de conexión', 'error');
            this.updateConnectionStatus('Sin conexión', 'error');
            
            // Como fallback, cargar datos de prueba
            this.loadFallbackData();
        }
    },

    connectWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/ws/fleet`;
            
            console.log('🔌 Conectando WebSocket:', wsUrl);
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = (event) => {
                console.log('✅ WebSocket conectado');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus('Conectado (Tiempo Real)', 'success');
                
                // Iniciar ping periódico
                this.startPing();
                
                // Suscribirse a todas las impresoras para recibir actualizaciones
                this.websocket.send(JSON.stringify({
                    type: 'subscribe_all'
                }));
                
                // Solicitar datos iniciales
                this.websocket.send(JSON.stringify({
                    type: 'get_initial_data'
                }));
            };
            
            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('❌ Error parseando mensaje WebSocket:', error);
                }
            };
            
            this.websocket.onclose = (event) => {
                console.log('🔌 WebSocket desconectado:', event.code, event.reason);
                this.isConnected = false;
                this.stopPing();
                
                if (event.code !== 1000) { // No fue un cierre normal
                    this.updateConnectionStatus('Reconectando...', 'warning');
                    this.scheduleReconnect();
                } else {
                    this.updateConnectionStatus('Desconectado', 'error');
                }
            };
            
            this.websocket.onerror = (error) => {
                console.error('❌ Error WebSocket:', error);
                this.updateConnectionStatus('Error de conexión', 'error');
            };
            
        } catch (error) {
            console.error('❌ Error creando WebSocket:', error);
            this.updateConnectionStatus('Error WebSocket', 'error');
        }
    },

    handleWebSocketMessage(data) {
        console.log('📨 Mensaje WebSocket recibido:', data);
        
        switch (data.type) {
            case 'fleet_update':
                this.handleFleetUpdate(data.payload);
                break;
            case 'printer_update':
                // Corregir el formato del mensaje: el backend envía 'data' no 'payload'
                const printerData = data.data || data.payload;
                if (printerData && data.printer_id) {
                    this.handlePrinterUpdate({
                        printer_id: data.printer_id,
                        ...printerData.realtime_data,
                        status: printerData.status
                    });
                }
                break;
            case 'initial_data':
                // Datos iniciales de todas las impresoras
                if (data.printers) {
                    console.log('📊 Datos iniciales recibidos via WebSocket:', data.printers);
                    this.handleFleetUpdate({ printers: data.printers });
                }
                break;
            case 'subscription_all_confirmed':
                console.log(`✅ Suscripción confirmada para ${data.printer_count} impresoras`);
                this.updateConnectionStatus(`Suscrito a ${data.printer_count} impresoras`, 'success');
                break;
            case 'subscription_confirmed':
                console.log(`✅ Suscripción confirmada para impresora: ${data.printer_id}`);
                break;
            case 'connection_established':
                console.log('🤝 Conexión WebSocket establecida:', data.client_id);
                break;
            case 'ping':
                // Responder al ping del servidor
                this.websocket.send(JSON.stringify({ type: 'pong' }));
                break;
            case 'pong':
                // Pong recibido del servidor, conexión está viva
                console.log('🏓 Pong recibido del servidor');
                break;
            case 'error':
                console.error('❌ Error del servidor WebSocket:', data.message);
                break;
            case 'info':
                console.log('ℹ️ Info del servidor:', data.message);
                break;
            default:
                console.log('📦 Mensaje WebSocket no manejado:', data);
        }
    },

    handleFleetUpdate(payload) {
        // Actualizar todas las impresoras
        if (payload.printers) {
            const formattedPrinters = payload.printers.map(p => ({
                id: p.id,
                name: p.name,
                model: p.model,
                ip_address: p.ip,
                status: p.status,
                progress: p.realtime_data?.print_progress || 0,
                hotend_temp: Math.round(p.realtime_data?.extruder_temp || 0),
                bed_temp: Math.round(p.realtime_data?.bed_temp || 0),
                capabilities: Array.isArray(p.capabilities) ? p.capabilities.join(', ') : (p.capabilities || '-'),
                location: p.location || '-'
            }));
            
            window.FleetData.setPrinters(formattedPrinters);
            this.updateConnectionStatus(`${formattedPrinters.length} impresora(s) - Datos actualizados`, 'success');
        }
    },

    handlePrinterUpdate(payload) {
        // Actualizar una impresora específica
        const updates = {
            status: payload.status,
            progress: payload.print_progress || 0,
            hotend_temp: Math.round(payload.extruder_temp || 0),
            bed_temp: Math.round(payload.bed_temp || 0)
        };
        
        window.FleetData.updatePrinter(payload.printer_id, updates);
        console.log(`🔄 Impresora ${payload.printer_id} actualizada via WebSocket:`, updates);
        
        // Actualizar estado de conexión con información de última actualización
        this.updateConnectionStatus(`Tiempo Real - Último: ${new Date().toLocaleTimeString()}`, 'success');
    },

    startPing() {
        this.pingInterval = setInterval(() => {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000); // Ping cada 30 segundos
    },

    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    },

    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connectWebSocket();
            }, this.reconnectInterval);
        } else {
            console.error('❌ Máximo de intentos de reconexión alcanzado');
            this.updateConnectionStatus('Sin conexión', 'error');
        }
    },
    
    loadFallbackData() {
        console.log('📊 Cargando datos de prueba como fallback...');
        const testData = [
            {
                id: "printer-test-1",
                name: "Impresora Prueba",
                model: "Generic",
                ip_address: "192.168.1.100",
                status: "idle",
                progress: 0,
                hotend_temp: 25,
                bed_temp: 23,
                capabilities: "PLA, ABS",
                location: "Laboratorio"
            }
        ];
        window.FleetData.setPrinters(testData);
        window.FleetUI.updateStatus('1 impresora de prueba cargada', 'warning');
        this.updateConnectionStatus('Modo sin conexión', 'warning');
    },
    
    updateConnectionStatus(message, type) {
        const statusElement = document.getElementById('connection-status');
        const indicatorElement = document.getElementById('connection-indicator');
        const lastUpdateElement = document.getElementById('last-update');
        
        if (statusElement) {
            statusElement.textContent = message;
        }
        
        if (indicatorElement) {
            indicatorElement.className = 'ml-2 inline-block w-2 h-2 rounded-full';
            switch (type) {
                case 'success':
                    indicatorElement.classList.add('bg-green-500');
                    break;
                case 'error':
                    indicatorElement.classList.add('bg-red-500');
                    break;
                case 'warning':
                    indicatorElement.classList.add('bg-yellow-500');
                    break;
                default:
                    indicatorElement.classList.add('bg-gray-500');
            }
        }
        
        if (lastUpdateElement) {
            lastUpdateElement.textContent = `Última actualización: ${new Date().toLocaleTimeString()}`;
        }
    },
    
    stopOptimizedCommunication() {
        console.log('🛑 Deteniendo comunicación...');
        this.stopPing();
        
        if (this.websocket) {
            this.websocket.close(1000, 'Cierre normal');
            this.websocket = null;
        }
        
        this.isConnected = false;
        this.reconnectAttempts = 0;
    },
    
    forceUpdate() {
        console.log('🔄 Forzando actualización...');
        
        // Si tenemos WebSocket, solicitar datos actualizados
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'get_initial_data'
            }));
        } else {
            // Fallback: recargar desde HTTP
            this.startOptimizedCommunication();
        }
    }
};

// 🚀 MÓDULO DE COMANDOS
window.FleetCommands = {
    async deletePrinter(printerId) {
        console.log('🗑️ Eliminar impresora:', printerId);
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                window.FleetData.removePrinter(printerId);
                console.log('✅ Impresora eliminada exitosamente');
            } else {
                console.error('❌ Error al eliminar impresora:', response.statusText);
            }
        } catch (error) {
            console.error('❌ Error de conexión al eliminar impresora:', error);
        }
    },
    
    async homePrinter(printerId) {
        console.log('🏠 Home impresora:', printerId);
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: 'home',
                    axis: 'XYZ'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Comando home ejecutado:', result);
                // Actualizar estado de la impresora si es necesario
                this._updatePrinterStatus(printerId, 'homing');
            } else {
                console.error('❌ Error al ejecutar home:', response.statusText);
            }
        } catch (error) {
            console.error('❌ Error de conexión en comando home:', error);
        }
    },
    
    async pausePrinter(printerId) {
        console.log('⏸️ Pausar impresora:', printerId);
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: 'pause'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Comando pause ejecutado:', result);
                this._updatePrinterStatus(printerId, 'paused');
            } else {
                console.error('❌ Error al pausar impresora:', response.statusText);
            }
        } catch (error) {
            console.error('❌ Error de conexión en comando pause:', error);
        }
    },
    
    async resumePrinter(printerId) {
        console.log('▶️ Reanudar impresora:', printerId);
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: 'resume'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Comando resume ejecutado:', result);
                this._updatePrinterStatus(printerId, 'printing');
            } else {
                console.error('❌ Error al reanudar impresora:', response.statusText);
            }
        } catch (error) {
            console.error('❌ Error de conexión en comando resume:', error);
        }
    },
    
    async cancelPrinter(printerId) {
        console.log('❌ Cancelar impresora:', printerId);
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: 'cancel'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Comando cancel ejecutado:', result);
                this._updatePrinterStatus(printerId, 'idle');
            } else {
                console.error('❌ Error al cancelar impresora:', response.statusText);
            }
        } catch (error) {
            console.error('❌ Error de conexión en comando cancel:', error);
        }
    },
    
    _updatePrinterStatus(printerId, newStatus) {
        window.FleetData.updatePrinter(printerId, { status: newStatus });
    }
};

// 🚀 NUEVO MÓDULO: Comandos Masivos para Fleet
window.FleetBulkCommands = {
    selectedPrinters: new Set(),
    
    init() {
        console.log('�� Inicializando módulo de comandos masivos');
        this.initBulkCommandsUI();
        this.initPrinterSelection();
        this.initBulkCommandButtons();
        this.initModal();
    },
    
    initBulkCommandsUI() {
        // Toggle del panel de comandos masivos
        const toggleBtn = document.getElementById('toggle-bulk-commands');
        const panel = document.getElementById('bulk-commands-panel');
        const toggleText = document.getElementById('bulk-toggle-text');
        
        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = panel.classList.contains('hidden');
                if (isHidden) {
                    panel.classList.remove('hidden');
                    toggleText.textContent = 'Ocultar';
                    // Solo actualizar si ya hay impresoras cargadas
                    if (window.FleetData.getPrinters().length > 0) {
                        this.updatePrinterSelection();
                    }
                } else {
                    panel.classList.add('hidden');
                    toggleText.textContent = 'Mostrar';
                }
            });
        }
    },
    
    initPrinterSelection() {
        // Botones de selección rápida
        document.getElementById('select-all') && document.getElementById('select-all').addEventListener('click', () => {
            this.selectPrinters('all');
        });
        
        document.getElementById('select-idle') && document.getElementById('select-idle').addEventListener('click', () => {
            this.selectPrinters('idle');
        });
        
        document.getElementById('select-printing') && document.getElementById('select-printing').addEventListener('click', () => {
            this.selectPrinters('printing');
        });
        
        document.getElementById('select-error') && document.getElementById('select-error').addEventListener('click', () => {
            this.selectPrinters('error');
        });
        
        document.getElementById('clear-selection') && document.getElementById('clear-selection').addEventListener('click', () => {
            this.clearSelection();
        });
        
        // Checkbox maestro en la tabla
        document.getElementById('select-all-table') && document.getElementById('select-all-table').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectPrinters('all');
            } else {
                this.clearSelection();
            }
        });
    },
    
    initBulkCommandButtons() {
        document.querySelectorAll('.bulk-command-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.target.dataset.command;
                this.showBulkCommandModal(command);
            });
        });
    },
    
    initModal() {
        const modal = document.getElementById('bulk-command-modal');
        const cancelBtn = document.getElementById('cancel-bulk-command');
        const confirmBtn = document.getElementById('confirm-bulk-command');
        
        cancelBtn && cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        confirmBtn && confirmBtn.addEventListener('click', () => {
            this.executeBulkCommand();
        });
        
        // Cerrar modal al hacer click fuera
        modal && modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    },
    
    selectPrinters(filter) {
        const printers = window.FleetData.getPrinters();
        this.selectedPrinters.clear();
        
        printers.forEach(printer => {
            let shouldSelect = false;
            
            switch(filter) {
                case 'all':
                    shouldSelect = true;
                    break;
                case 'idle':
                    shouldSelect = printer.status === 'idle';
                    break;
                case 'printing':
                    shouldSelect = printer.status === 'printing';
                    break;
                case 'error':
                    shouldSelect = printer.status === 'error';
                    break;
            }
            
            if (shouldSelect) {
                this.selectedPrinters.add(printer.id);
            }
        });
        
        this.updateSelectionUI();
    },
    
    clearSelection() {
        this.selectedPrinters.clear();
        this.updateSelectionUI();
    },
    
    // Función pública para actualizar desde otros módulos
    refreshPrinterSelection() {
        this.updatePrinterSelection();
    },
    
    updatePrinterSelection() {
        const container = document.getElementById('printer-selection');
        if (!container) return;
        
        const printers = window.FleetData.getPrinters();
        
        container.innerHTML = printers.map(printer => 
            '<div class="flex items-center space-x-2">' +
                '<input type="checkbox" ' +
                       'id="printer-' + printer.id + '" ' +
                       'class="printer-checkbox rounded"' +
                       (this.selectedPrinters.has(printer.id) ? ' checked' : '') +
                       ' data-printer-id="' + printer.id + '">' +
                '<label for="printer-' + printer.id + '" class="text-sm cursor-pointer">' +
                    '<span class="font-medium">' + printer.name + '</span>' +
                    '<span class="text-xs text-gray-500 block">' + printer.status + '</span>' +
                '</label>' +
            '</div>'
        ).join('');
        
        // Añadir event listeners a los checkboxes
        container.querySelectorAll('.printer-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const printerId = e.target.dataset.printerId;
                if (e.target.checked) {
                    this.selectedPrinters.add(printerId);
                } else {
                    this.selectedPrinters.delete(printerId);
                }
                this.updateSelectionUI();
            });
        });
        
        this.updateSelectionUI();
    },
    
    updateSelectionUI() {
        const countElement = document.getElementById('selection-count');
        if (countElement) {
            countElement.textContent = this.selectedPrinters.size + ' impresoras seleccionadas';
        }
        
        // Actualizar checkboxes en el panel
        document.querySelectorAll('.printer-checkbox').forEach(checkbox => {
            const printerId = checkbox.dataset.printerId;
            checkbox.checked = this.selectedPrinters.has(printerId);
        });
        
        // Actualizar checkbox maestro en la tabla
        const masterCheckbox = document.getElementById('select-all-table');
        if (masterCheckbox) {
            const totalPrinters = window.FleetData.getPrinters().length;
            masterCheckbox.checked = this.selectedPrinters.size === totalPrinters && totalPrinters > 0;
            masterCheckbox.indeterminate = this.selectedPrinters.size > 0 && this.selectedPrinters.size < totalPrinters;
        }
    },
    
    showBulkCommandModal(command) {
        if (this.selectedPrinters.size === 0) {
            alert('Selecciona al menos una impresora');
            return;
        }
        
        const modal = document.getElementById('bulk-command-modal');
        const preview = document.getElementById('bulk-command-preview');
        
        if (modal && preview) {
            const commandNames = {
                'pause': '⏸ Pausar',
                'resume': '▶ Reanudar', 
                'cancel': '❌ Cancelar',
                'home': '🏠 Home'
            };
            
            preview.innerHTML = `
                <p><strong>Comando:</strong> ${commandNames[command] || command}</p>
                <p><strong>Impresoras:</strong> ${this.selectedPrinters.size}</p>
            `;
            
            const confirmBtn = document.getElementById('confirm-bulk-command');
            if (confirmBtn) {
                confirmBtn.dataset.command = command;
            }
            
            modal.classList.remove('hidden');
        }
    },
    
    async executeBulkCommand() {
        const modal = document.getElementById('bulk-command-modal');
        const confirmBtn = document.getElementById('confirm-bulk-command');
        const command = confirmBtn && confirmBtn.dataset.command;
        
        if (!command || this.selectedPrinters.size === 0) {
            return;
        }
        
        if (modal) {
            modal.classList.add('hidden');
        }
        
        console.log(`🚀 Ejecutando comando ${command} en ${this.selectedPrinters.size} impresoras`);
        
        // Mostrar área de resultados
        const resultsArea = document.getElementById('bulk-results');
        const resultsContent = document.getElementById('bulk-results-content');
        if (resultsArea && resultsContent) {
            resultsArea.classList.remove('hidden');
            resultsContent.innerHTML = `
                <div class="flex items-center gap-2 mb-2">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Ejecutando comando ${command} en ${this.selectedPrinters.size} impresoras...</span>
                </div>
            `;
        }
        
        try {
            const printerIds = Array.from(this.selectedPrinters);
            
            const response = await fetch('/api/fleet/bulk/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    printer_ids: printerIds,
                    command: command,
                    parameters: command === 'home' ? { axis: 'XYZ' } : {}
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Comando masivo ejecutado:', result);
                
                // Mostrar resultados detallados
                if (resultsContent) {
                    let successCount = 0;
                    let failureCount = 0;
                    
                    const resultsHtml = result.results.map(r => {
                        if (r.success) {
                            successCount++;
                            const duration = r.timestamp ? new Date(r.timestamp).getTime() - Date.now() : 'N/A';
                            return `<div class="flex items-center gap-2 text-green-600">
                                ✅ ${r.printer_name || r.printer_id}: ${r.result?.action || 'Comando ejecutado'}
                                <span class="text-xs text-gray-500">(${typeof duration === 'number' ? Math.abs(duration) + 'ms' : 'completado'})</span>
                            </div>`;
                        } else {
                            failureCount++;
                            return `<div class="flex items-center gap-2 text-red-600">
                                ❌ ${r.printer_name || r.printer_id}: ${r.result?.message || r.result?.error || 'Error desconocido'}
                            </div>`;
                        }
                    }).join('');
                    
                    resultsContent.innerHTML = `
                        <div class="mb-3 p-2 bg-gray-50 rounded">
                            <strong>Resumen:</strong> 
                            <span class="text-green-600">${result.successful || successCount} éxitos</span>, 
                            <span class="text-red-600">${result.failed || failureCount} fallos</span>
                        </div>
                        <div class="space-y-1">
                            ${resultsHtml}
                        </div>
                        <div class="mt-2 text-xs text-gray-500">
                            ${result.summary || `Total: ${result.total_printers} impresoras procesadas`}
                        </div>
                    `;
                }
                
                // Actualizar estado de las impresoras según el comando
                this._updatePrintersAfterBulkCommand(command, result.results);
                
            } else {
                console.error('❌ Error en comando masivo:', response.statusText);
                if (resultsContent) {
                    resultsContent.innerHTML = `
                        <div class="text-red-600">
                            ❌ Error del servidor: ${response.statusText}
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('❌ Error de conexión en comando masivo:', error);
            if (resultsContent) {
                resultsContent.innerHTML = `
                    <div class="text-red-600">
                        ❌ Error de conexión: ${error.message}
                    </div>
                `;
            }
        }
    },
    
    _updatePrintersAfterBulkCommand(command, results) {
        // Actualizar el estado de las impresoras según el resultado del comando
        results.forEach(result => {
            if (result.success) {
                let newStatus;
                switch (command) {
                    case 'pause':
                        newStatus = 'paused';
                        break;
                    case 'resume':
                        newStatus = 'printing';
                        break;
                    case 'cancel':
                        newStatus = 'idle';
                        break;
                    case 'home':
                        newStatus = 'idle'; // Después del home, vuelve a idle
                        break;
                    default:
                        newStatus = null;
                }
                
                if (newStatus) {
                    window.FleetData.updatePrinter(result.printer_id, { status: newStatus });
                }
            }
        });
    }
};
