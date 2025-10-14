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
    
    // 🎴 Exponer funciones del sistema de tarjetas globalmente
    if (window.FleetCards) {
        // Funciones principales para botones de tarjetas
        window.showPrinterDetails = function(printerId) {
            console.log('🔍 Mostrando detalles de impresora:', printerId);
            if (window.FleetCards.showPrinterDetails) {
                return window.FleetCards.showPrinterDetails(printerId);
            } else {
                console.error('❌ FleetCards.showPrinterDetails no disponible');
            }
        };
        
        window.hidePrinterDetails = function() {
            console.log('❌ Ocultando detalles de impresora');
            if (window.FleetCards.hidePrinterDetails) {
                return window.FleetCards.hidePrinterDetails();
            } else {
                console.error('❌ FleetCards.hidePrinterDetails no disponible');
            }
        };
        
        // Funciones de comandos para tarjetas
        window.pausePrint = function(printerId) {
            console.log('⏸️ Pausando impresión:', printerId);
            if (window.FleetCards.sendPrinterCommand) {
                return window.FleetCards.sendPrinterCommand(printerId, 'pause');
            } else {
                console.error('❌ FleetCards.sendPrinterCommand no disponible');
            }
        };
        
        window.resumePrint = function(printerId) {
            console.log('▶️ Reanudando impresión:', printerId);
            if (window.FleetCards.sendPrinterCommand) {
                return window.FleetCards.sendPrinterCommand(printerId, 'resume');
            } else {
                console.error('❌ FleetCards.sendPrinterCommand no disponible');
            }
        };
        
        window.cancelPrint = function(printerId) {
            console.log('❌ Cancelando impresión:', printerId);
            if (window.FleetCards.sendPrinterCommand) {
                return window.FleetCards.sendPrinterCommand(printerId, 'cancel');
            } else {
                console.error('❌ FleetCards.sendPrinterCommand no disponible');
            }
        };
        
        window.homeAxes = function(printerId, axis = 'xyz') {
            console.log('🏠 Home de ejes:', printerId, axis);
            if (window.FleetCards.sendPrinterCommand) {
                return window.FleetCards.sendPrinterCommand(printerId, 'home', { axis });
            } else {
                console.error('❌ FleetCards.sendPrinterCommand no disponible');
            }
        };
        
        window.restartKlipper = function(printerId) {
            console.log('🔄 Reiniciando Klipper:', printerId);
            if (window.FleetCards.sendPrinterCommand) {
                return window.FleetCards.sendPrinterCommand(printerId, 'restart_klipper');
            } else {
                console.error('❌ FleetCards.sendPrinterCommand no disponible');
            }
        };
        
        window.restartFirmware = function(printerId) {
            console.log('⚡ Reiniciando firmware:', printerId);
            if (window.FleetCards.sendPrinterCommand) {
                return window.FleetCards.sendPrinterCommand(printerId, 'restart_firmware');
            } else {
                console.error('❌ FleetCards.sendPrinterCommand no disponible');
            }
        };
        
        // Funciones de archivos G-code
        window.startGcodePrint = function(printerId, filename) {
            console.log('🖨️ Iniciando impresión:', printerId, filename);
            if (window.FleetCards.startGcodePrint) {
                return window.FleetCards.startGcodePrint(printerId, filename);
            } else {
                console.error('❌ FleetCards.startGcodePrint no disponible');
            }
        };
        
        window.deleteGcodeFile = function(printerId, filename) {
            console.log('🗑️ Eliminando archivo:', printerId, filename);
            if (window.FleetCards.deleteGcodeFile) {
                return window.FleetCards.deleteGcodeFile(printerId, filename);
            } else {
                console.error('❌ FleetCards.deleteGcodeFile no disponible');
            }
        };
        
        window.showFileUploadDialog = function(printerId) {
            console.log('📁 Mostrando diálogo de subida:', printerId);
            if (window.FleetCards.showFileUploadDialog) {
                return window.FleetCards.showFileUploadDialog(printerId);
            } else {
                console.error('❌ FleetCards.showFileUploadDialog no disponible');
            }
        };
        
        window.showGcodeThumbnails = function(printerId, filename) {
            console.log('🖼️ Mostrando thumbnails:', printerId, filename);
            if (window.FleetCards.showGcodeThumbnails) {
                return window.FleetCards.showGcodeThumbnails(printerId, filename);
            } else {
                console.error('❌ FleetCards.showGcodeThumbnails no disponible');
            }
        };
        
        // Función para eliminar impresora desde tarjetas
        window.deleteFleetPrinter = function(printerId) {
            console.log('🗑️ Eliminando impresora desde tarjeta:', printerId);
            if (window.FleetCards.deletePrinter) {
                return window.FleetCards.deletePrinter(printerId);
            } else {
                console.error('❌ FleetCards.deletePrinter no disponible');
            }
        };
        
        // 🆕 Función para editar impresora desde tarjetas
        window.FleetCards.editPrinter = async function(printerId) {
            console.log('✏️ Editando impresora:', printerId);
            
            try {
                // Obtener datos actualizados de la impresora desde el API
                const response = await fetch(`/api/fleet/printers/${printerId}`);
                if (!response.ok) {
                    throw new Error('No se pudo obtener la impresora');
                }
                
                const printer = await response.json();
                console.log('📦 Datos de impresora obtenidos:', printer);
                
                // Mostrar modal de edición
                window.FleetForms.showEditPrinterModal(printer);
            } catch (error) {
                console.error('❌ Error obteniendo impresora:', error);
                alert('Error: No se pudo cargar la información de la impresora');
            }
        };
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
            const cardsInitResult = window.FleetCards.init();
            
            // Después de inicializar las tarjetas, asegurar que las funciones globales estén disponibles
            if (cardsInitResult) {
                console.log('🔗 Exponiendo funciones globales de tarjetas...');
                
                // Re-exponer funciones globales después de la inicialización exitosa
                window.showPrinterDetails = function(printerId) {
                    console.log('🔍 Mostrando detalles de impresora:', printerId);
                    return window.FleetCards.showPrinterDetails(printerId);
                };
                
                window.hidePrinterDetails = function() {
                    console.log('❌ Ocultando detalles de impresora');
                    return window.FleetCards.hidePrinterDetails();
                };
                
                window.pausePrint = function(printerId) {
                    console.log('⏸️ Pausando impresión:', printerId);
                    return window.FleetCards.sendPrinterCommand(printerId, 'pause');
                };
                
                window.resumePrint = function(printerId) {
                    console.log('▶️ Reanudando impresión:', printerId);
                    return window.FleetCards.sendPrinterCommand(printerId, 'resume');
                };
                
                window.cancelPrint = function(printerId) {
                    console.log('❌ Cancelando impresión:', printerId);
                    return window.FleetCards.sendPrinterCommand(printerId, 'cancel');
                };
                
                window.homeAxes = function(printerId, axis = 'xyz') {
                    console.log('🏠 Home de ejes:', printerId, axis);
                    return window.FleetCards.sendPrinterCommand(printerId, 'home', { axis });
                };
                
                window.restartKlipper = function(printerId) {
                    console.log('🔄 Reiniciando Klipper:', printerId);
                    return window.FleetCards.sendPrinterCommand(printerId, 'restart_klipper');
                };
                
                window.restartFirmware = function(printerId) {
                    console.log('⚡ Reiniciando firmware:', printerId);
                    return window.FleetCards.sendPrinterCommand(printerId, 'restart_firmware');
                };
                
                window.startGcodePrint = function(printerId, filename) {
                    console.log('🖨️ Iniciando impresión:', printerId, filename);
                    return window.FleetCards.startGcodePrint(printerId, filename);
                };
                
                window.deleteGcodeFile = function(printerId, filename) {
                    console.log('🗑️ Eliminando archivo:', printerId, filename);
                    return window.FleetCards.deleteGcodeFile(printerId, filename);
                };
                
                window.showFileUploadDialog = function(printerId) {
                    console.log('📁 Mostrando diálogo de subida:', printerId);
                    return window.FleetCards.showFileUploadDialog(printerId);
                };
                
                window.showGcodeThumbnails = function(printerId, filename) {
                    console.log('🖼️ Mostrando thumbnails:', printerId, filename);
                    return window.FleetCards.showGcodeThumbnails(printerId, filename);
                };
                
                window.deleteFleetPrinter = function(printerId) {
                    console.log('🗑️ Eliminando impresora desde tarjeta:', printerId);
                    return window.FleetCards.deletePrinter(printerId);
                };
                
                console.log('✅ Funciones globales de tarjetas expuestas correctamente');
            } else {
                console.error('❌ Error al inicializar sistema de tarjetas');
            }
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
            window.FleetEventBus.on('printersUpdated', (printers) => {
                console.log('📣 Event printersUpdated recibido en integrador de flota');
                // Actualizar selección masiva
                if (window.FleetBulkCommands) {
                    try {
                        // Revalidar init para asegurar que los listeners se adjunten
                        if (typeof window.FleetBulkCommands.init === 'function') {
                            window.FleetBulkCommands.init();
                        }

                        if (typeof window.FleetBulkCommands.updatePrinterSelection === 'function') {
                            window.FleetBulkCommands.updatePrinterSelection();
                        }
                    } catch (e) {
                        console.error('Error actualizando FleetBulkCommands tras printersUpdated:', e);
                    }
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
        
        // 7. Test automático de tarjetas después de 2 segundos (DESHABILITADO)
        // setTimeout(() => {
        //     console.log('🧪 Ejecutando test automático de tarjetas...');
        //     if (window.debugFleetCards) {
        //         window.debugFleetCards();
        //     }
        // }, 2000);
        
        console.log('💡 Para debug manual, ejecuta: debugFleetCards() en la consola');
        
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
