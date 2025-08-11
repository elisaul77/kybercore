// 🚀 INTEGRADOR PRINCIPAL DE FLOTA - KyberCore
// Este archivo actúa como orquestador principal que coordina todos los módulos especializados
// Los módulos individuales se cargan desde la carpeta /fleet/ según la arquitectura de KyberCore

/**
 * Inicializador principal del sistema de gestión de flota
 * Coordina la inicialización de todos los módulos cargados desde fleet/
 */
window.initFleetModule = async function() {
    console.log('🚀 Iniciando sistema modular de gestión de flota KyberCore...');
    
    // Verificar que los módulos especializados estén cargados
    const requiredModules = [
        'FleetState', 'FleetUI', 'FleetData', 'FleetTable', 'FleetCards',
        'FleetCommands', 'FleetForms', 'FleetMessageHandler', 'FleetCommunication', 'FleetBulkCommands'
    ];
    
    const missingModules = requiredModules.filter(module => !window[module]);
    if (missingModules.length > 0) {
        console.error('❌ Módulos faltantes:', missingModules);
        console.log('ℹ️ Los módulos deben cargarse desde la carpeta fleet/ en el HTML');
        return false;
    }
    
    console.log('✅ Todos los módulos están cargados:', requiredModules);
    
    // Función pública para detener actualizaciones
    window.stopFleetUpdates = function() {
        console.log('🛑 Deteniendo sistema de comunicación optimizado');
        if (window.FleetCommunication && window.FleetCommunication.stopOptimizedCommunication) {
            window.FleetCommunication.stopOptimizedCommunication();
        }
    };
    
    // Exponer funciones globales para compatibilidad con onclick en HTML
    if (window.FleetCommands) {
        window.deletePrinter = window.FleetCommands.deletePrinter;
        window.homePrinter = window.FleetCommands.homePrinter;
        window.pausePrinter = window.FleetCommands.pausePrinter;
        window.resumePrinter = window.FleetCommands.resumePrinter;
        window.cancelPrinter = window.FleetCommands.cancelPrinter;
    }
    
    // Verificar disponibilidad de elementos DOM críticos
    const tbody = document.getElementById('fleet-printers');
    console.log('🔍 tbody disponible:', !!tbody);
    
    if (!tbody) {
        console.error('❌ ERROR: No se encontró tbody');
        if (window.FleetUI && window.FleetUI.updateStatus) {
            window.FleetUI.updateStatus('Error: Tabla de impresoras no encontrada', 'error');
        }
        return false;
    }
    
    // Mostrar mensaje de inicialización
    tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4">🔄 Iniciando sistema modular KyberCore...</td></tr>';
    if (window.FleetUI && window.FleetUI.updateStatus) {
        window.FleetUI.updateStatus('Iniciando sistema modular...', 'loading');
    }
    
    // Inicializar módulos en orden de dependencia
    try {
        // 1. Inicializar formularios
        if (window.FleetForms && window.FleetForms.initAddPrinterForm) {
            console.log('🔧 Inicializando formularios...');
            window.FleetForms.initAddPrinterForm();
        }
        
        // 2. Inicializar sistema de tarjetas
        if (window.FleetCards && window.FleetCards.init) {
            console.log('🎴 Inicializando sistema de tarjetas...');
            window.FleetCards.init();
        }
        
        // 3. Inicializar comandos masivos (después de un breve delay para permitir carga de datos)
        setTimeout(() => {
            if (window.FleetBulkCommands && window.FleetBulkCommands.init) {
                console.log('🎛️ Inicializando comandos masivos...');
                window.FleetBulkCommands.init();
            }
        }, 100);
        
        // 4. Configurar listeners para sincronización entre módulos
        if (window.FleetEventBus) {
            // Cuando se actualicen los datos de impresoras, actualizar selección masiva
            window.FleetEventBus.on('printersUpdated', () => {
                if (window.FleetBulkCommands && window.FleetBulkCommands.updatePrinterSelection) {
                    window.FleetBulkCommands.updatePrinterSelection();
                }
            });
        }
        
        // 5. Activar sistema de comunicación después de un breve delay
        setTimeout(() => {
            console.log('🔗 Iniciando sistema de comunicación...');
            if (window.FleetCommunication && window.FleetCommunication.startOptimizedCommunication) {
                window.FleetCommunication.startOptimizedCommunication();
            } else if (window.FleetData && window.FleetData.loadRealData) {
                // Fallback si no hay FleetCommunication modular
                console.log('🔄 Usando fallback para cargar datos...');
                window.FleetData.loadRealData();
            }
        }, 500);
        
        // 6. Configurar botón de actualización forzada
        const forceUpdateBtn = document.getElementById('force-update-btn');
        if (forceUpdateBtn) {
            forceUpdateBtn.addEventListener('click', () => {
                console.log('🔄 Actualización forzada solicitada por el usuario');
                if (window.FleetCommunication && window.FleetCommunication.forceUpdate) {
                    window.FleetCommunication.forceUpdate();
                } else if (window.FleetData && window.FleetData.loadRealData) {
                    window.FleetData.loadRealData();
                }
            });
        }
        
        // 7. Test automático de tarjetas después de 2 segundos
        setTimeout(() => {
            console.log('🧪 Ejecutando test automático de tarjetas...');
            if (window.debugFleetCards) {
                window.debugFleetCards();
            }
        }, 2000);
        
        console.log('✅ Sistema modular de flota inicializado correctamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error durante la inicialización:', error);
        if (window.FleetUI && window.FleetUI.updateStatus) {
            window.FleetUI.updateStatus('Error de inicialización', 'error');
        }
        return false;
    }
};

/**
 * Configuración global del sistema de flota
 * Define constantes y configuraciones compartidas entre módulos
 */
window.FleetConfig = {
    // Configuración de WebSocket
    websocket: {
        maxReconnectAttempts: 5,
        reconnectInterval: 3000,
        pingInterval: 30000
    },
    
    // Configuración de UI
    ui: {
        updateDebounceMs: 100,
        statusUpdateTimeout: 5000
    },
    
    // Configuración de datos
    data: {
        temperatureThreshold: 0.5,
        progressThreshold: 1.0
    }
};

/**
 * Sistema de eventos para comunicación entre módulos
 * Permite que los módulos se comuniquen sin dependencias directas
 */
window.FleetEventBus = {
    events: {},
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    },
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error en event listener para ${event}:`, error);
                }
            });
        }
    },
    
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
};
