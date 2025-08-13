// 🎴 SISTEMA DE TARJETAS DE IMPRESORAS - KyberCore Fleet
// Manejo de la vista de tarjetas para gestión visual de la flota
// Este es el archivo principal que integra todos los módulos modulares

// Inicializar el namespace principal si no existe
window.FleetCards = window.FleetCards || {};

// 🔧 Inicialización del sistema de tarjetas integrado
window.FleetCards.init = function() {
    console.log('🎴 Inicializando sistema de tarjetas modular...');
    
    // Verificar que todos los módulos estén cargados
    const requiredModules = ['Core', 'Utils', 'Renderer', 'GcodeFiles', 'Thumbnails', 'Commands'];
    const missingModules = requiredModules.filter(module => !window.FleetCards[module]);
    
    if (missingModules.length > 0) {
        console.error('❌ Módulos faltantes:', missingModules);
        console.error('⚠️ Asegúrate de que todos los archivos de módulos estén cargados antes de cards.js');
        return false;
    }
    
    console.log('✅ Todos los módulos requeridos están disponibles');
    
    // Inicializar el módulo core que maneja la lógica principal
    if (window.FleetCards.Core && window.FleetCards.Core.init) {
        return window.FleetCards.Core.init();
    } else {
        console.error('❌ Módulo Core no disponible o sin método init()');
        return false;
    }
};

// 🔄 Método para renderizar tarjetas (delegado al módulo Renderer)
window.FleetCards.renderCards = function(printers) {
    if (window.FleetCards.Renderer && window.FleetCards.Renderer.renderCards) {
        return window.FleetCards.Renderer.renderCards(printers);
    } else {
        console.error('❌ Módulo Renderer no disponible');
    }
};

// 👁️ Método para mostrar detalles (delegado al módulo Renderer)
window.FleetCards.showPrinterDetails = function(printerId) {
    if (window.FleetCards.Renderer && window.FleetCards.Renderer.showPrinterDetails) {
        return window.FleetCards.Renderer.showPrinterDetails(printerId);
    } else {
        console.error('❌ Módulo Renderer no disponible');
    }
};

// 👁️ Método para ocultar detalles (delegado al módulo Renderer)
window.FleetCards.hidePrinterDetails = function() {
    if (window.FleetCards.Renderer && window.FleetCards.Renderer.hidePrinterDetails) {
        return window.FleetCards.Renderer.hidePrinterDetails();
    } else {
        console.error('❌ Módulo Renderer no disponible');
    }
};

// 🎮 Método para comandos de impresora (delegado al módulo Commands)
window.FleetCards.sendPrinterCommand = function(printerId, command, options) {
    options = options || {};
    
    if (!window.FleetCards.Commands) {
        console.error('❌ Módulo Commands no disponible');
        return;
    }

    const commandMap = {
        'pause': () => window.FleetCards.Commands.pausePrint(printerId),
        'resume': () => window.FleetCards.Commands.resumePrint(printerId),
        'cancel': () => window.FleetCards.Commands.cancelPrint(printerId),
        'home': () => window.FleetCards.Commands.homeAxes(printerId, options.axis || 'xyz'),
        'restart_klipper': () => window.FleetCards.Commands.restartKlipper(printerId),
        'restart_firmware': () => window.FleetCards.Commands.restartFirmware(printerId),
        'emergency_stop': () => window.FleetCards.Commands.emergencyStop(printerId)
    };

    const commandFunction = commandMap[command];
    if (commandFunction) {
        return commandFunction();
    } else {
        console.error('❌ Comando desconocido:', command);
    }
};

// 🗑️ Método para eliminar impresora
window.FleetCards.deletePrinter = async function(printerId) {
    console.log('🗑️ Eliminando impresora:', printerId);
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta impresora? Esta acción no se puede deshacer.')) {
        console.log('❌ Eliminación cancelada por el usuario');
        return;
    }

    try {
        const response = await fetch('/api/fleet/printers/' + printerId, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(errorData.error || 'HTTP ' + response.status + ': ' + response.statusText);
        }

        console.log('✅ Impresora eliminada correctamente');
        
        if (window.FleetCards.Core && window.FleetCards.Core.showToast) {
            window.FleetCards.Core.showToast('✅ Impresora eliminada correctamente', 'success');
        }

        // Recargar datos de la flota
        if (window.FleetCards.Core && window.FleetCards.Core.loadFleetData) {
            setTimeout(() => {
                window.FleetCards.Core.loadFleetData();
            }, 1000);
        }

    } catch (error) {
        console.error('❌ Error eliminando impresora:', error);
        if (window.FleetCards.Core && window.FleetCards.Core.showToast) {
            window.FleetCards.Core.showToast('❌ Error eliminando impresora: ' + error.message, 'error');
        }
    }
};

