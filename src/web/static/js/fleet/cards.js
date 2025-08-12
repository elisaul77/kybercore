// 🎴 SISTEMA DE TARJETAS DE IMPRESORAS - KyberCore Fleet
// Manejo de la vista de tarjetas para gestión visual de la flota

window.FleetCards = {
    // Guardar el printerId actualmente mostrado en el modal
    currentModalPrinterId: null,
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

                // Si el modal está abierto, actualizar su contenido si corresponde
                if (this.currentModalPrinterId) {
                    const printer = printers.find(p => p.id === this.currentModalPrinterId);
                    const modal = document.getElementById('printer-details-modal');
                    const title = document.getElementById('modal-printer-title');
                    const content = document.getElementById('modal-printer-content');
                    if (printer && modal && title && content && !modal.classList.contains('hidden')) {
                        title.textContent = `${printer.name} - Detalles Completos`;
                        content.innerHTML = this.renderPrinterDetailContent(printer);
                        console.log('🔄 Modal de detalles actualizado automáticamente');
                    }
                }
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
        console.log('🎯 Configurando listeners de eventos para tarjetas...');
        
        // Event delegation para botones de tarjetas
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const printerId = button.dataset.printerId;
            
            console.log('🎯 Evento de click capturado:', { action, printerId, button });

            switch (action) {
                case 'view-details':
                    console.log('👁️ Acción: Ver detalles');
                    this.showPrinterDetails(printerId);
                    break;
                case 'pause':
                    console.log('⏸️ Acción: Pausar');
                    this.sendPrinterCommand(printerId, 'pause');
                    break;
                case 'resume':
                    console.log('▶️ Acción: Reanudar');
                    this.sendPrinterCommand(printerId, 'resume');
                    break;
                case 'cancel':
                    console.log('❌ Acción: Cancelar');
                    this.sendPrinterCommand(printerId, 'cancel');
                    break;
                case 'home':
                    console.log('🏠 Acción: Home');
                    this.sendPrinterCommand(printerId, 'home', { axis: 'XYZ' });
                    break;
                case 'restart-klipper':
                    console.log('🔄 Acción: Restart Klipper');
                    this.sendPrinterCommand(printerId, 'restart_klipper');
                    break;
                case 'restart-firmware':
                    console.log('⚡ Acción: Restart Firmware');
                    this.sendPrinterCommand(printerId, 'restart_firmware');
                    break;
                case 'delete':
                    console.log('🗑️ Acción: Eliminar');
                    this.deletePrinter(printerId);
                    break;
                default:
                    console.log('❓ Acción desconocida:', action);
            }
        });

        // Listener para cerrar modal de detalles
        const closeModal = document.getElementById('close-printer-modal');
        if (closeModal) {
            console.log('✅ Listener de cierre de modal configurado');
            closeModal.addEventListener('click', () => {
                console.log('❌ Cerrando modal de detalles');
                this.hidePrinterDetails();
            });
        } else {
            console.warn('⚠️ No se encontró el botón de cerrar modal');
        }

        // Cerrar modal al hacer clic fuera
        const modal = document.getElementById('printer-details-modal');
        if (modal) {
            console.log('✅ Listener de click fuera del modal configurado');
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('❌ Cerrando modal (click fuera)');
                    this.hidePrinterDetails();
                }
            });
        } else {
            console.warn('⚠️ No se encontró el modal de detalles');
        }
        
        console.log('✅ Listeners de eventos configurados');
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
                                    data-action="view-details" data-printer-id="${printer.id}"
                                    onclick="console.log('🔍 Click directo en botón Ver:', '${printer.id}');">
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

        // 📊 Obtener información de estado de la impresora
    getStatusInfo(status) {
        const statusMap = {
            'ready': { 
                label: 'Conectado', 
                icon: '✅', 
                bgClass: 'bg-green-500', 
                textClass: 'text-white',
                gradient: 'from-green-400 to-green-600'
            },
            'online': { 
                label: 'Conectado', 
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
            'shutdown': { 
                label: 'Apagado', 
                icon: '🔴', 
                bgClass: 'bg-red-600', 
                textClass: 'text-white',
                gradient: 'from-red-500 to-red-700'
            },
            'startup': { 
                label: 'Iniciando', 
                icon: '🔄', 
                bgClass: 'bg-orange-500', 
                textClass: 'text-white',
                gradient: 'from-orange-400 to-orange-600'
            },
            'offline': { 
                label: 'Desconectado', 
                icon: '❌', 
                bgClass: 'bg-gray-500', 
                textClass: 'text-white',
                gradient: 'from-gray-400 to-gray-600'
            },
            'unreachable': { 
                label: 'No Alcanzable', 
                icon: '📡', 
                bgClass: 'bg-red-400', 
                textClass: 'text-white',
                gradient: 'from-red-300 to-red-500'
            },
            'timeout': { 
                label: 'Sin Respuesta', 
                icon: '⏱️', 
                bgClass: 'bg-orange-400', 
                textClass: 'text-white',
                gradient: 'from-orange-300 to-orange-500'
            },
            'idle': { 
                label: 'Inactivo', 
                icon: '⏸', 
                bgClass: 'bg-gray-400', 
                textClass: 'text-white',
                gradient: 'from-gray-300 to-gray-500'
            },
            'standby': { 
                label: 'En Espera', 
                icon: '💤', 
                bgClass: 'bg-blue-400', 
                textClass: 'text-white',
                gradient: 'from-blue-300 to-blue-500'
            },
            'maintenance': {
                label: 'Mantenimiento',
                icon: '🛠️',
                bgClass: 'bg-indigo-500',
                textClass: 'text-white',
                gradient: 'from-indigo-400 to-indigo-600'
            },
            'updating': {
                label: 'Actualizando',
                icon: '⬆️',
                bgClass: 'bg-teal-500',
                textClass: 'text-white',
                gradient: 'from-teal-400 to-teal-600'
            },
            'disconnected': {
                label: 'Desconectado',
                icon: '🔌',
                bgClass: 'bg-gray-500',
                textClass: 'text-white',
                gradient: 'from-gray-400 to-gray-600'
            },
            'complete': {
                label: 'Completado',
                icon: '✅',
                bgClass: 'bg-green-600',
                textClass: 'text-white',
                gradient: 'from-green-500 to-green-700'
            },
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
            'ready': '✅ Impresora lista para trabajos',
            'online': '✅ Impresora lista para trabajos',
            'printing': '📈 Rendimiento óptimo detectado',
            'paused': '⚠️ Verificar motivo de pausa',
            'error': '🔧 Diagnóstico de falla requerido',
            'shutdown': '🔴 Impresora apagada - Encender Klipper',
            'startup': '🔄 Esperando inicialización completa',
            'offline': '🔌 Verificar conexión de red',
            'unreachable': '📡 Verificar IP y puerto en configuración',
            'timeout': '⏱️ Conexión lenta - Verificar red',
            'idle': '💡 Disponible para nuevo trabajo',
            'standby': '💤 Lista para activarse'
        };
        return recommendations[status] || '🤖 Analizando estado...';
    },

    // 👁️ Mostrar detalles completos de impresora
    showPrinterDetails(printerId) {
        // Guardar el printerId mostrado en el modal
        this.currentModalPrinterId = printerId;
        console.log('👁️ Mostrando detalles para impresora:', printerId);
        
        let printer = null;
        
        // Buscar la impresora en múltiples fuentes de datos
        if (window.FleetState && window.FleetState.printers) {
            printer = window.FleetState.printers.find(p => p.id === printerId);
            console.log('🔍 Buscando en FleetState.printers:', !!printer);
        }
        
        if (!printer && window.FleetData && window.FleetData.printers) {
            printer = window.FleetData.printers.find(p => p.id === printerId);
            console.log('🔍 Buscando en FleetData.printers:', !!printer);
        }
        
        if (!printer && window.fleetPrinters) {
            printer = window.fleetPrinters.find(p => p.id === printerId);
            console.log('🔍 Buscando en fleetPrinters global:', !!printer);
        }
        
        // Última opción: buscar en el contenedor de tarjetas usando el DOM
        if (!printer) {
            console.log('🔍 Intentando obtener datos del DOM...');
            const cardElement = document.querySelector(`[data-printer-id="${printerId}"]`);
            if (cardElement) {
                console.log('📋 Elemento de tarjeta encontrado en DOM');
                // Hacer petición directa a la API para obtener los datos
                this.fetchPrinterDataAndShowModal(printerId);
                return;
            }
        }
        
        console.log('🔍 Impresora encontrada:', printer);
        
        if (printer) {
            const modal = document.getElementById('printer-details-modal');
            const title = document.getElementById('modal-printer-title');
            const content = document.getElementById('modal-printer-content');
            
            console.log('📋 Elementos del modal:', { modal: !!modal, title: !!title, content: !!content });
            
            if (modal && title && content) {
                title.textContent = `${printer.name} - Detalles Completos`;
                content.innerHTML = this.renderPrinterDetailContent(printer);
                modal.classList.remove('hidden');
                console.log('✅ Modal abierto correctamente');
                
                // Cargar archivos G-code automáticamente después de abrir el modal
                setTimeout(() => {
                    this.loadPrinterGcodeFiles(printerId);
                }, 100);
            } else {
                console.error('❌ No se encontraron elementos del modal');
            }
        } else {
            console.error('❌ No se encontró la impresora con ID:', printerId);
            console.log('🔍 Fuentes de datos disponibles:', {
                FleetState: window.FleetState,
                FleetData: window.FleetData,
                fleetPrinters: window.fleetPrinters
            });
            
            // Última opción: hacer petición a la API
            this.fetchPrinterDataAndShowModal(printerId);
        }
    },

    // 🌐 Obtener datos de impresora directamente de la API
    async fetchPrinterDataAndShowModal(printerId) {
        console.log('🌐 Obteniendo datos de impresora desde API:', printerId);
        
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const printer = await response.json();
            console.log('✅ Datos de impresora obtenidos desde API:', printer);
            
            const modal = document.getElementById('printer-details-modal');
            const title = document.getElementById('modal-printer-title');
            const content = document.getElementById('modal-printer-content');
            
            if (modal && title && content) {
                title.textContent = `${printer.name} - Detalles Completos`;
                content.innerHTML = this.renderPrinterDetailContent(printer);
                modal.classList.remove('hidden');
                console.log('✅ Modal abierto correctamente con datos de API');
                
                // Cargar archivos G-code automáticamente después de abrir el modal
                setTimeout(() => {
                    this.loadPrinterGcodeFiles(printerId);
                }, 100);
            }
            
        } catch (error) {
            console.error('❌ Error obteniendo datos de impresora:', error);
            this.showToast(`Error obteniendo detalles de la impresora: ${error.message}`, 'error');
        }
    },

    // 📋 Renderizar contenido detallado de impresora
    renderPrinterDetailContent(printer) {
        const realtimeData = printer.realtime_data || {};
        const statusInfo = this.getStatusInfo(printer.status);
        
        return `
            <div class="space-y-6">
                <!-- Información básica -->
                <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-3xl">🖨️</div>
                        <div>
                            <h4 class="text-xl font-bold text-blue-900">${printer.name}</h4>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgClass} ${statusInfo.textClass}">
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
                                <span class="text-2xl font-bold ${this.getTempClass(realtimeData.extruder_temp || 0)} text-orange-700">
                                    ${realtimeData.extruder_temp || 0}°C
                                </span>
                            </div>
                            <div class="text-sm text-gray-600">
                                <div>Objetivo: <span class="font-medium">${realtimeData.extruder_target || 0}°C</span></div>
                                ${realtimeData.extruder_power !== undefined ? `<div>Potencia: <span class="font-medium">${(realtimeData.extruder_power * 100).toFixed(1)}%</span></div>` : ''}
                                ${realtimeData.can_extrude !== undefined ? `<div>Puede extruir: <span class="font-medium ${realtimeData.can_extrude ? 'text-green-600' : 'text-red-600'}">${realtimeData.can_extrude ? 'Sí' : 'No'}</span></div>` : ''}
                            </div>
                        </div>
                        
                        <!-- Cama caliente -->
                        <div class="bg-white rounded-lg p-4 border border-orange-200">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-semibold text-orange-800">🛏️ Cama Caliente</span>
                                <span class="text-2xl font-bold ${this.getTempClass(realtimeData.bed_temp || 0)} text-orange-700">
                                    ${realtimeData.bed_temp || 0}°C
                                </span>
                            </div>
                            <div class="text-sm text-gray-600">
                                <div>Objetivo: <span class="font-medium">${realtimeData.bed_target || 0}°C</span></div>
                                ${realtimeData.bed_power !== undefined ? `<div>Potencia: <span class="font-medium">${(realtimeData.bed_power * 100).toFixed(1)}%</span></div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Estado de Impresión -->
                ${realtimeData.print_state ? `
                <div class="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="text-2xl">📄</div>
                        <h4 class="text-lg font-bold text-purple-900">Estado de Impresión</h4>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div class="space-y-2">
                            <div><span class="font-semibold text-purple-800">Estado:</span> 
                                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${this.getStatusInfo(realtimeData.print_state).bgClass} ${this.getStatusInfo(realtimeData.print_state).textClass}">
                                    ${this.getStatusInfo(realtimeData.print_state).icon} ${realtimeData.print_state}
                                </span>
                            </div>
                            <div><span class="font-semibold text-purple-800">Archivo:</span> <span class="text-purple-700 font-mono text-xs">${realtimeData.print_filename || 'Ninguno'}</span></div>
                            <div><span class="font-semibold text-purple-800">Progreso:</span> 
                                <div class="mt-1">
                                    <div class="w-full bg-purple-200 rounded-full h-2">
                                        <div class="h-2 bg-purple-500 rounded-full transition-all duration-300" style="width: ${(realtimeData.print_progress || 0) }%"></div>
                                    </div>
                                    <span class="text-xs text-purple-600 mt-1">${((realtimeData.print_progress || 0) ).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-2">
                            ${realtimeData.total_duration !== undefined ? `<div><span class="font-semibold text-purple-800">Duración Total:</span> <span class="text-purple-700">${Math.floor(realtimeData.total_duration / 60)}m ${Math.floor(realtimeData.total_duration % 60)}s</span></div>` : ''}
                            ${realtimeData.print_duration !== undefined ? `<div><span class="font-semibold text-purple-800">Duración Impresión:</span> <span class="text-purple-700">${Math.floor(realtimeData.print_duration / 60)}m ${Math.floor(realtimeData.print_duration % 60)}s</span></div>` : ''}
                            ${realtimeData.filament_used !== undefined ? `<div><span class="font-semibold text-purple-800">Filamento Usado:</span> <span class="text-purple-700">${realtimeData.filament_used.toFixed(2)}mm</span></div>` : ''}
                            ${realtimeData.file_position !== undefined && realtimeData.file_size !== undefined ? `<div><span class="font-semibold text-purple-800">Posición:</span> <span class="text-purple-700">${(realtimeData.file_position / 1024 / 1024).toFixed(2)}MB / ${(realtimeData.file_size / 1024 / 1024).toFixed(2)}MB</span></div>` : ''}
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
                                onclick="window.FleetCards.showFileUploadDialog('${printer.id}')">
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

    // 👁️ Ocultar modal de detalles
    hidePrinterDetails() {
        const modal = document.getElementById('printer-details-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        // Limpiar el printerId mostrado
        this.currentModalPrinterId = null;
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
    },

    // 🧪 Función de prueba específica para el modal
    testModal() {
        console.log('🧪 Probando modal...');
        
        // Crear datos de prueba
        const testPrinter = {
            id: "test-printer",
            name: "Impresora de Prueba",
            model: "Test Model",
            ip_address: "192.168.1.100",
            status: "ready",
            location: "Laboratorio de pruebas",
            capabilities: ["print", "pause", "resume"],
            realtime_data: {
                state: "ready",
                state_message: "Printer is ready for testing",
                hostname: "test-pi",
                software_version: "v0.12.0-test",
                extruder_temp: 25.5,
                extruder_target: 0,
                bed_temp: 23.2,
                bed_target: 0,
                print_state: "standby",
                print_filename: "",
                print_progress: 0
            }
        };
        
        // Simular que hay datos disponibles
        if (!window.FleetState) {
            window.FleetState = {};
        }
        window.FleetState.printers = [testPrinter];
        
        // Mostrar el modal
        this.showPrinterDetails("test-printer");
        
        console.log('✅ Test de modal ejecutado');
    },

    // === GESTIÓN DE ARCHIVOS G-CODE ===

    async loadPrinterGcodeFiles(printerId) {
        // Carga y muestra los archivos G-code de una impresora específica
        console.log('📁 Cargando archivos G-code para impresora:', printerId);
        
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/files`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📁 Respuesta de archivos G-code:', data);
            
            // Manejar diferentes estructuras de respuesta
            let files = [];
            if (data.files && data.files.result && Array.isArray(data.files.result)) {
                files = data.files.result;
            } else if (data.files && Array.isArray(data.files)) {
                files = data.files;
            } else if (data.result && Array.isArray(data.result)) {
                files = data.result;
            } else if (Array.isArray(data)) {
                files = data;
            } else {
                console.warn('⚠️ Estructura de respuesta no reconocida:', data);
                files = [];
            }
            
            console.log('📁 Archivos procesados:', files.length, 'archivos encontrados');
            console.log('📁 Primeros 3 archivos:', files.slice(0, 3));
            this.renderGcodeFilesList(printerId, files);
            
        } catch (error) {
            console.error('❌ Error cargando archivos G-code:', error);
            this.renderGcodeFilesError(printerId, error.message);
        }
    },

    renderGcodeFilesList(printerId, files) {
        // Renderiza la lista de archivos G-code en el modal
        const container = document.getElementById(`gcode-files-${printerId}`);
        if (!container) return;
        
        // Validar que files sea un array
        if (!Array.isArray(files)) {
            console.warn('⚠️ files no es un array:', files);
            files = [];
        }
        
        console.log('📁 Renderizando lista de archivos:', files.length, 'archivos');
        console.log('📁 Muestra de archivos:', files.slice(0, 2));
        
        if (files.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    📭 No hay archivos G-code disponibles
                </div>
            `;
            return;
        }
        
        const filesHTML = files.map(file => {
            // Manejar diferentes estructuras de archivo
            const fileName = file.path || file.filename || file.name || 'archivo.gcode';
            const fileSize = file.size || file.filesize || 0;
            const fileModified = file.modified || file.mod_time || Date.now() / 1000;
            
            const sizeFormatted = this.formatFileSize(fileSize);
            const dateFormatted = new Date(fileModified * 1000).toLocaleString();
            
            return `
                <div class="bg-white rounded-lg p-3 border border-emerald-200 mb-2">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="font-medium text-emerald-900 truncate">${fileName}</div>
                            <div class="text-xs text-gray-600">
                                📏 ${sizeFormatted} • 📅 ${dateFormatted}
                            </div>
                        </div>
                        <div class="flex gap-1 ml-2">
                            <button class="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                    onclick="window.FleetCards.startGcodePrint('${printerId}', '${fileName}')"
                                    title="Iniciar impresión">
                                ▶️
                            </button>
                            <button class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                                    onclick="window.FleetCards.showGcodeMetadata('${printerId}', '${fileName}')"
                                    title="Ver detalles">
                                ℹ️
                            </button>
                            <button class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                                    onclick="window.FleetCards.deleteGcodeFile('${printerId}', '${fileName}')"
                                    title="Eliminar archivo">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <div class="max-h-64 overflow-y-auto">
                ${filesHTML}
            </div>
            <div class="text-xs text-emerald-600 mt-2">
                📊 Total: ${files.length} archivo${files.length !== 1 ? 's' : ''}
            </div>
        `;
        
        console.log(`✅ Lista de archivos renderizada: ${files.length} archivos`);
    },

    renderGcodeFilesError(printerId, errorMessage) {
        // Renderiza un mensaje de error para la carga de archivos
        const container = document.getElementById(`gcode-files-${printerId}`);
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center py-4 text-red-500">
                ❌ Error cargando archivos: ${errorMessage}
                <br>
                <button class="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                        onclick="window.FleetCards.loadPrinterGcodeFiles('${printerId}')">
                    🔄 Reintentar
                </button>
            </div>
        `;
    },

    showFileUploadDialog(printerId) {
        // Muestra el diálogo para subir archivos G-code
        console.log('📤 Mostrando diálogo de subida para:', printerId);
        
        // Crear elemento de input file
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.gcode,.g,.gco';
        fileInput.multiple = false;
        
        fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            // Preguntar si quiere iniciar impresión automáticamente
            const startPrint = confirm(`¿Deseas iniciar la impresión de "${file.name}" automáticamente después de subirlo?`);
            
            await this.uploadGcodeFile(printerId, file, startPrint);
        };
        
        fileInput.click();
    },

    async uploadGcodeFile(printerId, file, startPrint = false) {
        // Sube un archivo G-code a la impresora
        console.log('📤 Subiendo archivo:', file.name, 'a impresora:', printerId);
        
        try {
            // Mostrar progreso
            this.showToast(`Subiendo ${file.name}...`, 'info');
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('start_print', startPrint);
            
            const response = await fetch(`/api/fleet/printers/${printerId}/files/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Archivo subido exitosamente:', result);
            
            if (startPrint) {
                this.showToast(`Archivo subido e impresión iniciada: ${file.name}`, 'success');
            } else {
                this.showToast(`Archivo subido exitosamente: ${file.name}`, 'success');
            }
            
            // Recargar lista de archivos
            this.loadPrinterGcodeFiles(printerId);
            
        } catch (error) {
            console.error('❌ Error subiendo archivo:', error);
            this.showToast(`Error subiendo archivo: ${error.message}`, 'error');
        }
    },

    async startGcodePrint(printerId, filename) {
        // Inicia la impresión de un archivo G-code específico
        if (!confirm(`¿Estás seguro de que deseas iniciar la impresión de "${filename}"?`)) {
            return;
        }
        
        console.log('▶️ Iniciando impresión:', filename, 'en impresora:', printerId);
        
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/files/${encodeURIComponent(filename)}/print`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Impresión iniciada:', result);
            
            if (result.success) {
                this.showToast(`Impresión iniciada: ${filename}`, 'success');
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
            
        } catch (error) {
            console.error('❌ Error iniciando impresión:', error);
            this.showToast(`Error iniciando impresión: ${error.message}`, 'error');
        }
    },

    async deleteGcodeFile(printerId, filename) {
        // Elimina un archivo G-code de la impresora
        if (!confirm(`¿Estás seguro de que deseas eliminar "${filename}"? Esta acción no se puede deshacer.`)) {
            return;
        }
        
        console.log('🗑️ Eliminando archivo:', filename, 'de impresora:', printerId);
        
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/files/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Archivo eliminado:', result);
            
            this.showToast(`Archivo eliminado: ${filename}`, 'success');
            
            // Recargar lista de archivos
            this.loadPrinterGcodeFiles(printerId);
            
        } catch (error) {
            console.error('❌ Error eliminando archivo:', error);
            this.showToast(`Error eliminando archivo: ${error.message}`, 'error');
        }
    },

    async showGcodeMetadata(printerId, filename) {
        // Muestra los metadatos de un archivo G-code en un modal
        console.log('ℹ️ Mostrando metadatos de:', filename);
        
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/files/${encodeURIComponent(filename)}/metadata`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const metadata = data.metadata;
            
            // Crear modal de metadatos
            const metadataHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="this.remove()">
                    <div class="bg-white rounded-xl max-w-2xl max-h-96 overflow-y-auto p-6 m-4" onclick="event.stopPropagation()">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-bold text-gray-900">📄 Metadatos: ${filename}</h3>
                            <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">✕</button>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            ${metadata.slicer ? `<div><span class="font-semibold">Slicer:</span> ${metadata.slicer}</div>` : ''}
                            ${metadata.estimated_time ? `<div><span class="font-semibold">Tiempo estimado:</span> ${Math.floor(metadata.estimated_time / 3600)}h ${Math.floor((metadata.estimated_time % 3600) / 60)}m</div>` : ''}
                            ${metadata.filament_total ? `<div><span class="font-semibold">Filamento:</span> ${metadata.filament_total.toFixed(2)}mm</div>` : ''}
                            ${metadata.layer_height ? `<div><span class="font-semibold">Altura de capa:</span> ${metadata.layer_height}mm</div>` : ''}
                            ${metadata.first_layer_extr_temp ? `<div><span class="font-semibold">Temp. extrusor:</span> ${metadata.first_layer_extr_temp}°C</div>` : ''}
                            ${metadata.first_layer_bed_temp ? `<div><span class="font-semibold">Temp. cama:</span> ${metadata.first_layer_bed_temp}°C</div>` : ''}
                        </div>
                        
                        <div class="mt-4 flex gap-2">
                            <button class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                    onclick="window.FleetCards.startGcodePrint('${printerId}', '${filename}'); this.closest('.fixed').remove();">
                                ▶️ Iniciar Impresión
                            </button>
                            <button class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                    onclick="this.closest('.fixed').remove()">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', metadataHTML);
            
        } catch (error) {
            console.error('❌ Error obteniendo metadatos:', error);
            this.showToast(`Error obteniendo metadatos: ${error.message}`, 'error');
        }
    },

    formatFileSize(bytes) {
        // Formatea el tamaño de archivo en formato legible
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        tableBtn: document.getElementById('table-view-btn'),
        modal: document.getElementById('printer-details-modal'),
        modalTitle: document.getElementById('modal-printer-title'),
        modalContent: document.getElementById('modal-printer-content'),
        closeModal: document.getElementById('close-printer-modal')
    };
    
    console.log('- Elementos DOM:', elements);
    
    if (window.FleetState && window.FleetState.printers) {
        console.log('- Impresoras en estado:', window.FleetState.printers.length);
        window.FleetState.printers.forEach((printer, i) => {
            console.log(`  ${i + 1}. ${printer.name} (${printer.id}) - ${printer.status}`);
        });
    } else {
        console.log('- No hay impresoras en estado');
    }
    
    if (elements.cardsView) {
        console.log('- Contenido actual de cards-view:', elements.cardsView.innerHTML.length, 'caracteres');
        console.log('- Clases de cards-view:', elements.cardsView.className);
    }
    
    console.log('💡 Para probar el modal manualmente, ejecuta: window.FleetCards.testModal()');
};
