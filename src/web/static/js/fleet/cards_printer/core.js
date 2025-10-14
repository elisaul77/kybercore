// 🎯 MÓDULO CORE - Funcionalidades básicas de inicialización y configuración
// Manejo de inicialización, eventos y configuración de vista

window.FleetCards = window.FleetCards || {};

window.FleetCards.Core = {
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
                console.log('🔄 Evento printersUpdated recibido:', printers.length, 'impresoras');
                if (window.FleetCards.Renderer) {
                    window.FleetCards.Renderer.renderCards(printers);
                    
                    // Si hay un modal abierto, actualizarlo selectivamente
                    if (this.currentModalPrinterId) {
                        const currentPrinter = printers.find(p => p.id === this.currentModalPrinterId);
                        if (currentPrinter && window.FleetCards.Renderer.updateModalContentSelectively) {
                            window.FleetCards.Renderer.updateModalContentSelectively(currentPrinter);
                        }
                    }
                }
            });
        }
        
        // Verificar si ya hay datos disponibles
        if (window.FleetState && window.FleetState.printers) {
            const printers = window.FleetState.printers;
            console.log('🎴 Datos de impresoras disponibles al inicializar:', printers.length);
            if (printers.length > 0 && window.FleetCards.Renderer) {
                window.FleetCards.Renderer.renderCards(printers);
            }
        }
        
        console.log('✅ Sistema de tarjetas inicializado correctamente');
        return true;
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
                console.log('👆 Cambiando a vista de tarjetas');
                cardsView.style.display = 'grid';
                tableView.style.display = 'none';
                cardsViewBtn.classList.add('bg-blue-500', 'text-white');
                cardsViewBtn.classList.remove('bg-gray-200', 'text-gray-700');
                tableViewBtn.classList.remove('bg-blue-500', 'text-white');
                tableViewBtn.classList.add('bg-gray-200', 'text-gray-700');
            });

            tableViewBtn.addEventListener('click', () => {
                console.log('👆 Cambiando a vista de tabla');
                cardsView.style.display = 'none';
                tableView.style.display = 'block';
                tableViewBtn.classList.add('bg-blue-500', 'text-white');
                tableViewBtn.classList.remove('bg-gray-200', 'text-gray-700');
                cardsViewBtn.classList.remove('bg-blue-500', 'text-white');
                cardsViewBtn.classList.add('bg-gray-200', 'text-gray-700');
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
            const printerId = button.dataset.printerId; // data-printer-id → printerId
            
            console.log('🎯 Evento de click capturado:', { action, printerId, button, dataset: button.dataset });

            switch (action) {
                case 'show-details':
                    if (window.FleetCards.Renderer) {
                        window.FleetCards.Renderer.showPrinterDetails(printerId);
                    }
                    break;
                case 'edit':
                    // Usar la función editPrinter del módulo FleetCards
                    if (window.FleetCards && window.FleetCards.editPrinter) {
                        window.FleetCards.editPrinter(printerId);
                    } else {
                        console.error('❌ Método editPrinter no disponible');
                    }
                    break;
                case 'pause':
                    if (window.FleetCards.Commands && window.FleetCards.Commands.pausePrint) {
                        window.FleetCards.Commands.pausePrint(printerId);
                    }
                    break;
                case 'resume':
                    if (window.FleetCards.Commands && window.FleetCards.Commands.resumePrint) {
                        window.FleetCards.Commands.resumePrint(printerId);
                    }
                    break;
                case 'cancel':
                    if (window.FleetCards.Commands && window.FleetCards.Commands.cancelPrint) {
                        window.FleetCards.Commands.cancelPrint(printerId);
                    }
                    break;
                case 'home':
                    if (window.FleetCards.Commands && window.FleetCards.Commands.homeAxes) {
                        window.FleetCards.Commands.homeAxes(printerId, 'xyz');
                    }
                    break;
                case 'restart-klipper':
                    if (window.FleetCards.Commands && window.FleetCards.Commands.restartKlipper) {
                        window.FleetCards.Commands.restartKlipper(printerId);
                    }
                    break;
                case 'restart-firmware':
                    if (window.FleetCards.Commands && window.FleetCards.Commands.restartFirmware) {
                        window.FleetCards.Commands.restartFirmware(printerId);
                    }
                    break;
                case 'delete':
                    // Usar el método deletePrinter del integrador principal
                    if (window.FleetCards && window.FleetCards.deletePrinter) {
                        window.FleetCards.deletePrinter(printerId);
                    } else if (window.deleteFleetPrinter) {
                        window.deleteFleetPrinter(printerId);
                    } else {
                        console.error('❌ Método deletePrinter no disponible');
                    }
                    break;
                case 'edit':
                    console.log('✏️ Editando impresora:', printerId);
                    if (window.FleetCards && window.FleetCards.editPrinter) {
                        window.FleetCards.editPrinter(printerId);
                    } else {
                        console.error('❌ Método editPrinter no disponible');
                    }
                    break;
                default:
                    console.warn('🤷 Acción no reconocida:', action);
            }
        });

        // Listener para cerrar modal de detalles
        const closeModal = document.getElementById('close-printer-modal');
        if (closeModal) {
            console.log('✅ Listener de cierre de modal configurado');
            closeModal.addEventListener('click', () => {
                if (window.FleetCards.Renderer) {
                    window.FleetCards.Renderer.hidePrinterDetails();
                }
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
                    if (window.FleetCards.Renderer) {
                        window.FleetCards.Renderer.hidePrinterDetails();
                    }
                }
            });
        } else {
            console.warn('⚠️ No se encontró el modal de detalles');
        }
        
        console.log('✅ Listeners de eventos configurados');
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
                toast.classList.add('bg-green-500', 'text-white');
                break;
            case 'error':
                toast.classList.add('bg-red-500', 'text-white');
                break;
            case 'warning':
                toast.classList.add('bg-yellow-500', 'text-white');
                break;
            default:
                toast.classList.add('bg-blue-500', 'text-white');
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Animación de entrada
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
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
        if (window.FleetCards.Renderer) {
            window.FleetCards.Renderer.showPrinterDetails("test-printer");
        }
        
        console.log('✅ Test de modal ejecutado');
    },

    // 🔄 Cargar datos de la flota desde el sistema principal
    async loadFleetData() {
        console.log('🔄 Cargando datos de la flota...');
        
        try {
            // Intentar usar el sistema principal de datos
            if (window.FleetData && window.FleetData.loadRealData) {
                return await window.FleetData.loadRealData();
            }
            
            // Fallback: cargar directamente desde la API
            const response = await fetch('/api/fleet/printers');
            if (!response.ok) {
                throw new Error('Error al cargar datos de impresoras: ' + response.status);
            }
            
            const data = await response.json();
            const printers = data.printers || [];
            
            // Actualizar estado global si existe
            if (window.FleetState) {
                window.FleetState.printers = printers;
            }
            
            // Renderizar tarjetas si hay datos
            if (printers.length > 0 && window.FleetCards.Renderer) {
                window.FleetCards.Renderer.renderCards(printers);
            }
            
            console.log('✅ Datos de flota cargados:', printers.length, 'impresoras');
            return true;
            
        } catch (error) {
            console.error('❌ Error cargando datos de la flota:', error);
            if (this.showToast) {
                this.showToast('❌ Error cargando datos de impresoras', 'error');
            }
            return false;
        }
    }
};

console.log('🎯 Módulo FleetCards.Core cargado');