// 📁 Métodos de archivos G-code (delegados al módulo GcodeFiles)
window.FleetCards.loadPrinterGcodeFiles = function(printerId) {
    if (window.FleetCards.GcodeFiles && window.FleetCards.GcodeFiles.loadPrinterGcodeFiles) {
        return window.FleetCards.GcodeFiles.loadPrinterGcodeFiles(printerId);
    } else {
        console.error('❌ Módulo GcodeFiles no disponible');
    }
};

window.FleetCards.showFileUploadDialog = function(printerId) {
    if (window.FleetCards.GcodeFiles && window.FleetCards.GcodeFiles.showFileUploadDialog) {
        return window.FleetCards.GcodeFiles.showFileUploadDialog(printerId);
    } else {
        console.error('❌ Módulo GcodeFiles no disponible');
    }
};

window.FleetCards.startGcodePrint = function(printerId, filename) {
    if (window.FleetCards.GcodeFiles && window.FleetCards.GcodeFiles.startPrint) {
        return window.FleetCards.GcodeFiles.startPrint(printerId, filename);
    } else {
        console.error('❌ Módulo GcodeFiles no disponible');
    }
};

window.FleetCards.deleteGcodeFile = function(printerId, filename) {
    if (window.FleetCards.GcodeFiles && window.FleetCards.GcodeFiles.deleteFile) {
        return window.FleetCards.GcodeFiles.deleteFile(printerId, filename);
    } else {
        console.error('❌ Módulo GcodeFiles no disponible');
    }
};

// 🖼️ Métodos de thumbnails (delegados al módulo Thumbnails)
window.FleetCards.showGcodeThumbnails = function(printerId, filename) {
    if (window.FleetCards.Thumbnails && window.FleetCards.Thumbnails.showFullThumbnail) {
        return window.FleetCards.Thumbnails.showFullThumbnail(printerId, filename);
    } else {
        console.error('❌ Módulo Thumbnails no disponible');
    }
};

// 🛠️ Métodos de utilidad (delegados al módulo Utils)
window.FleetCards.getStatusInfo = function(status) {
    if (window.FleetCards.Utils && window.FleetCards.Utils.getStatusInfo) {
        return window.FleetCards.Utils.getStatusInfo(status);
    } else {
        console.error('❌ Módulo Utils no disponible');
        return { label: 'Desconocido', icon: '❓', bgClass: 'bg-gray-500', textClass: 'text-white', gradient: 'from-gray-400 to-gray-600' };
    }
};

window.FleetCards.getTempClass = function(temp) {
    if (window.FleetCards.Utils && window.FleetCards.Utils.getTempClass) {
        return window.FleetCards.Utils.getTempClass(temp);
    } else {
        console.error('❌ Módulo Utils no disponible');
        return 'temp-normal';
    }
};

window.FleetCards.getAIRecommendation = function(printer) {
    if (window.FleetCards.Utils && window.FleetCards.Utils.getAIRecommendation) {
        return window.FleetCards.Utils.getAIRecommendation(printer);
    } else {
        console.error('❌ Módulo Utils no disponible');
        return '🤖 Módulo de análisis IA no disponible';
    }
};

