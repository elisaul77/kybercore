// Módulo de comandos masivos para la gestión de flota
window.FleetBulkCommands = (function() {
    
    // Estado interno del módulo
    let selectedPrinters = new Set();
    let isInitialized = false;
    
    /**
     * Inicializa el módulo de comandos masivos
     */
    function init() {
        // Nota: el DOM de la vista puede recargarse parcialmente (re-render) y
        // los elementos con listeners pueden ser reemplazados. Por eso las
        // funciones de setup se diseñan para ser idempotentes y re-adjuntar
        // listeners solo si el elemento actual no tiene marcado el binding.

        console.log('🎛️ Inicializando (o re-validando) módulo de comandos masivos...');

        // Siempre (re)adjuntamos listeners dependientes del DOM para cubrir
        // casos donde la vista fue re-renderizada. La lógica interna del
        // módulo (selectedPrinters) sólo se inicializa la primera vez.
        setupTogglePanel();
        setupSelectionButtons();
        setupBulkCommandButtons();
        setupPrinterSelection();

        if (!isInitialized) {
            isInitialized = true;
            console.log('✅ Módulo de comandos masivos inicializado por primera vez');
        } else {
            console.log('🔁 Módulo de comandos masivos revalidado (listeners adjuntados si fue necesario)');
        }
    }
    
    /**
     * Configura el botón de mostrar/ocultar panel
     */
    function setupTogglePanel() {
        const toggleBtn = document.getElementById('toggle-bulk-commands');
        const panel = document.getElementById('bulk-commands-panel');
        const toggleText = document.getElementById('bulk-toggle-text');

        if (!toggleBtn || !panel || !toggleText) {
            console.log('ℹ️ Elementos del panel de comandos masivos no encontrados');
            return;
        }

        // Si el botón actual ya tiene el listener adjuntado, no lo volvemos a añadir.
        if (toggleBtn.dataset && toggleBtn.dataset.fleetBulkToggleBound) {
            // Ya tenía listener (posiblemente de una instancia anterior), no duplicar.
            return;
        }

        toggleBtn.addEventListener('click', () => {
            const isHidden = panel.classList.contains('hidden');

            if (isHidden) {
                panel.classList.remove('hidden');
                toggleText.textContent = 'Ocultar';
                toggleBtn.innerHTML = toggleBtn.innerHTML.replace('▼', '▲');
                // Forzar actualización de la lista cuando se abre el panel
                console.log('🎛️ Panel abierto, actualizando lista de impresoras...');
                setTimeout(() => updatePrinterSelection(), 100);
            } else {
                panel.classList.add('hidden');
                toggleText.textContent = 'Mostrar';
                toggleBtn.innerHTML = toggleBtn.innerHTML.replace('▲', '▼');
            }
        });

        // Marcar el elemento actual para indicar que ya le añadimos el listener
        try { toggleBtn.dataset.fleetBulkToggleBound = '1'; } catch (e) { /* dataset puede fallar en IE */ }
    }
    
    /**
     * Configura los botones de selección rápida
     */
    function setupSelectionButtons() {
        // Helper para bind once por elemento
        function bindIfNeeded(el, event, handler, flagName) {
            if (!el) return;
            try {
                if (el.dataset && el.dataset[flagName]) return;
                el.addEventListener(event, handler);
                el.dataset[flagName] = '1';
            } catch (e) {
                // Fallback: si dataset no está disponible, intentar bind sin guard
                try { el.addEventListener(event, handler); } catch (e2) {}
            }
        }

        // Seleccionar todas
        bindIfNeeded(document.getElementById('select-all'), 'click', () => selectPrintersByCondition(() => true), 'fleetBulkBound');

        // Seleccionar solo inactivas
        bindIfNeeded(document.getElementById('select-idle'), 'click', () => selectPrintersByCondition(printer => printer.status === 'idle' || printer.status === 'ready'), 'fleetBulkBound');

        // Seleccionar solo imprimiendo
        bindIfNeeded(document.getElementById('select-printing'), 'click', () => selectPrintersByCondition(printer => printer.status === 'printing'), 'fleetBulkBound');

        // Seleccionar solo con error
        bindIfNeeded(document.getElementById('select-error'), 'click', () => selectPrintersByCondition(printer => printer.status === 'error' || printer.status === 'offline'), 'fleetBulkBound');

        // Limpiar selección
        bindIfNeeded(document.getElementById('clear-selection'), 'click', () => { selectedPrinters.clear(); updatePrinterSelection(); updateSelectionCount(); }, 'fleetBulkBound');
    }
    
    /**
     * Configura los botones de comandos masivos
     */
    function setupBulkCommandButtons() {
        const commandButtons = document.querySelectorAll('.bulk-command-btn');

        commandButtons.forEach(btn => {
            // evitar duplicar listeners si el mismo botón es reinsertado
            if (btn.dataset && btn.dataset.fleetBulkCmdBound) return;

            btn.addEventListener('click', async (e) => {
                const el = e.currentTarget || e.target;
                const command = el.getAttribute('data-command');
                if (selectedPrinters.size === 0) {
                    alert('Selecciona al menos una impresora');
                    return;
                }

                await executeBulkCommand(command);
            });

            try { btn.dataset.fleetBulkCmdBound = '1'; } catch (e) {}
        });
    }
    
    /**
     * Configura la lista de selección de impresoras
     */
    function setupPrinterSelection() {
        // Esta función se llama cuando se actualiza la lista de impresoras
        updatePrinterSelection();
    }
    
    /**
     * Actualiza la lista de impresoras disponibles para selección
     */
    function updatePrinterSelection() {
        const selectionContainer = document.getElementById('printer-selection');
        if (!selectionContainer) {
            console.log('ℹ️ Contenedor de selección no encontrado');
            return;
        }
        
        // Obtener impresoras desde el estado global
        const printers = window.FleetState ? window.FleetState.getPrinters() : [];
        console.log('🎛️ Actualizando lista de selección con', printers.length, 'impresoras');
        
        selectionContainer.innerHTML = '';
        
        if (printers.length === 0) {
            selectionContainer.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center">No hay impresoras disponibles. Las impresoras aparecerán aquí cuando se carguen los datos.</p>';
            updateSelectionCount();
            return;
        }
        
        printers.forEach(printer => {
            const checkbox = document.createElement('label');
            checkbox.className = 'flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-100';
            
            const isSelected = selectedPrinters.has(printer.id);
            const statusColor = getStatusColor(printer.status);
            
            checkbox.innerHTML = `
                <input type="checkbox" 
                       class="printer-checkbox" 
                       data-printer-id="${printer.id}"
                       ${isSelected ? 'checked' : ''}>
                <span class="w-3 h-3 rounded-full ${statusColor}"></span>
                <span class="text-sm">${printer.name}</span>
                <span class="text-xs text-gray-500">(${printer.status})</span>
            `;
            
            const input = checkbox.querySelector('input');
            input.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedPrinters.add(printer.id);
                } else {
                    selectedPrinters.delete(printer.id);
                }
                updateSelectionCount();
            });
            
            selectionContainer.appendChild(checkbox);
        });
        
        updateSelectionCount();
    }
    
    /**
     * Selecciona impresoras basado en una condición
     */
    function selectPrintersByCondition(condition) {
        const printers = window.FleetState ? window.FleetState.getPrinters() : [];
        
        selectedPrinters.clear();
        printers.forEach(printer => {
            if (condition(printer)) {
                selectedPrinters.add(printer.id);
            }
        });
        
        updatePrinterSelection();
        updateSelectionCount();
    }
    
    /**
     * Actualiza el contador de selección
     */
    function updateSelectionCount() {
        const countElement = document.getElementById('selection-count');
        if (countElement) {
            countElement.textContent = `${selectedPrinters.size} impresoras seleccionadas`;
        }
    }
    
    /**
     * Ejecuta un comando masivo en las impresoras seleccionadas
     */
    async function executeBulkCommand(command) {
        const resultsPanel = document.getElementById('bulk-results');
        const resultsContent = document.getElementById('bulk-results-content');
        
        if (!resultsPanel || !resultsContent) return;
        
        resultsPanel.classList.remove('hidden');
        resultsContent.innerHTML = '<div class="text-center">Ejecutando comando...</div>';
        
        const selectedIds = Array.from(selectedPrinters);
        
        try {
            // Preparar el comando masivo
            const bulkCommand = {
                command: command,
                printer_ids: selectedIds,
                confirmation_required: false  // Ya lo confirmamos en el frontend
            };
            
            // Agregar axis para comando home
            if (command === 'home') {
                bulkCommand.axis = 'XYZ';  // Home all axes by default
            }
            
            console.log('📡 Enviando comando masivo:', bulkCommand);
            
            const response = await fetch('/api/fleet/bulk/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bulkCommand)
            });
            
            if (response.ok) {
                const result = await response.json();
                displayBulkResults(result);
            } else {
                const errorData = await response.json();
                displayBulkError(errorData.detail || 'Error del servidor');
            }
            
        } catch (error) {
            console.error('Error en comando masivo:', error);
            displayBulkError('Error de conexión: ' + error.message);
        }
    }
    
    /**
     * Muestra los resultados del comando masivo
     */
    function displayBulkResults(bulkResult) {
        const resultsContent = document.getElementById('bulk-results-content');
        if (!resultsContent) return;
        
        let html = `
            <div class="mb-3">
                <strong>Resumen:</strong> ${bulkResult.successful}/${bulkResult.total_printers} comandos ejecutados exitosamente
                <br>
                <span class="text-sm text-gray-600">${bulkResult.summary}</span>
            </div>
            <div class="space-y-2 max-h-40 overflow-y-auto">
        `;
        
        bulkResult.results.forEach(result => {
            const statusClass = result.success ? 'text-green-600' : 'text-red-600';
            const icon = result.success ? '✅' : '❌';
            
            html += `
                <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>${icon} ${result.printer_name || result.printer_id}</span>
                    <span class="${statusClass} text-sm">${result.message}</span>
                </div>
            `;
        });
        
        html += '</div>';
        resultsContent.innerHTML = html;
    }
    
    /**
     * Muestra un error en el panel de resultados
     */
    function displayBulkError(errorMessage) {
        const resultsContent = document.getElementById('bulk-results-content');
        if (!resultsContent) return;
        
        resultsContent.innerHTML = `
            <div class="text-center text-red-600">
                <strong>❌ Error:</strong> ${errorMessage}
            </div>
        `;
    }
    
    /**
     * Obtiene el color CSS basado en el estado de la impresora
     */
    function getStatusColor(status) {
        switch (status?.toLowerCase()) {
            case 'printing':
                return 'bg-blue-500';
            case 'idle':
            case 'ready':
                return 'bg-green-500';
            case 'paused':
                return 'bg-yellow-500';
            case 'error':
                return 'bg-red-500';
            case 'offline':
                return 'bg-gray-500';
            default:
                return 'bg-gray-400';
        }
    }
    
    // API pública del módulo
    return {
        init,
        updatePrinterSelection,
        getSelectedPrinters: () => Array.from(selectedPrinters),
        clearSelection: () => {
            selectedPrinters.clear();
            updatePrinterSelection();
            updateSelectionCount();
        }
    };
})();

