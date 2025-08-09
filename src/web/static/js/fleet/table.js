// Módulo de gestión de tabla para la flota
window.FleetTable = (function() {
    
    // Función para crear barra de progreso
    function createProgressBar(percentage, status, printState) {
        // Mostrar barra de progreso si está imprimiendo o pausado
        if (printState === 'printing' || printState === 'paused' || (percentage && percentage > 0)) {
            const progress = Math.round(percentage || 0);
            const barColor = printState === 'paused' ? 'bg-yellow-500' : 'bg-blue-600';
            const statusText = printState === 'paused' ? `${progress}% (Pausado)` : `${progress}%`;
            
            return `
                <div class="w-full bg-gray-200 rounded-full h-4 relative">
                    <div class="${barColor} h-4 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                    <span class="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">${statusText}</span>
                </div>
            `;
        } else if (status === 'ready') {
            return '<span class="text-sm text-gray-500">Listo</span>';
        } else if (status === 'error') {
            return '<span class="text-sm text-red-500">Error</span>';
        } else {
            return '<span class="text-sm text-gray-400">-</span>';
        }
    }
    
    // Función para crear HTML de una fila de impresora
    function createPrinterRow(printer) {
        const extTemp = printer.realtime_data?.extruder_temp || 'N/A';
        const extTarget = printer.realtime_data?.extruder_target || 'N/A';
        const bedTemp = printer.realtime_data?.bed_temp || 'N/A';
        const bedTarget = printer.realtime_data?.bed_target || 'N/A';
        const progress = printer.realtime_data?.print_progress || 0;
        const printState = printer.realtime_data?.print_state || 'unknown';
        
        return `
            <td class="px-4 py-2">
                <input type="checkbox" class="printer-checkbox rounded" data-printer-id="${printer.id}" data-printer-name="${printer.name}">
            </td>
            <td class="px-4 py-2">${printer.name}</td>
            <td class="px-4 py-2">${printer.model}</td>
            <td class="px-4 py-2">${printer.ip}</td>
            <td class="px-4 py-2">
                <span class="status-badge status-${printer.status}">${printer.status}</span>
            </td>
            <td class="px-4 py-2 w-32">
                ${createProgressBar(progress, printer.status, printState)}
            </td>
            <td class="px-4 py-2">${extTemp}°C / ${extTarget}°C</td>
            <td class="px-4 py-2">${bedTemp}°C / ${bedTarget}°C</td>
            <td class="px-4 py-2">${(printer.capabilities || []).join(', ')}</td>
            <td class="px-4 py-2">${printer.location || ''}</td>
            <td class="px-4 py-2">
                <div class="flex flex-wrap gap-1">
                    <button onclick="window.FleetCommands.homePrinter('${printer.id}', 'X', event)" 
                            class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600" 
                            title="Homing X">
                        🏠X
                    </button>
                    <button onclick="window.FleetCommands.homePrinter('${printer.id}', 'Y', event)" 
                            class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600" 
                            title="Homing Y">
                        🏠Y
                    </button>
                    <button onclick="window.FleetCommands.homePrinter('${printer.id}', 'Z', event)" 
                            class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600" 
                            title="Homing Z">
                        🏠Z
                    </button>
                    <button onclick="window.FleetCommands.pausePrinter('${printer.id}', event)" 
                            class="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600" 
                            title="Pausar">
                        ⏸️
                    </button>
                    <button onclick="window.FleetCommands.resumePrinter('${printer.id}', event)" 
                            class="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600" 
                            title="Reanudar">
                        ▶️
                    </button>
                    <button onclick="window.FleetCommands.cancelPrinter('${printer.id}', event)" 
                            class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600" 
                            title="Cancelar">
                        ❌
                    </button>
                    <button onclick="window.FleetCommands.restartKlipper('${printer.id}', event)" 
                            class="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600" 
                            title="Host Restart - Reinicia el proceso Klipper">
                        🔄H
                    </button>
                    <button onclick="window.FleetCommands.restartFirmware('${printer.id}', event)" 
                            class="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600" 
                            title="Firmware Restart - Reinicia el firmware/MCU">
                        🔧F
                    </button>
                    <button onclick="window.FleetCommands.deletePrinter('${printer.id}')" 
                            class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700" 
                            title="Eliminar">
                        🗑️
                    </button>
                </div>
            </td>
        `;
    }
    
    // Función mejorada para poblar tabla (reutilizable)
    function populateFleetTable(printers) {
        const tbody = document.getElementById('fleet-printers');
        if (!tbody) return;
        
        // Limpiar y poblar tabla
        tbody.innerHTML = '';
        
        printers.forEach(printer => {
            const row = document.createElement('tr');
            row.setAttribute('data-printer-id', printer.id);
            tbody.appendChild(row);
            
            row.innerHTML = createPrinterRow(printer);
            
            // Efecto visual sutil
            row.classList.add('bg-blue-50');
            setTimeout(() => row.classList.remove('bg-blue-50'), 500);
        });
        
        // Configurar evento para el checkbox "Seleccionar todo"
        setupTableCheckboxEvents();
        
        // Actualizar estados después de poblar la tabla
        const isAnyPrinterConnected = printers.some(printer => printer.status !== 'unreachable');
        const state = window.FleetState;
        state.setFleetState({
            isConnected: isAnyPrinterConnected,
            printerCount: printers.length,
            hasError: false
        });
        window.FleetUI.syncConnectionStatus();
    }
    
    // Función para configurar eventos de checkboxes
    function setupTableCheckboxEvents() {
        const selectAllCheckbox = document.getElementById('select-all-table');
        const printerCheckboxes = document.querySelectorAll('.printer-checkbox');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                printerCheckboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                });
            });
        }
        
        // Configurar eventos individuales para sincronizar con el "seleccionar todo"
        printerCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const allChecked = Array.from(printerCheckboxes).every(cb => cb.checked);
                const noneChecked = Array.from(printerCheckboxes).every(cb => !cb.checked);
                
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = allChecked;
                    selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
                }
            });
        });
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
            
            row.innerHTML = createPrinterRow(printerData);
            
            // Reconfigurar eventos de checkboxes después de actualizar
            setupTableCheckboxEvents();
            
            // Efecto visual de actualización más sutil
            row.classList.add('bg-green-50');
            setTimeout(() => {
                row.classList.remove('bg-green-50');
            }, 800);
            
            console.log(`✅ Impresora ${printerData.name} actualizada vía WebSocket`);
            
            // Actualizar estado global de la flota después de cambio individual
            const tbodyElement = document.getElementById('fleet-printers');
            const allRows = tbodyElement.querySelectorAll('tr[data-printer-id]');
            let connectedCount = 0;
            allRows.forEach(row => {
                const statusSpan = row.querySelector('.status-badge');
                if (statusSpan && !statusSpan.textContent.includes('unreachable')) {
                    connectedCount++;
                }
            });
            
            const state = window.FleetState;
            state.setFleetState({
                isConnected: connectedCount > 0,
                printerCount: allRows.length,
                hasError: false
            });
            window.FleetUI.syncConnectionStatus();
            
        } catch (error) {
            console.error('❌ Error actualizando impresora individual:', error);
        }
    }
    
    // Función para renderizar impresoras (llamada desde loadRealData)
    function renderPrinters(printers) {
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
                
                row.innerHTML = createPrinterRow(printer);
                
                // Efecto visual de actualización suave
                row.classList.add('bg-blue-50');
                setTimeout(() => {
                    row.classList.remove('bg-blue-50');
                }, 500);
            });
            
            // Configurar eventos de checkboxes después de renderizar
            setupTableCheckboxEvents();
        }
    }
    
    return {
        createProgressBar,
        createPrinterRow,
        populateFleetTable,
        updateSinglePrinter,
        renderPrinters,
        setupTableCheckboxEvents
    };
})();
