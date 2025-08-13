// 📁 MÓDULO GCODE FILES - Gestión de archivos G-code
// Manejo de carga, subida, eliminación e inicio de impresiones

window.FleetCards = window.FleetCards || {};

window.FleetCards.GcodeFiles = {
    // 📁 Cargar archivos G-code de una impresora
    async loadPrinterGcodeFiles(printerId) {
        console.log('📁 Cargando archivos G-code para impresora:', printerId);
        
        const container = document.getElementById(`gcode-files-${printerId}`);
        if (!container) {
            console.warn('⚠️ No se encontró contenedor de archivos para:', printerId);
            return;
        }

        // Mostrar loading
        container.innerHTML = `
            <div class="flex items-center justify-center py-4 text-gray-500">
                <div class="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full mr-2"></div>
                Cargando archivos...
            </div>
        `;

        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/files`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📄 Respuesta de archivos G-code:', data);

            // Manejar diferentes estructuras de respuesta (como en la versión backup)
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

            // Ordenar los archivos por fecha de modificación en orden descendente (más recientes primero)
            files.sort((a, b) => {
                // Obtener timestamps de modificación, manejando diferentes formatos
                let dateA = a.modified || a.mod_time || a.mtime || a.date || 0;
                let dateB = b.modified || b.mod_time || b.mtime || b.date || 0;
                
                // Si son strings de fecha, convertir a timestamp
                if (typeof dateA === 'string') {
                    dateA = new Date(dateA).getTime() / 1000; // Convertir a timestamp Unix
                }
                if (typeof dateB === 'string') {
                    dateB = new Date(dateB).getTime() / 1000; // Convertir a timestamp Unix
                }
                
                return dateB - dateA; // Orden descendente (más recientes primero)
            });

            // Renderizar lista de archivos
            if (files && files.length > 0) {
                container.innerHTML = this.renderGcodeFilesList(files, printerId);
            } else {
                container.innerHTML = `
                    <div class="text-center py-6 text-gray-500">
                        <div class="text-4xl mb-2">📭</div>
                        <p class="text-sm">No hay archivos G-code</p>
                        <p class="text-xs text-gray-400 mt-1">Sube tu primer archivo para comenzar</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('❌ Error cargando archivos G-code:', error);
            container.innerHTML = `
                <div class="text-center py-4 text-red-500">
                    <div class="text-2xl mb-2">⚠️</div>
                    <p class="text-sm">Error cargando archivos</p>
                    <p class="text-xs">${error.message}</p>
                    <button class="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs"
                            onclick="window.FleetCards.GcodeFiles.loadPrinterGcodeFiles('${printerId}')">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        }
    },

    // 📋 Renderizar lista de archivos G-code
    renderGcodeFilesList(files, printerId) {
        console.log('📋 Renderizando', files.length, 'archivos para impresora:', printerId);
        
        const html = `
            <div class="space-y-2 max-h-64 overflow-y-auto">
                ${files.map(file => this.renderGcodeFileItem(file, printerId)).join('')}
            </div>
        `;
        
        // Cargar thumbnails de forma asíncrona después del renderizado
        setTimeout(() => {
            files.forEach(file => {
                const filename = this.getFileName(file);
                const thumbnailElement = document.getElementById(`thumbnail-${window.FleetCards.Utils.createSafeId(printerId)}-${window.FleetCards.Utils.createSafeId(filename)}`);
                if (thumbnailElement && window.FleetCards.Thumbnails.loadAndShowThumbnail) {
                    window.FleetCards.Thumbnails.loadAndShowThumbnail(printerId, filename, thumbnailElement);
                }
            });
            
            // Configurar event listeners para los botones de thumbnail
            document.querySelectorAll('.thumbnail-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const printerId = this.getAttribute('data-printer-id');
                    const filename = this.getAttribute('data-filename');
                    console.log('🖼️ Botón thumbnail clickeado:', { printerId, filename });
                    if (printerId && filename && window.FleetCards.Thumbnails.showFullThumbnail) {
                        window.FleetCards.Thumbnails.showFullThumbnail(printerId, filename);
                    }
                });
            });
        }, 100);
        
        return html;
    },

    // 📄 Obtener el nombre del archivo de manera robusta
    getFileName(file) {
        // Manejar diferentes propiedades de nombre de archivo
        const filename = file.name || file.filename || file.path || file.file_name || 'archivo_sin_nombre.gcode';
        console.log('📝 Nombre de archivo obtenido:', filename, 'del objeto:', file);
        return filename;
    },

    // 📄 Renderizar un elemento de archivo individual
    renderGcodeFileItem(file, printerId) {
        const filename = this.getFileName(file);
        const fileSize = window.FleetCards.Utils.formatFileSize(file.size || 0);
        const modifiedDate = file.modified ? new Date(file.modified * 1000).toLocaleString() : 'Fecha desconocida';
        const printTime = file.estimated_time ? window.FleetCards.Utils.formatDuration(file.estimated_time) : 'Tiempo desconocido';
        
        return `
            <div class="bg-white border border-emerald-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                <div class="flex items-center gap-3">
                    <!-- Thumbnail si está disponible -->
                    <div class="flex-shrink-0">
                        <button class="group relative w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200 hover:border-emerald-300 transition-colors thumbnail-btn"
                                id="thumbnail-${window.FleetCards.Utils.createSafeId(printerId)}-${window.FleetCards.Utils.createSafeId(filename)}"
                                data-printer-id="${printerId}"
                                data-filename="${filename}"
                                title="Ver vista previa completa">
                            📄
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-opacity flex items-center justify-center">
                                <span class="text-white opacity-0 group-hover:opacity-100 text-xs">🔍</span>
                            </div>
                        </button>
                    </div>
                    
                    <!-- Información del archivo -->
                    <div class="flex-grow min-w-0">
                        <div class="flex items-start justify-between">
                            <div class="flex-grow min-w-0">
                                <h6 class="font-medium text-gray-900 truncate" title="${window.FleetCards.Utils.escapeHtml(filename)}">
                                    📄 ${window.FleetCards.Utils.escapeHtml(filename)}
                                </h6>
                                <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                    <span title="Tamaño del archivo">📦 ${fileSize}</span>
                                    <span title="Tiempo estimado de impresión">⏱️ ${printTime}</span>
                                </div>
                                <div class="text-xs text-gray-400 mt-1" title="Fecha de modificación">
                                    📅 ${modifiedDate}
                                </div>
                            </div>
                            
                            <!-- Botones de acción -->
                            <div class="flex items-center gap-1 ml-2">
                                <button class="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                        onclick="window.FleetCards.GcodeFiles.startPrint('${printerId}', '${filename}')"
                                        title="Iniciar impresión">
                                    ▶️ Imprimir
                                </button>
                                <button class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                                        onclick="window.FleetCards.GcodeFiles.downloadFile('${printerId}', '${filename}')"
                                        title="Descargar archivo">
                                    💾
                                </button>
                                <button class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                                        onclick="window.FleetCards.GcodeFiles.deleteFile('${printerId}', '${filename}')"
                                        title="Eliminar archivo">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Información extendida (collapsible) -->
                ${file.first_layer_height || file.layer_height || file.nozzle_diameter || file.filament_total ? `
                <details class="mt-2">
                    <summary class="cursor-pointer text-xs text-emerald-600 hover:text-emerald-700">
                        🔧 Detalles técnicos
                    </summary>
                    <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                        ${file.first_layer_height ? `<div><span class="font-medium">Primera capa:</span> ${file.first_layer_height}mm</div>` : ''}
                        ${file.layer_height ? `<div><span class="font-medium">Altura capa:</span> ${file.layer_height}mm</div>` : ''}
                        ${file.nozzle_diameter ? `<div><span class="font-medium">Nozzle:</span> ${file.nozzle_diameter}mm</div>` : ''}
                        ${file.filament_total ? `<div><span class="font-medium">Filamento:</span> ${(file.filament_total / 1000).toFixed(2)}m</div>` : ''}
                        ${file.estimated_time ? `<div><span class="font-medium">Tiempo est.:</span> ${window.FleetCards.Utils.formatDuration(file.estimated_time)}</div>` : ''}
                        ${file.gcode_start_byte !== undefined ? `<div><span class="font-medium">Start byte:</span> ${file.gcode_start_byte}</div>` : ''}
                    </div>
                </details>
                ` : ''}
            </div>
        `;
    },

    // ▶️ Iniciar impresión de archivo
    async startPrint(printerId, filename) {
        console.log('▶️ Iniciando impresión:', filename, 'en impresora:', printerId);
        
        // Confirmación del usuario
        if (!confirm(`¿Estás seguro de que quieres iniciar la impresión de "${filename}"?`)) {
            console.log('❌ Impresión cancelada por el usuario');
            return;
        }

        try {
            // Mostrar loading
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast('Iniciando impresión...', 'info');
            }

            const response = await fetch(`/api/fleet/printers/${printerId}/files/${encodeURIComponent(filename)}/print`, {
                method: 'POST'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Impresión iniciada:', result);
            
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`✅ Impresión de "${filename}" iniciada correctamente`, 'success');
            }

            // Recargar datos de la flota para reflejar el cambio
            if (window.FleetCards.Core && window.FleetCards.Core.loadFleetData) {
                setTimeout(() => {
                    window.FleetCards.Core.loadFleetData();
                }, 1000);
            }

        } catch (error) {
            console.error('❌ Error iniciando impresión:', error);
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`❌ Error: ${error.message}`, 'error');
            }
        }
    },

    // 💾 Descargar archivo G-code
    async downloadFile(printerId, filename) {
        console.log('💾 Descargando archivo:', filename, 'de impresora:', printerId);
        
        try {
            const url = `/api/fleet/printers/${printerId}/files/download/${encodeURIComponent(filename)}`;
            
            // Crear elemento de descarga temporal
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ Descarga iniciada para:', filename);
            
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`💾 Descargando "${filename}"...`, 'info');
            }

        } catch (error) {
            console.error('❌ Error descargando archivo:', error);
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`❌ Error descargando archivo: ${error.message}`, 'error');
            }
        }
    },

    // 🗑️ Eliminar archivo G-code
    async deleteFile(printerId, filename) {
        console.log('🗑️ Eliminando archivo:', filename, 'de impresora:', printerId);
        
        // Confirmación del usuario
        if (!confirm(`¿Estás seguro de que quieres eliminar el archivo "${filename}"? Esta acción no se puede deshacer.`)) {
            console.log('❌ Eliminación cancelada por el usuario');
            return;
        }

        try {
            const response = await fetch(`/api/fleet/printers/${printerId}/files/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            console.log('✅ Archivo eliminado:', filename);
            
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`✅ Archivo "${filename}" eliminado correctamente`, 'success');
            }

            // Recargar lista de archivos
            this.loadPrinterGcodeFiles(printerId);

        } catch (error) {
            console.error('❌ Error eliminando archivo:', error);
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`❌ Error eliminando archivo: ${error.message}`, 'error');
            }
        }
    },

    // 📤 Mostrar diálogo de subida de archivos
    showFileUploadDialog(printerId) {
        console.log('📤 Mostrando diálogo de subida para impresora:', printerId);
        
        // Crear modal de subida si no existe
        let uploadModal = document.getElementById('file-upload-modal');
        if (!uploadModal) {
            uploadModal = this.createFileUploadModal();
            document.body.appendChild(uploadModal);
        }

        // Configurar el modal para la impresora específica
        const modalTitle = uploadModal.querySelector('#upload-modal-title');
        const printerIdInput = uploadModal.querySelector('#upload-printer-id');
        
        if (modalTitle) {
            modalTitle.textContent = `Subir archivo G-code a impresora`;
        }
        
        if (printerIdInput) {
            printerIdInput.value = printerId;
        }

        // Resetear formulario
        const fileInput = uploadModal.querySelector('#gcode-file-input');
        const progressContainer = uploadModal.querySelector('#upload-progress-container');
        const uploadButton = uploadModal.querySelector('#upload-button');
        
        if (fileInput) fileInput.value = '';
        if (progressContainer) progressContainer.classList.add('hidden');
        if (uploadButton) uploadButton.disabled = false;

        // Mostrar modal
        uploadModal.classList.remove('hidden');
        uploadModal.classList.add('flex');
    },

    // 🏗️ Crear modal de subida de archivos
    createFileUploadModal() {
        const modal = document.createElement('div');
        modal.id = 'file-upload-modal';
        modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 z-50 items-center justify-center';
        
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                <!-- Header -->
                <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 text-white">
                    <div class="flex items-center justify-between">
                        <h3 id="upload-modal-title" class="text-lg font-bold">📤 Subir Archivo G-code</h3>
                        <button onclick="window.FleetCards.GcodeFiles.hideFileUploadDialog()" 
                                class="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors">
                            ❌
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-6">
                    <form id="gcode-upload-form" onsubmit="window.FleetCards.GcodeFiles.handleFileUpload(event)">
                        <input type="hidden" id="upload-printer-id" value="">
                        
                        <!-- File Input -->
                        <div class="mb-4">
                            <label for="gcode-file-input" class="block text-sm font-medium text-gray-700 mb-2">
                                Seleccionar archivo G-code:
                            </label>
                            <input type="file" 
                                   id="gcode-file-input" 
                                   accept=".gcode,.g,.gco" 
                                   required
                                   class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100">
                            <p class="mt-1 text-xs text-gray-500">
                                Formatos soportados: .gcode, .g, .gco (máx. 100MB)
                            </p>
                        </div>

                        <!-- Progress -->
                        <div id="upload-progress-container" class="hidden mb-4">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-sm font-medium text-gray-700">Subiendo archivo...</span>
                                <span id="upload-progress-text" class="text-sm text-gray-500">0%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div id="upload-progress-bar" class="h-2 bg-emerald-500 rounded-full transition-all duration-300" style="width: 0%"></div>
                            </div>
                        </div>

                        <!-- Buttons -->
                        <div class="flex gap-3">
                            <button type="button" 
                                    onclick="window.FleetCards.GcodeFiles.hideFileUploadDialog()"
                                    class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" 
                                    id="upload-button"
                                    class="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50">
                                📤 Subir Archivo
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        return modal;
    },

    // 📤 Manejar subida de archivo
    async handleFileUpload(event) {
        event.preventDefault();
        
        const form = event.target;
        const fileInput = form.querySelector('#gcode-file-input');
        const printerIdInput = form.querySelector('#upload-printer-id');
        const progressContainer = form.querySelector('#upload-progress-container');
        const progressBar = form.querySelector('#upload-progress-bar');
        const progressText = form.querySelector('#upload-progress-text');
        const uploadButton = form.querySelector('#upload-button');
        
        const file = fileInput.files[0];
        const printerId = printerIdInput.value;
        
        if (!file || !printerId) {
            console.error('❌ Archivo o ID de impresora faltante');
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast('❌ Selecciona un archivo válido', 'error');
            }
            return;
        }

        console.log('📤 Subiendo archivo:', file.name, 'a impresora:', printerId);

        // Preparar UI para upload
        progressContainer.classList.remove('hidden');
        uploadButton.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`/api/fleet/printers/${printerId}/files/upload`, {
                method: 'POST',
                body: formData,
                // Note: No establecer Content-Type para FormData, el navegador lo hace automáticamente
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Archivo subido correctamente:', result);

            // Completar progress bar
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = '100%';

            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`✅ Archivo "${file.name}" subido correctamente`, 'success');
            }

            // Ocultar modal y recargar archivos
            setTimeout(() => {
                this.hideFileUploadDialog();
                this.loadPrinterGcodeFiles(printerId);
            }, 1000);

        } catch (error) {
            console.error('❌ Error subiendo archivo:', error);
            
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`❌ Error subiendo archivo: ${error.message}`, 'error');
            }
            
            // Resetear UI
            progressContainer.classList.add('hidden');
            uploadButton.disabled = false;
            if (progressBar) progressBar.style.width = '0%';
            if (progressText) progressText.textContent = '0%';
        }
    },

    // 👁️ Ocultar modal de subida
    hideFileUploadDialog() {
        const modal = document.getElementById('file-upload-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            console.log('✅ Modal de subida ocultado');
        }
    },

    // 🧪 Función de prueba
    testGcodeFiles() {
        console.log('🧪 Ejecutando test de gestión de archivos G-code...');
        
        // Test con datos de ejemplo
        const testFiles = [
            {
                name: 'test_print.gcode',
                size: 1024000,
                modified: Date.now() / 1000,
                estimated_time: 3600,
                thumbnail_path: null
            },
            {
                name: 'detailed_model.g',
                size: 5242880,
                modified: (Date.now() - 86400000) / 1000,
                estimated_time: 7200,
                first_layer_height: 0.3,
                layer_height: 0.2,
                nozzle_diameter: 0.4,
                filament_total: 25000,
                thumbnail_path: '/path/to/thumb.jpg'
            }
        ];
        
        const testContainer = document.createElement('div');
        testContainer.innerHTML = this.renderGcodeFilesList(testFiles, 'test-printer');
        
        console.log('✅ Test de archivos G-code completado');
        console.log('📄 HTML generado:', testContainer.innerHTML);
    }
};

console.log('📁 Módulo FleetCards.GcodeFiles cargado');