window.FleetCards.escapeHtml = function(text) {
    if (window.FleetCards.Utils && window.FleetCards.Utils.escapeHtml) {
        return window.FleetCards.Utils.escapeHtml(text);
    } else {
        // Fallback básico
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.FleetCards.formatFileSize = function(bytes) {
    if (window.FleetCards.Utils && window.FleetCards.Utils.formatFileSize) {
        return window.FleetCards.Utils.formatFileSize(bytes);
    } else {
        // Fallback básico
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// 🍞 Método de notificación (delegado al módulo Core)
window.FleetCards.showToast = function(message, type) {
    type = type || 'info';
    
    if (window.FleetCards.Core && window.FleetCards.Core.showToast) {
        return window.FleetCards.Core.showToast(message, type);
    } else {
        // Fallback básico
        console.log('[' + type.toUpperCase() + '] ' + message);
        alert(message);
    }
};

// 🧪 Funciones de debug y testing
window.FleetCards.testRender = function() {
    console.log('🧪 Ejecutando test de renderizado modular...');
    
    if (window.FleetCards.Renderer && window.FleetCards.Renderer.testRender) {
        return window.FleetCards.Renderer.testRender();
    } else {
        console.error('❌ Módulo Renderer no disponible para testing');
    }
};

window.FleetCards.testAllModules = function() {
    console.log('🧪 Ejecutando tests de todos los módulos...');
    
    const modules = ['Core', 'Utils', 'Renderer', 'GcodeFiles', 'Thumbnails', 'Commands'];
    const results = {};
    
    modules.forEach(moduleName => {
        const module = window.FleetCards[moduleName];
        if (module) {
            console.log('✅ Módulo ' + moduleName + ': disponible');
            
            // Ejecutar test si está disponible
            const testMethodName = 'test' + moduleName.replace(/([A-Z])/g, '$1').replace(/^test/, '');
            if (typeof module[testMethodName] === 'function') {
                try {
                    module[testMethodName]();
                    results[moduleName] = 'test passed';
                } catch (error) {
                    console.error('❌ Error en test de ' + moduleName + ':', error);
                    results[moduleName] = 'test failed';
                }
            } else {
                results[moduleName] = 'no test available';
            }
        } else {
            console.error('❌ Módulo ' + moduleName + ': no disponible');
            results[moduleName] = 'not available';
        }
    });
    
    console.log('📊 Resultados de tests:', results);
    return results;
};

// 🔍 Función global de debug mejorada
window.debugFleetCards = function() {
    console.log('🔍 DEBUG FleetCards Modular:');
    console.log('- FleetCards disponible:', !!window.FleetCards);
    
    // Verificar módulos
    const modules = ['Core', 'Utils', 'Renderer', 'GcodeFiles', 'Thumbnails', 'Commands'];
    console.log('- Módulos:');
    modules.forEach(moduleName => {
        const module = window.FleetCards[moduleName];
        console.log('  ' + moduleName + ': ' + (module ? '✅ disponible' : '❌ no disponible'));
    });
    
    // Verificar elementos DOM
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
    
    console.log('- Elementos DOM:');
    Object.keys(elements).forEach(key => {
        console.log('  ' + key + ': ' + (elements[key] ? '✅ encontrado' : '❌ no encontrado'));
    });
    
    // Verificar datos de impresoras
    if (window.FleetState && window.FleetState.printers) {
        console.log('- Impresoras en estado:', window.FleetState.printers.length);
        window.FleetState.printers.forEach((printer, i) => {
            console.log('  ' + (i + 1) + '. ' + printer.name + ' (' + printer.id + ') - ' + printer.status);
        });
    } else {
        console.log('- No hay impresoras en estado');
    }
    
    // Información del contenedor de tarjetas
    if (elements.cardsView) {
        console.log('- Contenido actual de cards-view:', elements.cardsView.innerHTML.length, 'caracteres');
        console.log('- Clases de cards-view:', elements.cardsView.className);
    }
    
    console.log('💡 Comandos útiles:');
    console.log('  - window.FleetCards.testAllModules() - Probar todos los módulos');
    console.log('  - window.FleetCards.testRender() - Probar renderizado');
    console.log('  - window.FleetCards.init() - Reinicializar sistema');
};

console.log('🎴 Sistema de tarjetas modular cargado');
console.log('💡 Ejecuta window.debugFleetCards() para información de debug');

// 🔍 Diagnóstico automático después de cargar
setTimeout(() => {
    console.log('🩺 DIAGNÓSTICO AUTOMÁTICO DEL SISTEMA DE TARJETAS:');
    console.log('- window.FleetCards:', !!window.FleetCards);
    
    if (window.FleetCards) {
        const modules = ['Core', 'Utils', 'Renderer', 'GcodeFiles', 'Thumbnails', 'Commands'];
        modules.forEach(module => {
            console.log(`- ${module}:`, !!window.FleetCards[module]);
        });
    }
    
    // Verificar funciones globales
    const globalFunctions = ['showPrinterDetails', 'pausePrint', 'resumePrint', 'cancelPrint'];
    globalFunctions.forEach(func => {
        console.log(`- ${func}:`, !!window[func]);
    });
    
    // Verificar elementos DOM
    const elements = ['cards-view', 'table-view', 'printer-details-modal'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`- #${id}:`, !!element);
    });
    
    console.log('📝 Para test completo ejecuta: window.debugFleetCards()');
}, 2000);