// Observador opcional para re-adjuntar listeners si la sección de comandos masivos
// es reemplazada dinámicamente en el DOM por otras partes de la UI.
(function attachGlobalBulkObserver() {
    try {
        if (window._fleetBulkObserverAttached) return;
        window._fleetBulkObserverAttached = true;

        const observer = new MutationObserver((mutations) => {
            // Small heuristic: si aparece el panel o el toggle, re-inicializar
            let found = false;
            for (const m of mutations) {
                for (const node of m.addedNodes || []) {
                    if (!(node instanceof HTMLElement)) continue;
                    if (node.querySelector && (node.querySelector('#toggle-bulk-commands') || node.querySelector('#bulk-commands-panel') || node.querySelector('.bulk-command-btn'))) {
                        found = true;
                        break;
                    }
                    if (node.id === 'toggle-bulk-commands' || node.id === 'bulk-commands-panel') {
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }

            if (found && window.FleetBulkCommands && typeof window.FleetBulkCommands.init === 'function') {
                // Revalidar init para re-adjuntar listeners en nuevos elementos
                try {
                    window.FleetBulkCommands.init();
                } catch (e) {
                    console.error('Error re-inicializando FleetBulkCommands desde observer:', e);
                }
            }
        });

        // Observar el body por cambios que puedan afectar la sección
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('🔎 FleetBulkCommands DOM observer instalado');
    } catch (e) {
        console.warn('⚠️ No se pudo instalar observer para FleetBulkCommands:', e);
    }
})();
