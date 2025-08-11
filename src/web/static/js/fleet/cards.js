// 🎴 SISTEMA DE TARJETAS DE IMPRESORAS - KyberCore Fleet
// Manejo de la vista de tarjetas para gestión visual de la flota

window.FleetCards = {
    // 🔧 Inicialización del sistema de tarjetas
    init() {
        console.log('🎴 Inicializando sistema de tarjetas de flota...');
        
        // Verificar que los elementos DOM existen
        const cardsView = document.getElementById('cards-view');
        const tableView = document.getElementById('table-view');
        const cardsBtn = document.getElementById('cards-view-btn');
        const tableBtn = document.getElementById('table-view-btn');
        
        console.log('🔍 Elementos DOM encontrados:', {
            cardsView: !!cardsView,
            tableView: !!tableView,
            cardsBtn: !!cardsBtn,
            tableBtn: !!tableBtn
        });
        
        this.setupViewToggle();
        this.setupCardEventListeners();
        
        // Escuchar eventos de actualización de impresoras
        if (window.FleetEventBus) {
            window.FleetEventBus.on('printersUpdated', (printers) => {
                console.log('🎴 Evento printersUpdated recibido con', printers.length, 'impresoras');
                this.renderCards(printers);
            });
        }
        
        // Verificar si ya hay datos disponibles
        if (window.FleetState && window.FleetState.printers) {
            const printers = window.FleetState.printers;
            console.log('🎴 Datos de impresoras disponibles al inicializar:', printers.length);
            if (printers.length > 0) {
                this.renderCards(printers);
            }
        }
    },

    // 🔄 Configurar alternancia entre vista de tarjetas y tabla
    setupViewToggle() {
        const cardsViewBtn = document.getElementById('cards-view-btn');
        const tableViewBtn = document.getElementById('table-view-btn');
        const cardsView = document.getElementById('cards-view');
        const tableView = document.getElementById('table-view');

        console.log('🔄 Configurando toggle de vistas...', {
            cardsViewBtn: !!cardsViewBtn,
            tableViewBtn: !!tableViewBtn,
            cardsView: !!cardsView,
            tableView: !!tableView
        });

        if (cardsViewBtn && tableViewBtn && cardsView && tableView) {
            cardsViewBtn.addEventListener('click', () => {
                console.log('📱 Cambiando a vista de tarjetas');
                cardsView.classList.remove('hidden');
                tableView.classList.add('hidden');
                cardsViewBtn.classList.add('bg-blue-500', 'text-white');
                cardsViewBtn.classList.remove('text-gray-600');
                tableViewBtn.classList.remove('bg-blue-500', 'text-white');
                tableViewBtn.classList.add('text-gray-600');
            });

            tableViewBtn.addEventListener('click', () => {
                console.log('📊 Cambiando a vista de tabla');
                cardsView.classList.add('hidden');
                tableView.classList.remove('hidden');
                tableViewBtn.classList.add('bg-blue-500', 'text-white');
                tableViewBtn.classList.remove('text-gray-600');
                cardsViewBtn.classList.remove('bg-blue-500', 'text-white');
                cardsViewBtn.classList.add('text-gray-600');
            });
            
            console.log('✅ Listeners de toggle configurados');
        } else {
            console.error('❌ No se pudieron configurar los toggle buttons');
        }
    },

    // 🎯 Configurar listeners para eventos de tarjetas
    setupCardEventListeners() {
        // Event delegation para botones de tarjetas
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const printerId = button.dataset.printerId;

            switch (action) {
                case 'view-details':
                    this.showPrinterDetails(printerId);
                    break;
                case 'pause':
                    this.sendPrinterCommand(printerId, 'pause');
                    break;
                case 'resume':
                    this.sendPrinterCommand(printerId, 'resume');
                    break;
                case 'cancel':
                    this.sendPrinterCommand(printerId, 'cancel');
                    break;
                case 'home':
                    this.sendPrinterCommand(printerId, 'home', { axis: 'XYZ' });
                    break;
                case 'restart-klipper':
                    this.sendPrinterCommand(printerId, 'restart_klipper');
                    break;
                case 'restart-firmware':
                    this.sendPrinterCommand(printerId, 'restart_firmware');
                    break;
                case 'delete':
                    this.deletePrinter(printerId);
                    break;
            }
        });

        // Listener para cerrar modal de detalles
        const closeModal = document.getElementById('close-printer-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.hidePrinterDetails();
            });
        }

        // Cerrar modal al hacer clic fuera
        const modal = document.getElementById('printer-details-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hidePrinterDetails();
                }
            });
        }
    },

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
        
        const statusInfo = this.getStatusInfo(printer.status);
        const realtimeData = printer.realtime_data || {};
        const progress = realtimeData.progress || 0;
        const hotendTemp = realtimeData.hotend_temp || realtimeData.extruder_temp || 0;
        const bedTemp = realtimeData.bed_temp || 0;

        console.log('📊 Datos de la tarjeta:', {
            name: printer.name,
            status: printer.status,
            statusInfo: statusInfo,
            progress: progress,
            hotendTemp: hotendTemp,
            bedTemp: bedTemp
        });

        try {
            const cardHTML = `
                <div class="printer-card bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div class="relative h-48 bg-gradient-to-br ${statusInfo.gradient}">
                        <!-- Imagen placeholder o cámara -->
                        <div class="w-full h-full flex items-center justify-center text-white text-6xl">
                            🖨️
                        </div>
                        
                        <!-- Badge de estado -->
                        <div class="printer-status-badge ${statusInfo.bgClass} ${statusInfo.textClass}">
                            ${statusInfo.icon} ${statusInfo.label}
                        </div>
                        
                        <!-- Badge de ubicación -->
                        ${printer.location ? `
                            <div class="printer-location-badge">
                                📍 ${printer.location}
                            </div>
                        ` : ''}
                        
                        <!-- Badge de tipo/modelo -->
                        <div class="printer-type-badge bg-gray-800 text-white">
                            ${printer.model || 'Modelo'}
                        </div>
                    </div>
                    
                    <div class="p-6">
                        <!-- Nombre y información básica -->
                        <div class="mb-4">
                            <h3 class="font-bold text-xl text-gray-900 mb-1">${printer.name}</h3>
                            <p class="text-sm text-gray-600 flex items-center gap-2">
                                <span>🌐 ${printer.ip_address || printer.ip}</span>
                                ${printer.capabilities ? `<span>• ${Array.isArray(printer.capabilities) ? printer.capabilities.join(', ') : printer.capabilities}</span>` : ''}
                            </p>
                        </div>

                        <!-- Información de trabajo actual -->
                        ${realtimeData.current_file ? `
                            <div class="bg-blue-50 rounded-lg p-3 mb-4">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="text-blue-600">📄</span>
                                    <span class="text-sm font-medium text-blue-900">Trabajo Actual</span>
                                </div>
                                <div class="text-xs text-gray-700">
                                    <div class="font-medium truncate">${realtimeData.current_file}</div>
                                    ${realtimeData.estimated_time ? `
                                        <div class="mt-1">⏱️ ${realtimeData.estimated_time}</div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Progreso de impresión -->
                        ${progress > 0 ? `
                            <div class="mb-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-sm font-medium text-gray-700">Progreso</span>
                                    <span class="text-xs text-gray-500">${Math.round(progress)}%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="h-2 bg-blue-400 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Temperaturas -->
                        <div class="grid grid-cols-2 gap-3 mb-4">
                            <div class="bg-gray-50 rounded-lg p-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs text-gray-600">🔥 Hotend</span>
                                    <span class="temperature-indicator ${this.getTempClass(hotendTemp)}">
                                        ${hotendTemp}°C
                                    </span>
                                </div>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs text-gray-600">🛏️ Cama</span>
                                    <span class="temperature-indicator ${this.getTempClass(bedTemp)}">
                                        ${bedTemp}°C
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Análisis IA (simulado) -->
                        <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 mb-4">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-purple-600">🤖</span>
                                <span class="text-sm font-medium text-purple-900">Estado IA</span>
                            </div>
                            <div class="text-xs text-gray-700">
                                ${this.getAIRecommendation(printer)}
                            </div>
                        </div>

                        <!-- Botones de acción -->
                        <div class="grid grid-cols-3 gap-2">
                            <!-- Fila 1: Acciones principales -->
                            <button class="action-button flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg text-xs hover:from-blue-600 hover:to-blue-700 transition-colors font-medium"
                                    data-action="view-details" data-printer-id="${printer.id}">
                                👁️ Ver
                            </button>
                            ${printer.status === 'printing' ? `
                                <button class="action-button flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 py-2 rounded-lg text-xs hover:from-yellow-600 hover:to-yellow-700 transition-colors font-medium"
                                        data-action="pause" data-printer-id="${printer.id}">
                                    ⏸️ Pausar
                                </button>
                            ` : printer.status === 'paused' ? `
                                <button class="action-button flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-lg text-xs hover:from-green-600 hover:to-green-700 transition-colors font-medium"
                                        data-action="resume" data-printer-id="${printer.id}">
                                    ▶️ Reanudar
                                </button>
                            ` : `
                                <button class="action-button flex-1 bg-gradient-to-r from-blue-400 to-blue-500 text-white px-3 py-2 rounded-lg text-xs hover:from-blue-500 hover:to-blue-600 transition-colors font-medium"
                                        data-action="home" data-printer-id="${printer.id}">
                                    🏠 Home
                                </button>
                            `}
                            <button class="action-button flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 rounded-lg text-xs hover:from-red-600 hover:to-red-700 transition-colors font-medium"
                                    data-action="cancel" data-printer-id="${printer.id}">
                                ❌ Cancelar
                            </button>
                            
                            <!-- Fila 2: Acciones secundarias -->
                            <button class="action-button flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-lg text-xs hover:from-purple-600 hover:to-purple-700 transition-colors font-medium"
                                    data-action="restart-klipper" data-printer-id="${printer.id}">
                                🔄 Host
                            </button>
                            <button class="action-button flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-lg text-xs hover:from-orange-600 hover:to-orange-700 transition-colors font-medium"
                                    data-action="restart-firmware" data-printer-id="${printer.id}">
                                ⚡ MCU
                            </button>
                            <button class="action-button flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white px-3 py-2 rounded-lg text-xs hover:from-gray-600 hover:to-gray-700 transition-colors font-medium"
                                    data-action="delete" data-printer-id="${printer.id}">
                                🗑️ Borrar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ HTML de tarjeta generado correctamente para:', printer.name);
            return cardHTML;
            
        } catch (error) {
            console.error('❌ Error generando HTML de tarjeta para', printer.name, ':', error);
            return `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Error:</strong> No se pudo renderizar la tarjeta para ${printer.name}
                    <br><small>${error.message}</small>
                </div>
            `;
        }
    },

    // 📊 Obtener información de estado para styling
    getStatusInfo(status) {
        const statusMap = {
            'online': { 
                label: 'En Línea', 
                icon: '✅', 
                bgClass: 'bg-green-500', 
                textClass: 'text-white',
                gradient: 'from-green-400 to-green-600'
            },
            'printing': { 
                label: 'Imprimiendo', 
                icon: '🖨️', 
                bgClass: 'bg-blue-500', 
                textClass: 'text-white',
                gradient: 'from-blue-400 to-blue-600'
            },
            'paused': { 
                label: 'Pausado', 
                icon: '⏸️', 
                bgClass: 'bg-yellow-500', 
                textClass: 'text-white',
                gradient: 'from-yellow-400 to-yellow-600'
            },
            'error': { 
                label: 'Error', 
                icon: '⚠️', 
                bgClass: 'bg-red-500', 
                textClass: 'text-white',
                gradient: 'from-red-400 to-red-600'
            },
            'offline': { 
                label: 'Desconectado', 
                icon: '❌', 
                bgClass: 'bg-gray-500', 
                textClass: 'text-white',
                gradient: 'from-gray-400 to-gray-600'
            },
            'idle': { 
                label: 'Inactivo', 
                icon: '⏸', 
                bgClass: 'bg-gray-400', 
                textClass: 'text-white',
                gradient: 'from-gray-300 to-gray-500'
            }
        };
        return statusMap[status] || statusMap['offline'];
    },

    // 🌡️ Obtener clase CSS para temperatura
    getTempClass(temp) {
        if (temp < 40) return 'temp-normal';
        if (temp < 200) return 'temp-heating';
        return 'temp-hot';
    },

    // 🤖 Generar recomendación IA simulada
    getAIRecommendation(printer) {
        const status = printer.status;
        const recommendations = {
            'online': '✅ Impresora lista para trabajos',
            'printing': '📈 Rendimiento óptimo detectado',
            'paused': '⚠️ Verificar motivo de pausa',
            'error': '🔧 Diagnóstico de falla requerido',
            'offline': '🔌 Verificar conexión de red',
            'idle': '💡 Disponible para nuevo trabajo'
        };
        return recommendations[status] || '🤖 Analizando estado...';
    },

    // 👁️ Mostrar detalles completos de impresora
    showPrinterDetails(printerId) {
        if (window.FleetState && window.FleetState.printers) {
            const printer = window.FleetState.printers.find(p => p.id === printerId);
            if (printer) {
                const modal = document.getElementById('printer-details-modal');
                const title = document.getElementById('modal-printer-title');
                const content = document.getElementById('modal-printer-content');
                
                if (modal && title && content) {
                    title.textContent = `${printer.name} - Detalles Completos`;
                    content.innerHTML = this.renderPrinterDetailContent(printer);
                    modal.classList.remove('hidden');
                }
            }
        }
    },

    // 📋 Renderizar contenido detallado de impresora
    renderPrinterDetailContent(printer) {
        const realtimeData = printer.realtime_data || {};
        
        return `
            <div class="space-y-6">
                <!-- Información básica -->
                <div class="bg-gray-50 rounded-xl p-4">
                    <h4 class="font-semibold text-gray-800 mb-3">Información Básica</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div><span class="font-medium">Modelo:</span> ${printer.model || 'N/A'}</div>
                        <div><span class="font-medium">IP:</span> ${printer.ip_address}</div>
                        <div><span class="font-medium">Estado:</span> ${printer.status}</div>
                        <div><span class="font-medium">Ubicación:</span> ${printer.location || 'No especificada'}</div>
                        <div><span class="font-medium">Capacidades:</span> ${printer.capabilities || 'No especificadas'}</div>
                        <div><span class="font-medium">ID:</span> ${printer.id}</div>
                    </div>
                </div>

                <!-- Datos en tiempo real -->
                <div class="bg-blue-50 rounded-xl p-4">
                    <h4 class="font-semibold text-blue-800 mb-3">Datos en Tiempo Real</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div><span class="font-medium">Progreso:</span> ${realtimeData.progress || 0}%</div>
                        <div><span class="font-medium">Hotend:</span> ${realtimeData.hotend_temp || 0}°C</div>
                        <div><span class="font-medium">Cama:</span> ${realtimeData.bed_temp || 0}°C</div>
                        <div><span class="font-medium">Archivo:</span> ${realtimeData.current_file || 'Ninguno'}</div>
                        <div><span class="font-medium">Tiempo estimado:</span> ${realtimeData.estimated_time || 'N/A'}</div>
                        <div><span class="font-medium">Última actualización:</span> ${new Date().toLocaleTimeString()}</div>
                    </div>
                </div>

                <!-- Comandos de control -->
                <div class="bg-purple-50 rounded-xl p-4">
                    <h4 class="font-semibold text-purple-800 mb-3">Comandos de Control</h4>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600" 
                                data-action="pause" data-printer-id="${printer.id}">
                            ⏸️ Pausar
                        </button>
                        <button class="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                data-action="resume" data-printer-id="${printer.id}">
                            ▶️ Reanudar
                        </button>
                        <button class="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                data-action="cancel" data-printer-id="${printer.id}">
                            ❌ Cancelar
                        </button>
                        <button class="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                data-action="home" data-printer-id="${printer.id}">
                            🏠 Home XYZ
                        </button>
                        <button class="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                                data-action="restart-klipper" data-printer-id="${printer.id}">
                            🔄 Host Restart
                        </button>
                        <button class="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                                data-action="restart-firmware" data-printer-id="${printer.id}">
                            ⚡ Firmware Restart
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // 👁️ Ocultar modal de detalles
    hidePrinterDetails() {
        const modal = document.getElementById('printer-details-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    // 🎯 Enviar comando a impresora individual
    async sendPrinterCommand(printerId, command, parameters = {}) {
        try {
            console.log(`🎯 Enviando comando ${command} a impresora ${printerId}`, parameters);
            
            // Construir el cuerpo de la petición
            const requestBody = {
                command: command,
                ...parameters
            };
            
            console.log('📤 Enviando petición a:', `/api/fleet/printers/${printerId}/command`);
            console.log('📤 Con datos:', requestBody);
            
            const response = await fetch(`/api/fleet/printers/${printerId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📥 Respuesta recibida:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error en respuesta:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Comando ejecutado exitosamente:', result);

            // Mostrar notificación de éxito
            this.showToast(`Comando ${command} ejecutado correctamente en ${printerId}`, 'success');

            // Forzar actualización de datos después de un breve delay
            setTimeout(() => {
                if (window.FleetData && window.FleetData.loadRealData) {
                    console.log('🔄 Actualizando datos después del comando...');
                    window.FleetData.loadRealData();
                }
            }, 1000);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error ejecutando comando:', error);
            this.showToast(`Error ejecutando comando ${command}: ${error.message}`, 'error');
            throw error;
        }
    },

    // 🗑️ Eliminar impresora
    async deletePrinter(printerId) {
        if (!confirm('¿Estás seguro de que deseas eliminar esta impresora?')) {
            return;
        }

        try {
            console.log(`🗑️ Eliminando impresora ${printerId}`);
            
            const response = await fetch(`/api/fleet/printers/${printerId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            console.log('✅ Impresora eliminada correctamente');
            this.showToast('Impresora eliminada correctamente', 'success');

            // Forzar actualización de datos
            setTimeout(() => {
                if (window.FleetData && window.FleetData.loadRealData) {
                    window.FleetData.loadRealData();
                }
            }, 500);
            
        } catch (error) {
            console.error('❌ Error eliminando impresora:', error);
            this.showToast(`Error eliminando impresora: ${error.message}`, 'error');
        }
    },

    // 📢 Mostrar notificación toast
    showToast(message, type = 'info') {
        // Usar el sistema de toast de FleetUI si está disponible
        if (window.FleetUI && window.FleetUI.showToast) {
            window.FleetUI.showToast(message, type);
            return;
        }

        // Fallback: crear toast simple
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Crear elemento toast
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        
        // Aplicar estilos según el tipo
        switch (type) {
            case 'success':
                toast.className += ' bg-green-500 text-white';
                break;
            case 'error':
                toast.className += ' bg-red-500 text-white';
                break;
            case 'warning':
                toast.className += ' bg-yellow-500 text-white';
                break;
            default:
                toast.className += ' bg-blue-500 text-white';
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Animación de entrada
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    },

    // 🧪 Función de prueba para verificar funcionamiento
    testRender() {
        console.log('🧪 Ejecutando test de renderizado...');
        const cardsContainer = document.getElementById('cards-view');
        
        if (!cardsContainer) {
            console.error('❌ No se encontró el contenedor de tarjetas');
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

console.log('🎴 Módulo FleetCards cargado');

// 🧪 Función global de debug para tarjetas
window.debugFleetCards = function() {
    console.log('🔍 DEBUG FleetCards:');
    console.log('- FleetCards disponible:', !!window.FleetCards);
    
    const elements = {
        cardsView: document.getElementById('cards-view'),
        tableView: document.getElementById('table-view'),
        cardsBtn: document.getElementById('cards-view-btn'),
        tableBtn: document.getElementById('table-view-btn')
    };
    
    console.log('- Elementos DOM:', elements);
    
    if (window.FleetState && window.FleetState.printers) {
        console.log('- Impresoras en estado:', window.FleetState.printers.length);
    } else {
        console.log('- No hay impresoras en estado');
    }
    
    if (elements.cardsView) {
        console.log('- Contenido actual de cards-view:', elements.cardsView.innerHTML.length, 'caracteres');
        console.log('- Clases de cards-view:', elements.cardsView.className);
    }
};
