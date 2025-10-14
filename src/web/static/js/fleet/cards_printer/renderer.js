// 🎨 MÓDULO RENDERER - Renderizado de tarjetas y modal
// Manejo de la generación de HTML y actualización de contenido visual

window.FleetCards = window.FleetCards || {};

window.FleetCards.Renderer = {
    // 🎨 Renderizar todas las tarjetas de impresoras
    renderCards(printers) {
        console.log('🎨 Renderizando tarjetas para', printers.length, 'impresoras');
        
        const cardsContainer = document.getElementById('cards-view');
        if (!cardsContainer) {
            console.error('❌ No se encontró el contenedor de tarjetas (#cards-view)');
            return;
        }

        console.log('📦 Contenedor de tarjetas encontrado:', cardsContainer);

        const countsSpan = document.getElementById('printers-count');
        if (countsSpan) {
            countsSpan.textContent = `${printers.length} impresora${printers.length !== 1 ? 's' : ''}`;
        }

        if (printers.length === 0) {
            console.log('📭 No hay impresoras, mostrando mensaje vacío');
            cardsContainer.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                    <div class="text-6xl mb-4">🖨️</div>
                    <h3 class="text-xl font-semibold mb-2">No hay impresoras registradas</h3>
                    <p class="text-sm">Agrega tu primera impresora usando el formulario anterior</p>
                </div>
            `;
            return;
        }

        console.log('🖨️ Generando HTML para', printers.length, 'impresoras');
        const cardsHTML = printers.map((printer, index) => {
            console.log(`🎴 Generando tarjeta ${index + 1} para:`, printer.name);
            return this.renderPrinterCard(printer);
        }).join('');
        
        console.log('📝 HTML generado, longitud:', cardsHTML.length);
        cardsContainer.innerHTML = cardsHTML;
        console.log('✅ Tarjetas renderizadas en el DOM');
    },

    // 🎨 Renderizar una tarjeta individual de impresora
    renderPrinterCard(printer) {
        console.log('🎨 Renderizando tarjeta para:', printer.name, printer);
        
        const statusInfo = window.FleetCards.Utils.getStatusInfo(printer.status);
        const realtimeData = printer.realtime_data || {};
        const progress = window.FleetCards.Utils.getPrintProgress(printer);
        const temperatures = window.FleetCards.Utils.getTemperatures(printer);

        console.log('📊 Datos de la tarjeta:', {
            name: printer.name,
            status: printer.status,
            statusInfo: statusInfo,
            progress: progress,
            temperatures: temperatures
        });

        try {
            return `
                <div class="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                    <!-- Header con gradiente y estado -->
                    <div class="bg-gradient-to-r ${statusInfo.gradient} p-6 text-white relative">
                        <div class="absolute top-4 right-4">
                            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-white bg-opacity-20 backdrop-blur-sm">
                                ${statusInfo.icon} ${statusInfo.label}
                            </span>
                        </div>
                        
                        <div class="pr-20">
                            <h3 class="text-xl font-bold mb-1">${window.FleetCards.Utils.escapeHtml(printer.name)}</h3>
                            <p class="text-sm opacity-90">${window.FleetCards.Utils.escapeHtml(printer.model || 'Modelo no especificado')}</p>
                            <p class="text-xs opacity-75 mt-1">📍 ${window.FleetCards.Utils.escapeHtml(printer.location || 'Ubicación no especificada')}</p>
                        </div>
                        
                        <!-- Progreso de impresión (si aplica) -->
                        ${progress > 0 ? `
                        <div class="mt-4">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-sm font-medium">Progreso de impresión</span>
                                <span class="text-sm">${progress.toFixed(1)}%</span>
                            </div>
                            <div class="w-full bg-white bg-opacity-20 rounded-full h-2">
                                <div class="h-2 bg-white rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                            </div>
                        </div>
                        ` : ''}
                    </div>

                    <!-- Contenido principal -->
                    <div class="p-6">
                        <!-- Temperaturas -->
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="text-center">
                                <div class="text-sm text-gray-500 mb-1">🔥 Hotend</div>
                                <div class="text-lg font-bold ${window.FleetCards.Utils.getTempClass(temperatures.extruder.current)}">
                                    ${temperatures.extruder.current}°C
                                </div>
                                <div class="text-xs text-gray-400">→ ${temperatures.extruder.target}°C</div>
                            </div>
                            
                            <div class="text-center">
                                <div class="text-sm text-gray-500 mb-1">🛏️ Cama</div>
                                <div class="text-lg font-bold ${window.FleetCards.Utils.getTempClass(temperatures.bed.current)}">
                                    ${temperatures.bed.current}°C
                                </div>
                                <div class="text-xs text-gray-400">→ ${temperatures.bed.target}°C</div>
                            </div>
                        </div>

                        <!-- Información técnica -->
                        <div class="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600">
                            <div class="space-y-1">
                                ${printer.local_ip && printer.vpn_ip ? `
                                    <div><strong>🏠 IP Local:</strong> ${window.FleetCards.Utils.escapeHtml(printer.local_ip)} ${printer.active_ip === printer.local_ip ? '<span class="text-green-600">✓ Activa</span>' : ''}</div>
                                    <div><strong>🔒 IP VPN:</strong> ${window.FleetCards.Utils.escapeHtml(printer.vpn_ip)} ${printer.active_ip === printer.vpn_ip ? '<span class="text-green-600">✓ Activa</span>' : ''}</div>
                                ` : `
                                    <div><strong>IP:</strong> ${window.FleetCards.Utils.escapeHtml(printer.ip_address || printer.local_ip || printer.ip || 'N/A')}</div>
                                `}
                                <div><strong>ID:</strong> ${window.FleetCards.Utils.escapeHtml(printer.id.substring(0, 8))}...</div>
                            </div>
                        </div>

                        <!-- Recomendación IA -->
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <div class="text-sm text-blue-800">
                                <span class="font-medium">🤖 IA:</span> ${window.FleetCards.Utils.getAIRecommendation(printer)}
                            </div>
                        </div>

                        <!-- Botones de acción -->
                        <div class="flex gap-2">
                            <button class="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                                    data-action="show-details" data-printer-id="${printer.id}">
                                👁️ Ver Detalles
                            </button>
                            <button class="bg-yellow-500 text-white py-2 px-3 rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                                    data-action="edit" data-printer-id="${printer.id}" title="Editar impresora">
                                ✏️
                            </button>
                            <button class="bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600 transition-colors text-sm"
                                    data-action="delete" data-printer-id="${printer.id}" title="Eliminar impresora">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ Error renderizando tarjeta para:', printer.name, error);
            return `
                <div class="bg-red-50 border border-red-200 rounded-2xl p-6">
                    <div class="text-red-800">
                        <h3 class="font-bold">❌ Error</h3>
                        <p class="text-sm">No se pudo renderizar la tarjeta para ${window.FleetCards.Utils.escapeHtml(printer.name || 'impresora desconocida')}</p>
                    </div>
                </div>
            `;
        }
    },

    // 👁️ Mostrar detalles completos de impresora
    showPrinterDetails(printerId) {
        // Guardar el printerId mostrado en el modal
        if (window.FleetCards.Core) {
            window.FleetCards.Core.currentModalPrinterId = printerId;
        }
        
        console.log('👁️ Mostrando detalles para impresora:', printerId);
        
        let printer = null;
        
        // Buscar la impresora en múltiples fuentes de datos
        if (window.FleetState && window.FleetState.printers) {
            printer = window.FleetState.printers.find(p => p.id === printerId);
        }
        
        if (!printer && window.FleetData && window.FleetData.printers) {
            printer = window.FleetData.printers.find(p => p.id === printerId);
        }
        
        if (!printer && window.fleetPrinters) {
            printer = window.fleetPrinters.find(p => p.id === printerId);
        }
        
        // Última opción: buscar en el contenedor de tarjetas usando el DOM
        if (!printer) {
            console.warn('🔍 No se encontró la impresora en datos globales, obteniendo desde API...');
            this.fetchPrinterDataAndShowModal(printerId);
            return;
        }
        
        console.log('🔍 Impresora encontrada:', printer);
        
        if (printer) {
            const modal = document.getElementById('printer-details-modal');
            const modalTitle = document.getElementById('modal-printer-title');
            const modalContent = document.getElementById('modal-printer-content');
            
            if (modal && modalTitle && modalContent) {
                modalTitle.textContent = `Detalles de ${printer.name}`;
                modalContent.innerHTML = this.renderPrinterDetailContent(printer);
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                
                // Cargar archivos G-code después de mostrar el modal
                if (window.FleetCards.GcodeFiles) {
                    window.FleetCards.GcodeFiles.loadPrinterGcodeFiles(printerId);
                }
                
                console.log('✅ Modal de detalles mostrado');
            } else {
                console.error('❌ No se encontraron elementos del modal');
                if (window.FleetCards.Core) {
                    window.FleetCards.Core.showToast('Error: No se pudo mostrar el modal de detalles', 'error');
                }
            }
        } else {
            console.error('❌ No se pudo encontrar la impresora:', printerId);
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast('Error: No se encontró la impresora', 'error');
            }
        }
    },

    // 🌐 Obtener datos de impresora directamente de la API
    async fetchPrinterDataAndShowModal(printerId) {
        // Prevenir bucles infinitos - verificar si ya se está cargando esta impresora
        if (this._loadingPrinters && this._loadingPrinters.has(printerId)) {
            console.log('⚠️ Ya se está cargando datos para la impresora:', printerId);
            return;
        }
        
        // Inicializar conjunto de impresoras en carga si no existe
        if (!this._loadingPrinters) {
            this._loadingPrinters = new Set();
        }
        
        // Marcar como en proceso de carga
        this._loadingPrinters.add(printerId);
        
        console.log('🌐 Obteniendo datos de impresora desde API:', printerId);
        
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const printer = await response.json();
            console.log('📡 Datos de impresora obtenidos:', printer);
            
            // Actualizar datos globales si están disponibles
            if (window.FleetState && window.FleetState.printers) {
                const index = window.FleetState.printers.findIndex(p => p.id === printerId);
                if (index !== -1) {
                    window.FleetState.printers[index] = printer;
                } else {
                    window.FleetState.printers.push(printer);
                }
            }
            
            // Mostrar modal directamente con datos actualizados
            const modal = document.getElementById('printer-details-modal');
            const modalTitle = document.getElementById('modal-printer-title');
            const modalContent = document.getElementById('modal-printer-content');
            
            if (modal && modalTitle && modalContent && printer) {
                modalTitle.textContent = `Detalles de ${printer.name}`;
                modalContent.innerHTML = this.renderPrinterDetailContent(printer);
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                
                // Cargar archivos G-code después de mostrar el modal
                if (window.FleetCards.GcodeFiles) {
                    window.FleetCards.GcodeFiles.loadPrinterGcodeFiles(printerId);
                }
                
                console.log('✅ Modal de detalles mostrado con datos de API');
            } else {
                console.error('❌ No se pudieron mostrar los datos obtenidos de la API');
                if (window.FleetCards.Core) {
                    window.FleetCards.Core.showToast('Error: No se pudo mostrar el modal', 'error');
                }
            }
            
        } catch (error) {
            console.error('❌ Error obteniendo datos de impresora:', error);
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`Error: No se pudieron obtener los datos de la impresora: ${error.message}`, 'error');
            }
        } finally {
            // Limpiar el estado de carga
            this._loadingPrinters.delete(printerId);
        }
    },

    // 📋 Renderizar contenido detallado de impresora
    renderPrinterDetailContent(printer) {
        const realtimeData = printer.realtime_data || {};
        const statusInfo = window.FleetCards.Utils.getStatusInfo(printer.status);
        const temperatures = window.FleetCards.Utils.getTemperatures(printer);
        const progress = window.FleetCards.Utils.getPrintProgress(printer);
        
        return `
            <div class="space-y-6">
                <!-- Información básica -->
                <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-3xl">🖨️</div>
                        <div>
                            <h4 class="text-xl font-bold text-blue-900">${printer.name}</h4>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgClass} ${statusInfo.textClass}" data-modal-status>
                                    ${statusInfo.icon} ${statusInfo.label}
                                </span>
                                <span class="text-sm text-blue-700">${printer.model || 'Modelo no especificado'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div class="space-y-2">
                            <div><span class="font-semibold text-blue-800">ID:</span> <code class="bg-blue-200 px-2 py-1 rounded text-xs">${printer.id}</code></div>
                            <div><span class="font-semibold text-blue-800">IP:</span> <code class="bg-blue-200 px-2 py-1 rounded text-xs">${printer.ip_address || printer.ip}</code></div>
                            <div><span class="font-semibold text-blue-800">Ubicación:</span> ${printer.location || 'No especificada'}</div>
                        </div>
                        <div class="space-y-2">
                            <div><span class="font-semibold text-blue-800">Capacidades:</span></div>
                            <div class="flex flex-wrap gap-1">
                                ${Array.isArray(printer.capabilities) ? printer.capabilities.map(cap => 
                                    `<span class="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs">${cap}</span>`
                                ).join('') : `<span class="text-gray-500 text-xs">No especificadas</span>`}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Estado del Sistema Klipper -->
                ${realtimeData.state ? `
                <div class="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-2xl">⚙️</div>
                        <h4 class="text-lg font-bold text-green-900">Sistema Klipper</h4>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div class="space-y-2">
                            <div><span class="font-semibold text-green-800">Estado:</span> <span class="text-green-700">${realtimeData.state}</span></div>
                            <div><span class="font-semibold text-green-800">Mensaje:</span> <span class="text-green-700">${realtimeData.state_message || 'N/A'}</span></div>
                            <div><span class="font-semibold text-green-800">Hostname:</span> <span class="text-green-700">${realtimeData.hostname || 'N/A'}</span></div>
                            <div><span class="font-semibold text-green-800">Versión:</span> <span class="text-green-700">${realtimeData.software_version || 'N/A'}</span></div>
                        </div>
                        <div class="space-y-2">
                            <div><span class="font-semibold text-green-800">PID:</span> <span class="text-green-700">${realtimeData.process_id || 'N/A'}</span></div>
                            <div><span class="font-semibold text-green-800">CPU:</span> <span class="text-green-700">${realtimeData.cpu_info || 'N/A'}</span></div>
                            <div><span class="font-semibold text-green-800">Usuario:</span> <span class="text-green-700">${realtimeData.user_id || 'N/A'}</span></div>
                            <div><span class="font-semibold text-green-800">Grupo:</span> <span class="text-green-700">${realtimeData.group_id || 'N/A'}</span></div>
                        </div>
                    </div>
                    
                    ${realtimeData.klipper_path || realtimeData.python_path ? `
                    <div class="mt-4 pt-4 border-t border-green-200">
                        <h5 class="font-semibold text-green-800 mb-2">Rutas del Sistema:</h5>
                        <div class="space-y-1 text-xs">
                            ${realtimeData.klipper_path ? `<div><span class="font-medium">Klipper:</span> <code class="bg-green-200 px-2 py-1 rounded">${realtimeData.klipper_path}</code></div>` : ''}
                            ${realtimeData.python_path ? `<div><span class="font-medium">Python:</span> <code class="bg-green-200 px-2 py-1 rounded">${realtimeData.python_path}</code></div>` : ''}
                            ${realtimeData.config_file ? `<div><span class="font-medium">Config:</span> <code class="bg-green-200 px-2 py-1 rounded">${realtimeData.config_file}</code></div>` : ''}
                            ${realtimeData.log_file ? `<div><span class="font-medium">Log:</span> <code class="bg-green-200 px-2 py-1 rounded">${realtimeData.log_file}</code></div>` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Temperaturas -->
                <div class="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-2xl">🌡️</div>
                        <h4 class="text-lg font-bold text-orange-900">Temperaturas</h4>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Extrusor -->
                        <div class="bg-white rounded-lg p-4 border border-orange-200">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-semibold text-orange-800">🔥 Hotend/Extrusor</span>
                                <span class="text-2xl font-bold ${window.FleetCards.Utils.getTempClass(temperatures.extruder.current)} text-orange-700" data-modal-extruder-temp>
                                    ${temperatures.extruder.current}°C → ${temperatures.extruder.target}°C
                                </span>
                            </div>
                        </div>
                        
                        <!-- Cama caliente -->
                        <div class="bg-white rounded-lg p-4 border border-orange-200">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-semibold text-orange-800">🛏️ Cama Caliente</span>
                                <span class="text-2xl font-bold ${window.FleetCards.Utils.getTempClass(temperatures.bed.current)} text-orange-700" data-modal-bed-temp>
                                    ${temperatures.bed.current}°C → ${temperatures.bed.target}°C
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Estado de Impresión -->
                ${realtimeData.print_state ? `
                <div class="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200" data-modal-print-info>
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-2xl">📄</div>
                        <h4 class="text-lg font-bold text-purple-900">Estado de Impresión</h4>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div class="space-y-2">
                            <div><span class="font-semibold text-purple-800">Estado:</span> 
                                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${window.FleetCards.Utils.getStatusInfo(realtimeData.print_state).bgClass} ${window.FleetCards.Utils.getStatusInfo(realtimeData.print_state).textClass}" data-modal-print-state>
                                    ${window.FleetCards.Utils.getStatusInfo(realtimeData.print_state).icon} ${window.FleetCards.Utils.getStatusInfo(realtimeData.print_state).label}
                                </span>
                            </div>
                            <div><span class="font-semibold text-purple-800">Archivo:</span> <span class="text-purple-700 font-mono text-xs" data-modal-print-filename>${realtimeData.print_filename || 'Ninguno'}</span></div>
                            <div><span class="font-semibold text-purple-800">Progreso:</span> 
                                <div class="mt-1">
                                    <div class="w-full bg-purple-200 rounded-full h-2">
                                        <div class="h-2 bg-purple-500 rounded-full transition-all duration-300" style="width: ${progress}%" data-modal-progress-bar></div>
                                    </div>
                                    <span class="text-xs text-purple-600 mt-1" data-modal-progress-text>${progress.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-2">
                            ${realtimeData.print_total_duration !== undefined ? `<div><span class="font-semibold text-purple-800">Duración Total:</span> <span class="text-purple-700" data-modal-total-duration>${window.FleetCards.Utils.formatDuration(realtimeData.print_total_duration)}</span></div>` : ''}
                            ${realtimeData.print_duration !== undefined ? `<div><span class="font-semibold text-purple-800">Duración Impresión:</span> <span class="text-purple-700" data-modal-print-duration>${window.FleetCards.Utils.formatDuration(realtimeData.print_duration)}</span></div>` : ''}
                            ${realtimeData.filament_used !== undefined ? `<div><span class="font-semibold text-purple-800">Filamento Usado:</span> <span class="text-purple-700" data-modal-filament-used>${(realtimeData.filament_used / 1000).toFixed(2)}mm</span></div>` : ''}
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Información Técnica Adicional -->
                ${realtimeData.pressure_advance !== undefined || realtimeData.smooth_time !== undefined ? `
                <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-2xl">🔧</div>
                        <h4 class="text-lg font-bold text-gray-900">Configuración Técnica</h4>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        ${realtimeData.pressure_advance !== undefined ? `<div><span class="font-semibold text-gray-800">Pressure Advance:</span> <span class="text-gray-700">${realtimeData.pressure_advance}</span></div>` : ''}
                        ${realtimeData.smooth_time !== undefined ? `<div><span class="font-semibold text-gray-800">Smooth Time:</span> <span class="text-gray-700">${realtimeData.smooth_time}s</span></div>` : ''}
                        ${realtimeData.motion_queue !== undefined ? `<div><span class="font-semibold text-gray-800">Motion Queue:</span> <span class="text-gray-700">${realtimeData.motion_queue || 'N/A'}</span></div>` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Comandos de control -->
                <div class="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-2xl">🎮</div>
                        <h4 class="text-lg font-bold text-indigo-900">Comandos de Control</h4>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <button class="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium" 
                                data-action="pause" data-printer-id="${printer.id}">
                            ⏸️ Pausar
                        </button>
                        <button class="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                                data-action="resume" data-printer-id="${printer.id}">
                            ▶️ Reanudar
                        </button>
                        <button class="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                                data-action="cancel" data-printer-id="${printer.id}">
                            ❌ Cancelar
                        </button>
                        <button class="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                                data-action="home" data-printer-id="${printer.id}">
                            🏠 Home XYZ
                        </button>
                        <button class="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                                data-action="restart-klipper" data-printer-id="${printer.id}">
                            🔄 Host Restart
                        </button>
                        <button class="flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                                data-action="restart-firmware" data-printer-id="${printer.id}">
                            ⚡ Firmware Restart
                        </button>
                    </div>
                </div>

                <!-- Gestión de Archivos G-code -->
                <div class="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-2xl">📁</div>
                        <h4 class="text-lg font-bold text-emerald-900">Archivos G-code</h4>
                        <button class="ml-auto px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
                                onclick="window.FleetCards.GcodeFiles.showFileUploadDialog('${printer.id}')">
                            📤 Subir Archivo
                        </button>
                    </div>
                    
                    <!-- Lista de archivos -->
                    <div id="gcode-files-${printer.id}" class="mb-4">
                        <div class="flex items-center justify-center py-4 text-gray-500">
                            <div class="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full mr-2"></div>
                            Cargando archivos...
                        </div>
                    </div>
                    
                    <!-- Información de almacenamiento -->
                    <div class="text-xs text-emerald-700 bg-emerald-50 rounded p-2">
                        💡 Los archivos G-code se almacenan directamente en la impresora y pueden iniciarse inmediatamente.
                    </div>
                </div>

                <!-- Información de Debug (solo si hay datos adicionales) -->
                <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <details class="cursor-pointer">
                        <summary class="font-semibold text-gray-800 mb-2">🔍 Datos Raw de la API (Debug)</summary>
                        <pre class="text-xs bg-gray-100 p-3 rounded overflow-x-auto border"><code>${JSON.stringify(printer, null, 2)}</code></pre>
                    </details>
                </div>
            </div>
        `;
    },

    // 🔄 Actualizar contenido del modal selectivamente sin afectar la lista de archivos G-code
    updateModalContentSelectively(printer) {
        const realtimeData = printer.realtime_data || {};
        const statusInfo = window.FleetCards.Utils.getStatusInfo(printer.status);
        const temperatures = window.FleetCards.Utils.getTemperatures(printer);
        const progress = window.FleetCards.Utils.getPrintProgress(printer);
        
        console.log('🔧 Actualizando modal selectivamente para:', printer.id);
        console.log('📊 Datos de tiempo real:', realtimeData);
        console.log('📈 Progreso calculado:', progress + '%');
        
        // Verificar si los elementos básicos del modal existen
        const statusElement = document.querySelector('[data-modal-status]');
        const extruderTempElement = document.querySelector('[data-modal-extruder-temp]');
        const bedTempElement = document.querySelector('[data-modal-bed-temp]');
        
        // Si no existen elementos básicos, significa que el modal necesita ser regenerado completamente
        if (!statusElement || !extruderTempElement || !bedTempElement) {
            console.log('⚠️ Elementos básicos del modal no encontrados, regenerando modal completo...');
            this.fetchPrinterDataAndShowModal(printer.id);
            return;
        }
        
        // Actualizar estado general
        if (statusElement) {
            statusElement.innerHTML = `${statusInfo.icon} ${statusInfo.label}`;
            statusElement.className = `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgClass} ${statusInfo.textClass}`;
        }
        
        // Actualizar temperaturas
        if (extruderTempElement) {
            extruderTempElement.innerHTML = `${temperatures.extruder.current}°C → ${temperatures.extruder.target}°C`;
            extruderTempElement.className = `text-2xl font-bold ${window.FleetCards.Utils.getTempClass(temperatures.extruder.current)} text-orange-700`;
        }
        
        if (bedTempElement) {
            bedTempElement.innerHTML = `${temperatures.bed.current}°C → ${temperatures.bed.target}°C`;
            bedTempElement.className = `text-2xl font-bold ${window.FleetCards.Utils.getTempClass(temperatures.bed.current)} text-orange-700`;
        }
        
        // Actualizar progreso de impresión (solo si la impresora está imprimiendo)
        if (realtimeData.print_state && (realtimeData.print_state === 'printing' || realtimeData.print_state === 'paused')) {
            const progressBarElement = document.querySelector('[data-modal-progress-bar]');
            const progressTextElement = document.querySelector('[data-modal-progress-text]');
            
            // Si la impresora está imprimiendo pero no hay elementos de progreso, regenerar modal
            if (!progressBarElement || !progressTextElement) {
                console.log('⚠️ Impresora está imprimiendo pero faltan elementos de progreso, regenerando modal...');
                this.fetchPrinterDataAndShowModal(printer.id);
                return;
            }
            
            if (progressBarElement) {
                progressBarElement.style.width = `${progress}%`;
                console.log('✅ Barra de progreso actualizada a:', progress + '%');
            }
            
            if (progressTextElement) {
                progressTextElement.textContent = `${progress.toFixed(1)}%`;
                console.log('✅ Texto de progreso actualizado a:', progress.toFixed(1) + '%');
            }
            
            // Actualizar información del archivo actual y duraciones
            this.updatePrintJobInfo(realtimeData);
        } else {
            console.log('ℹ️ Impresora no está imprimiendo, omitiendo actualización de progreso');
        }
        
        console.log('✅ Modal actualizado selectivamente sin afectar lista de archivos');
    },

    // 🔄 Actualizar información específica del trabajo de impresión
    updatePrintJobInfo(realtimeData) {
        // Actualizar estado de impresión
        const printStateElement = document.querySelector('[data-modal-print-state]');
        if (printStateElement && realtimeData.print_state) {
            const stateInfo = window.FleetCards.Utils.getStatusInfo(realtimeData.print_state);
            printStateElement.innerHTML = `${stateInfo.icon} ${stateInfo.label}`;
            printStateElement.className = `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stateInfo.bgClass} ${stateInfo.textClass}`;
            console.log('✅ Estado de impresión actualizado a:', realtimeData.print_state, '->', stateInfo.label);
        }
        
        // Actualizar archivo actual
        const printFilenameElement = document.querySelector('[data-modal-print-filename]');
        if (printFilenameElement && realtimeData.print_filename) {
            printFilenameElement.textContent = realtimeData.print_filename;
            console.log('✅ Archivo actualizado a:', realtimeData.print_filename);
        }
        
        // Actualizar duración total
        const totalDurationElement = document.querySelector('[data-modal-total-duration]');
        if (totalDurationElement && realtimeData.print_total_duration !== undefined) {
            totalDurationElement.textContent = window.FleetCards.Utils.formatDuration(realtimeData.print_total_duration);
            console.log('✅ Duración total actualizada a:', window.FleetCards.Utils.formatDuration(realtimeData.print_total_duration));
        }
        
        // Actualizar duración de impresión
        const printDurationElement = document.querySelector('[data-modal-print-duration]');
        if (printDurationElement && realtimeData.print_duration !== undefined) {
            printDurationElement.textContent = window.FleetCards.Utils.formatDuration(realtimeData.print_duration);
            console.log('✅ Duración de impresión actualizada a:', window.FleetCards.Utils.formatDuration(realtimeData.print_duration));
        }
        
        // Actualizar filamento usado
        const filamentElement = document.querySelector('[data-modal-filament-used]');
        if (filamentElement && realtimeData.filament_used !== undefined) {
            filamentElement.textContent = `${(realtimeData.filament_used / 1000).toFixed(2)}mm`;
            console.log('✅ Filamento usado actualizado a:', `${(realtimeData.filament_used / 1000).toFixed(2)}mm`);
        }
    },

    // 👁️ Ocultar modal de detalles
    hidePrinterDetails() {
        const modal = document.getElementById('printer-details-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            console.log('✅ Modal de detalles ocultado');
        }
        // Limpiar el printerId mostrado
        if (window.FleetCards.Core) {
            window.FleetCards.Core.currentModalPrinterId = null;
        }
    },

    // 🧪 Función de prueba para verificar funcionamiento
    testRender() {
        console.log('🧪 Ejecutando test de renderizado...');
        const cardsContainer = document.getElementById('cards-view');
        
        if (!cardsContainer) {
            console.error('❌ No se encontró el contenedor #cards-view');
            return;
        }

        // Test simple con HTML básico
        cardsContainer.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-2">🖨️ Impresora Test</h3>
                <p class="text-gray-600 mb-4">Esta es una tarjeta de prueba</p>
                <div class="bg-green-50 rounded-lg p-3">
                    <span class="text-green-600">✅ Test funcionando</span>
                </div>
                <button class="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    Botón de prueba
                </button>
            </div>
        `;
        
        console.log('✅ Test renderizado');
    }
};

console.log('🎨 Módulo FleetCards.Renderer cargado');
