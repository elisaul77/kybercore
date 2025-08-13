// 🖼️ MÓDULO THUMBNAILS - Gestión de miniaturas y visualización de imágenes
// Manejo de la carga, visualización y gestión de thumbnails de archivos G-code

window.FleetCards = window.FleetCards || {};

window.FleetCards.Thumbnails = {
    // 🖼️ Cargar y mostrar thumbnail pequeño en el elemento especificado
    async loadAndShowThumbnail(printerId, filename, thumbnailElement) {
        console.log('🖼️ Cargando thumbnail para:', filename);
        
        // Mostrar indicador de carga
        thumbnailElement.innerHTML = '<div class="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>';
        
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/files/${encodeURIComponent(filename)}/thumbnails`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('🖼️ Thumbnails recibidos:', data);
            
            // Manejar la estructura de thumbnails (puede ser un objeto o array)
            let thumbnailsArray = [];
            if (data.thumbnails) {
                if (Array.isArray(data.thumbnails)) {
                    thumbnailsArray = data.thumbnails;
                } else if (typeof data.thumbnails === 'object') {
                    // Convertir objeto a array
                    thumbnailsArray = Object.values(data.thumbnails);
                }
            }
            
            if (thumbnailsArray.length > 0) {
                // Usar el primer thumbnail disponible (generalmente el más pequeño)
                const thumbnail = thumbnailsArray[0];
                const imgSrc = `data:image/png;base64,${thumbnail.data}`;
                
                thumbnailElement.innerHTML = `
                    <img src="${imgSrc}" 
                         class="w-full h-full object-cover rounded" 
                         alt="Vista previa"
                         title="${thumbnail.width}x${thumbnail.height}">
                `;
                
                console.log('✅ Thumbnail cargado:', `${thumbnail.width}x${thumbnail.height}`);
            } else {
                thumbnailElement.innerHTML = '<span class="text-gray-400 text-xs">❌</span>';
                thumbnailElement.title = 'Sin vista previa disponible';
            }
            
        } catch (error) {
            console.error('❌ Error cargando thumbnail:', error);
            thumbnailElement.innerHTML = '<span class="text-red-400 text-xs">❌</span>';
            thumbnailElement.title = `Error: ${error.message}`;
        }
    },

    // 🖼️ Mostrar todos los thumbnails disponibles en un modal
    async showFullThumbnail(printerId, filename) {
        console.log('🖼️ Mostrando thumbnails completos para:', filename);
        
        // Validar parámetros
        if (!filename || filename === 'undefined') {
            console.error('❌ Filename no válido:', filename);
            window.FleetCards.Core.showToast('Error: nombre de archivo no válido', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/files/${encodeURIComponent(filename)}/thumbnails`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('🖼️ Thumbnails recibidos completos:', data);
            
            // Manejar la estructura de thumbnails (puede ser un objeto o array)
            let thumbnailsArray = [];
            if (data.thumbnails) {
                if (Array.isArray(data.thumbnails)) {
                    thumbnailsArray = data.thumbnails;
                } else if (typeof data.thumbnails === 'object') {
                    // Convertir objeto a array
                    thumbnailsArray = Object.values(data.thumbnails);
                }
            }
            
            if (thumbnailsArray.length === 0) {
                window.FleetCards.Core.showToast('No hay vistas previas disponibles para este archivo', 'info');
                return;
            }
            
            // Crear modal de thumbnails
            const thumbnailsHTML = thumbnailsArray.map((thumbnail, index) => {
                const dataUrl = `data:image/png;base64,${thumbnail.data}`;
                
                return `
                    <div class="bg-white rounded-lg p-4 border border-gray-200">
                        <div class="text-center mb-2 font-medium">Vista previa ${index + 1}</div>
                        <div class="mb-2 flex justify-center">
                            <img src="${dataUrl}" 
                                 class="max-w-full max-h-48 object-contain rounded border" 
                                 alt="Vista previa ${index + 1}">
                        </div>
                        <div class="text-xs text-gray-600 text-center">
                            ${thumbnail.width}×${thumbnail.height} • ${window.FleetCards.Utils.formatFileSize(thumbnail.size || 0)}
                        </div>
                    </div>
                `;
            }).join('');
            
            const modalHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="this.remove()">
                    <div class="bg-white rounded-xl max-w-4xl max-h-96 overflow-y-auto p-6 m-4" onclick="event.stopPropagation()">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-bold text-gray-900">🖼️ Vistas Previas: ${window.FleetCards.Utils.escapeHtml(filename)}</h3>
                            <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">✕</button>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${thumbnailsHTML}
                        </div>
                        
                        <div class="mt-4 pt-4 border-t text-center">
                            <button onclick="this.closest('.fixed').remove()" 
                                    class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Mostrar modal
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
        } catch (error) {
            console.error('❌ Error cargando thumbnails:', error);
            window.FleetCards.Core.showToast(`Error cargando vistas previas: ${error.message}`, 'error');
        }
    }
};

console.log('🖼️ Módulo Thumbnails cargado correctamente');
