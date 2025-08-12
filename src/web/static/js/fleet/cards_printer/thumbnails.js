// 🖼️ MÓDULO THUMBNAILS - Gestión de miniaturas y visualización de imágenes
// Manejo de la carga, visualización y gestión de thumbnails de archivos G-code

window.FleetCards = window.FleetCards || {};

window.FleetCards.Thumbnails = {
    // 🖼️ Mostrar thumbnail en tamaño completo
    showFullThumbnail(printerId, filename, thumbnailPath) {
        console.log('🖼️ Mostrando thumbnail completo:', filename, 'de impresora:', printerId);
        
        // Crear modal de imagen si no existe
        let imageModal = document.getElementById('thumbnail-modal');
        if (!imageModal) {
            imageModal = this.createThumbnailModal();
            document.body.appendChild(imageModal);
        }

        // Configurar contenido del modal
        const modalTitle = imageModal.querySelector('#thumbnail-modal-title');
        const modalImage = imageModal.querySelector('#thumbnail-modal-image');
        const modalInfo = imageModal.querySelector('#thumbnail-modal-info');
        
        if (modalTitle) {
            modalTitle.textContent = `Vista previa: ${filename}`;
        }
        
        if (modalImage) {
            // Usar la URL correcta para obtener la miniatura
            const imageUrl = `/api/fleet/printers/${printerId}/files/thumbnail/${encodeURIComponent(filename)}`;
            modalImage.src = imageUrl;
            modalImage.alt = `Vista previa de ${filename}`;
            
            // Manejar error de carga
            modalImage.onerror = () => {
                modalImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIGRpc3BvbmlibGU8L3RleHQ+PC9zdmc+';
            };
        }
        
        if (modalInfo) {
            modalInfo.innerHTML = `
                <div class="text-sm text-gray-600">
                    <div class="mb-2">
                        <span class="font-medium">📄 Archivo:</span> ${window.FleetCards.Utils.escapeHtml(filename)}
                    </div>
                    <div class="mb-2">
                        <span class="font-medium">🖨️ Impresora:</span> ${printerId}
                    </div>
                    <div class="text-xs text-gray-500">
                        💡 Haz clic fuera de la imagen para cerrar
                    </div>
                </div>
            `;
        }

        // Mostrar modal
        imageModal.classList.remove('hidden');
        imageModal.classList.add('flex');
        
        // Enfocar para poder cerrar con Escape
        imageModal.focus();
    },

    // 🏗️ Crear modal de visualización de thumbnail
    createThumbnailModal() {
        const modal = document.createElement('div');
        modal.id = 'thumbnail-modal';
        modal.className = 'hidden fixed inset-0 bg-black bg-opacity-75 z-50 items-center justify-center';
        modal.tabIndex = -1; // Para poder enfocar y usar teclado
        
        modal.innerHTML = `
            <div class="relative max-w-4xl max-h-full mx-4 my-8 flex flex-col">
                <!-- Header -->
                <div class="bg-white rounded-t-2xl px-6 py-4 border-b">
                    <div class="flex items-center justify-between">
                        <h3 id="thumbnail-modal-title" class="text-lg font-bold text-gray-900">🖼️ Vista previa</h3>
                        <button onclick="window.FleetCards.Thumbnails.hideThumbnailModal()" 
                                class="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
                                title="Cerrar (Esc)">
                            ❌
                        </button>
                    </div>
                </div>

                <!-- Image Content -->
                <div class="bg-white flex-1 flex items-center justify-center p-6 overflow-hidden">
                    <div class="relative">
                        <img id="thumbnail-modal-image" 
                             src="" 
                             alt="Vista previa"
                             class="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
                             style="min-width: 200px; min-height: 200px;">
                        
                        <!-- Loading indicator -->
                        <div id="thumbnail-loading" class="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                            <div class="flex items-center gap-2 text-gray-500">
                                <div class="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                                <span class="text-sm">Cargando imagen...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="bg-white rounded-b-2xl px-6 py-4 border-t">
                    <div id="thumbnail-modal-info" class="text-center">
                        <!-- Info will be populated dynamically -->
                    </div>
                </div>
            </div>
        `;
        
        // Agregar eventos
        modal.addEventListener('click', (e) => {
            // Cerrar al hacer clic fuera del contenido
            if (e.target === modal) {
                this.hideThumbnailModal();
            }
        });
        
        modal.addEventListener('keydown', (e) => {
            // Cerrar con Escape
            if (e.key === 'Escape') {
                this.hideThumbnailModal();
            }
        });
        
        // Manejar eventos de carga de imagen
        const image = modal.querySelector('#thumbnail-modal-image');
        const loading = modal.querySelector('#thumbnail-loading');
        
        if (image && loading) {
            image.addEventListener('load', () => {
                loading.style.display = 'none';
            });
            
            image.addEventListener('error', () => {
                loading.innerHTML = `
                    <div class="text-red-500 text-center">
                        <div class="text-2xl mb-2">⚠️</div>
                        <div class="text-sm">No se pudo cargar la imagen</div>
                    </div>
                `;
            });
            
            image.addEventListener('loadstart', () => {
                loading.style.display = 'flex';
            });
        }
        
        return modal;
    },

    // 👁️ Ocultar modal de thumbnail
    hideThumbnailModal() {
        const modal = document.getElementById('thumbnail-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            console.log('✅ Modal de thumbnail ocultado');
        }
    },

    // 🔄 Precargar thumbnails para mejorar rendimiento
    preloadThumbnails(files, printerId) {
        console.log('🔄 Precargando', files.length, 'thumbnails para impresora:', printerId);
        
        const thumbnailsToPreload = files.filter(file => file.thumbnail_path);
        
        if (thumbnailsToPreload.length === 0) {
            console.log('📭 No hay thumbnails para precargar');
            return;
        }

        console.log('🖼️ Precargando', thumbnailsToPreload.length, 'thumbnails...');
        
        thumbnailsToPreload.forEach(file => {
            const img = new Image();
            img.src = `/api/fleet/printers/${printerId}/files/thumbnail/${encodeURIComponent(file.name)}`;
            
            img.onload = () => {
                console.log('✅ Thumbnail precargado:', file.name);
            };
            
            img.onerror = () => {
                console.warn('⚠️ Error precargando thumbnail:', file.name);
            };
        });
    },

    // 🖼️ Generar placeholder para archivos sin thumbnail
    generatePlaceholderThumbnail(filename, size = 'w-12 h-12') {
        const extension = filename.split('.').pop()?.toLowerCase() || '';
        
        let icon = '📄';
        let bgColor = 'bg-gray-100';
        let textColor = 'text-gray-400';
        
        // Iconos específicos por tipo de archivo
        switch (extension) {
            case 'gcode':
            case 'g':
            case 'gco':
                icon = '🖨️';
                bgColor = 'bg-blue-100';
                textColor = 'text-blue-400';
                break;
            case 'stl':
                icon = '🗿';
                bgColor = 'bg-purple-100';
                textColor = 'text-purple-400';
                break;
            case 'obj':
                icon = '📐';
                bgColor = 'bg-green-100';
                textColor = 'text-green-400';
                break;
            default:
                icon = '📄';
                bgColor = 'bg-gray-100';
                textColor = 'text-gray-400';
        }
        
        return `
            <div class="${size} ${bgColor} rounded-lg flex items-center justify-center ${textColor}" title="${window.FleetCards.Utils.escapeHtml(filename)}">
                <span class="text-lg">${icon}</span>
            </div>
        `;
    },

    // 🖼️ Crear elemento de thumbnail con fallback
    createThumbnailElement(file, printerId, size = 'w-12 h-12', clickable = true) {
        const filename = file.name;
        const hasThumbnail = file.thumbnail_path;
        
        if (!hasThumbnail) {
            return this.generatePlaceholderThumbnail(filename, size);
        }
        
        const imageUrl = `/api/fleet/printers/${printerId}/files/thumbnail/${encodeURIComponent(filename)}`;
        const clickHandler = clickable ? `onclick="window.FleetCards.Thumbnails.showFullThumbnail('${printerId}', '${filename}', '${file.thumbnail_path}')"` : '';
        const cursorClass = clickable ? 'cursor-pointer' : '';
        
        return `
            <div class="group relative ${cursorClass}" ${clickHandler}>
                <img src="${imageUrl}" 
                     alt="Vista previa de ${window.FleetCards.Utils.escapeHtml(filename)}"
                     class="${size} object-cover rounded-lg border border-gray-200 group-hover:border-blue-300 transition-colors"
                     onerror="this.parentElement.innerHTML='${this.generatePlaceholderThumbnail(filename, size).replace(/'/g, '\\\'')}';">
                ${clickable ? `
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-opacity flex items-center justify-center">
                    <span class="text-white opacity-0 group-hover:opacity-100 text-xs">🔍</span>
                </div>
                ` : ''}
            </div>
        `;
    },

    // 📊 Obtener estadísticas de thumbnails
    getThumbnailStats(files) {
        const stats = {
            total: files.length,
            withThumbnails: 0,
            withoutThumbnails: 0,
            percentage: 0
        };
        
        files.forEach(file => {
            if (file.thumbnail_path) {
                stats.withThumbnails++;
            } else {
                stats.withoutThumbnails++;
            }
        });
        
        stats.percentage = stats.total > 0 ? (stats.withThumbnails / stats.total * 100).toFixed(1) : 0;
        
        return stats;
    },

    // 🧹 Limpiar cache de thumbnails (si implementamos cache en el futuro)
    clearThumbnailCache(printerId = null) {
        console.log('🧹 Limpiando cache de thumbnails' + (printerId ? ` para impresora: ${printerId}` : ''));
        
        // Nota: Esta función está preparada para futuras implementaciones de cache
        // Por ahora solo registra la acción
        
        if (window.FleetCards.Core) {
            window.FleetCards.Core.showToast('🧹 Cache de thumbnails limpiado', 'info');
        }
    },

    // 🔍 Buscar archivos por thumbnail disponible
    filterFilesByThumbnail(files, hasThumb = true) {
        return files.filter(file => {
            const hasThumbnail = Boolean(file.thumbnail_path);
            return hasThumb ? hasThumbnail : !hasThumbnail;
        });
    },

    // 📱 Adaptar tamaño de thumbnail según viewport
    getResponsiveThumbnailSize() {
        const width = window.innerWidth;
        
        if (width < 640) { // sm
            return 'w-10 h-10';
        } else if (width < 768) { // md
            return 'w-12 h-12';
        } else if (width < 1024) { // lg
            return 'w-14 h-14';
        } else { // xl and up
            return 'w-16 h-16';
        }
    },

    // 🧪 Función de prueba
    testThumbnails() {
        console.log('🧪 Ejecutando test de gestión de thumbnails...');
        
        // Test con datos de ejemplo
        const testFiles = [
            {
                name: 'model_with_thumb.gcode',
                thumbnail_path: '/path/to/thumb.jpg'
            },
            {
                name: 'model_without_thumb.gcode',
                thumbnail_path: null
            },
            {
                name: 'another_model.g',
                thumbnail_path: undefined
            }
        ];
        
        // Test estadísticas
        const stats = this.getThumbnailStats(testFiles);
        console.log('📊 Estadísticas de thumbnails:', stats);
        
        // Test filtros
        const withThumbs = this.filterFilesByThumbnail(testFiles, true);
        const withoutThumbs = this.filterFilesByThumbnail(testFiles, false);
        
        console.log('🖼️ Archivos con thumbnails:', withThumbs.length);
        console.log('📄 Archivos sin thumbnails:', withoutThumbs.length);
        
        // Test placeholders
        testFiles.forEach(file => {
            const placeholder = this.generatePlaceholderThumbnail(file.name);
            console.log(`📋 Placeholder para ${file.name}:`, placeholder);
        });
        
        console.log('✅ Test de thumbnails completado');
    }
};

console.log('🖼️ Módulo FleetCards.Thumbnails cargado');
