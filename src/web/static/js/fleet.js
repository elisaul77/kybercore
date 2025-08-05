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
        updateStatus('Datos de prueba cargados');
        
        setTimeout(() => {
            loadRealData();
        }, 3000);
    }
    
    // Función para cargar datos reales
    async function loadRealData() {
        try {
            console.log('Cargando datos reales...');
            updateStatus('Cargando datos reales...');
            
            const response = await fetch('/api/fleet/printers');
            if (response.ok) {
                const printers = await response.json();
                console.log('Impresoras recibidas:', printers.length);
                
                const tbody = document.getElementById('fleet-printers');
                if (tbody) {
                    tbody.innerHTML = '';
                    
                    printers.forEach(printer => {
                        const row = document.createElement('tr');
                        row.setAttribute('data-printer-id', printer.id);
                        
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
                        tbody.appendChild(row);
                    });
                    
                    updateStatus('Datos reales cargados');
                    setTimeout(connectWebSocket, 2000);
                }
            } else {
                console.error('Error en respuesta:', response.status);
                updateStatus('Error cargando datos');
            }
        } catch (error) {
            console.error('Error de red:', error);
            updateStatus('Error de conexión');
        }
    }
    
    // Función para actualizar estado
    function updateStatus(message) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log('Estado:', message);
    }
    
    // Función WebSocket simplificada
    function connectWebSocket() {
        try {
            const wsUrl = `ws://${window.location.host}/api/ws/fleet`;
            console.log('Conectando WebSocket:', wsUrl);
            updateStatus('Conectando WebSocket...');
            
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('WebSocket conectado');
                updateStatus('Conectado en tiempo real');
            };
            
            ws.onclose = () => {
                console.log('WebSocket cerrado');
                updateStatus('Desconectado');
            };
            
            ws.onerror = (error) => {
                console.error('Error WebSocket:', error);
                updateStatus('Error WebSocket');
            };
            
        } catch (error) {
            console.error('Error creando WebSocket:', error);
            updateStatus('Error WebSocket');
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
    
    // Función pública para detener
    window.stopFleetUpdates = function() {
        console.log('Deteniendo actualizaciones');
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
    
    // INICIALIZACIÓN
    console.log('Iniciando Fleet...');
    
    const tbody = document.getElementById('fleet-printers');
    console.log('tbody disponible:', !!tbody);
    
    if (!tbody) {
        console.error('ERROR: No se encontró tbody');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">Iniciando...</td></tr>';
    updateStatus('Iniciando...');
    
    setTimeout(loadTestData, 500);
};
