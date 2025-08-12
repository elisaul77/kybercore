// 🛠️ MÓDULO UTILS - Utilidades y helpers
// Funciones de utilidad para escape de texto, formateo y validaciones

window.FleetCards = window.FleetCards || {};

window.FleetCards.Utils = {
    // 🌈 Escapar caracteres especiales para uso seguro en HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 🔒 Escapar caracteres especiales para uso seguro en JavaScript strings
    escapeJavaScript(text) {
        return text.replace(/\\/g, '\\\\')
                  .replace(/'/g, "\\'")
                  .replace(/"/g, '\\"')
                  .replace(/\n/g, '\\n')
                  .replace(/\r/g, '\\r')
                  .replace(/\t/g, '\\t');
    },

    // 🆔 Crear un ID seguro para uso en atributos HTML
    createSafeId(text) {
        return btoa(encodeURIComponent(text)).replace(/[^a-zA-Z0-9]/g, '');
    },

    // 📏 Formatear el tamaño de archivo en formato legible
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // 📅 Formatear fecha en formato legible
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            if (diffMinutes < 1) {
                return 'Hace un momento';
            } else if (diffMinutes < 60) {
                return `Hace ${diffMinutes} min`;
            } else if (diffHours < 24) {
                return `Hace ${diffHours}h`;
            } else if (diffDays < 7) {
                return `Hace ${diffDays} días`;
            } else {
                return date.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        } catch (error) {
            console.warn('Error formateando fecha:', dateString, error);
            return 'Fecha inválida';
        }
    },

    // ⏱️ Formatear duración en formato legible
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0s';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
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
        if (temp < 40) return 'temp-cool';
        if (temp < 200) return 'temp-warm';
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

    // 🔍 Validar si una impresora está en estado válido
    isValidPrinter(printer) {
        return printer && 
               typeof printer === 'object' && 
               printer.id && 
               printer.name;
    },

    // 🔄 Obtener progreso de impresión normalizado
    getPrintProgress(printer) {
        if (!printer || !printer.realtime_data) return 0;
        
        const realtimeData = printer.realtime_data;
        return realtimeData.print_progress || realtimeData.progress || 0;
    },

    // 🌡️ Obtener temperaturas normalizadas
    getTemperatures(printer) {
        if (!printer || !printer.realtime_data) {
            return {
                extruder: { current: 0, target: 0 },
                bed: { current: 0, target: 0 }
            };
        }
        
        const realtimeData = printer.realtime_data;
        return {
            extruder: {
                current: realtimeData.extruder_temp || realtimeData.hotend_temp || 0,
                target: realtimeData.extruder_target || 0
            },
            bed: {
                current: realtimeData.bed_temp || 0,
                target: realtimeData.bed_target || 0
            }
        };
    },

    // 🔗 Generar URL segura para API
    buildApiUrl(endpoint, params = {}) {
        let url = `/api/fleet/${endpoint}`;
        
        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += `?${queryString}`;
        }
        
        return url;
    },

    // 🧪 Función de debug para imprimir información de una impresora
    debugPrinter(printer) {
        console.group(`🖨️ Debug Printer: ${printer.name || 'Unknown'}`);
        console.log('📋 Información básica:', {
            id: printer.id,
            name: printer.name,
            status: printer.status,
            model: printer.model,
            ip: printer.ip_address || printer.ip
        });
        
        if (printer.realtime_data) {
            console.log('📊 Datos en tiempo real:', printer.realtime_data);
            console.log('🌡️ Temperaturas:', this.getTemperatures(printer));
            console.log('📈 Progreso:', this.getPrintProgress(printer) + '%');
        }
        
        console.log('✅ Estado:', this.getStatusInfo(printer.status));
        console.log('🤖 Recomendación IA:', this.getAIRecommendation(printer));
        console.groupEnd();
    }
};

console.log('🛠️ Módulo FleetCards.Utils cargado');
