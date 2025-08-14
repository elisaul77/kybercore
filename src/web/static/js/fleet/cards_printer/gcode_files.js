// 📁 MÓDULO GCODE FILES - Gestión de archivos G-code
// Manejo de carga, subida, eliminación e inicio de impresiones

window.FleetCards = window.FleetCards || {};

window.FleetCards.GcodeFiles = {
    // Estado de paginación y filtros
    pageSize: 10,
    currentPage: 1,
    totalFiles: 0,
    allFiles: [],
    filteredFiles: [],
    currentPrinterId: null,
    sortOrder: 'date_desc', // name_asc, name_desc, date_asc, date_desc
    searchTerm: '',

    // 📁 Cargar archivos G-code de una impresora
    async loadPrinterGcodeFiles(printerId) {
        this.currentPrinterId = printerId;
        this.currentPage = 1;

        const container = document.getElementById(`gcode-files-${printerId}`);
        if (!container) return;

        container.innerHTML = `
            <div class="flex items-center justify-center py-4 text-gray-500">
                <div class="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full mr-2"></div>
                Cargando archivos...
            </div>
        `;

        try {
            const res = await fetch(`/api/fleet/printers/${printerId}/files`);
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            const data = await res.json();

            let files = [];
            if (data.files?.result && Array.isArray(data.files.result)) files = data.files.result;
            else if (Array.isArray(data.files)) files = data.files;
            else if (Array.isArray(data.result)) files = data.result;
            else if (Array.isArray(data)) files = data;

            this.allFiles = files;
            this.totalFiles = files.length;

            this.applyFiltersAndSort();
            this.renderPaginatedList();
        } catch (e) {
            container.innerHTML = `
                <div class="text-center py-4 text-red-500">
                    <div class="text-2xl mb-2">⚠️</div>
                    <p class="text-sm">Error cargando archivos</p>
                    <p class="text-xs">${e.message}</p>
                    <button class="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs" onclick="window.FleetCards.GcodeFiles.loadPrinterGcodeFiles('${printerId}')">
                        🔄 Reintentar
                    </button>
                </div>`;
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
            // Usar el mismo patrón que otros endpoints: /files/{filename}
            const url = `/api/fleet/printers/${printerId}/files/${encodeURIComponent(filename)}`;
            
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

    // Funciones de filtros y ordenamiento
    applyFiltersAndSort() {
      const term = (this.searchTerm || '').toLowerCase();
      this.filteredFiles = (this.allFiles || []).filter(f => {
        const name = this.getFileName ? this.getFileName(f) : (f.name || f.filename || '');
        return name.toLowerCase().includes(term);
      });

      const getName = f => (this.getFileName ? this.getFileName(f) : (f.name || f.filename || ''));
      const getDate = f => f.modified || f.mod_time || f.mtime || f.last_modified || 0;

      this.filteredFiles.sort((a, b) => {
        switch (this.sortOrder) {
          case 'name_asc':
            return getName(a).localeCompare(getName(b));
          case 'name_desc':
            return getName(b).localeCompare(getName(a));
          case 'date_asc':
            return getDate(a) - getDate(b);
          case 'date_desc':
          default:
            return getDate(b) - getDate(a);
        }
      });
    },

    renderPaginatedList() {
      const printerId = this.currentPrinterId;
      const container = document.getElementById(`gcode-files-${printerId}`);
      if (!container) return;

      // Guardar el estado del foco antes del re-render
      const searchInput = document.getElementById(`gcode-search-${printerId}`);
      const shouldRestoreFocus = searchInput && document.activeElement === searchInput;
      const cursorPosition = shouldRestoreFocus ? searchInput.selectionStart : 0;

      const total = this.filteredFiles.length;
      const pages = Math.max(1, Math.ceil(total / this.pageSize));
      this.currentPage = Math.min(this.currentPage, pages);
      const start = (this.currentPage - 1) * this.pageSize;
      const pageFiles = this.filteredFiles.slice(start, start + this.pageSize);

      const controls = `
        <div class="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200 flex flex-col gap-2 md:flex-row md:items-center">
          <div class="flex-1">
            <input id="gcode-search-${printerId}" placeholder="Buscar por nombre..." value="${this.searchTerm}" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div>
            <select id="gcode-sort-${printerId}" class="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
              <option value="date_desc" ${this.sortOrder==='date_desc'?'selected':''}>📅 Más reciente</option>
              <option value="date_asc" ${this.sortOrder==='date_asc'?'selected':''}>📅 Más antiguo</option>
              <option value="name_asc" ${this.sortOrder==='name_asc'?'selected':''}>📝 Nombre A-Z</option>
              <option value="name_desc" ${this.sortOrder==='name_desc'?'selected':''}>📝 Nombre Z-A</option>
            </select>
          </div>
          <div class="text-sm text-gray-600">${total} archivos</div>
        </div>`;

      const list = `
        <div id="gcode-files-list-${printerId}" class="space-y-2 max-h-96 overflow-y-auto">
          ${pageFiles.length ? pageFiles.map(f => this.renderGcodeFileItem(f, printerId)).join('') : '<div class="text-center py-6 text-gray-500">📭 Sin resultados</div>'}
        </div>`;

      const pagination = this.renderPaginationControls ? this.renderPaginationControls(pages) : '';

      container.innerHTML = controls + list + pagination;
      this.setupFileListEventHandlers();

      // Restaurar el foco y posición del cursor
      if (shouldRestoreFocus) {
        setTimeout(() => {
          const newSearchInput = document.getElementById(`gcode-search-${printerId}`);
          if (newSearchInput) {
            newSearchInput.focus();
            newSearchInput.setSelectionRange(cursorPosition, cursorPosition);
          }
        }, 0);
      }

      // Cargar thumbnails solo de la página actual
      setTimeout(() => {
        pageFiles.forEach(file => {
          const name = this.getFileName ? this.getFileName(file) : (file.name || file.filename || '');
          const el = document.getElementById(`thumbnail-${window.FleetCards.Utils.createSafeId(printerId)}-${window.FleetCards.Utils.createSafeId(name)}`);
          if (el && window.FleetCards.Thumbnails?.loadAndShowThumbnail) {
            window.FleetCards.Thumbnails.loadAndShowThumbnail(printerId, name, el);
          }
        });
      }, 50);
    },

    renderPaginationControls(totalPages) {
      if (totalPages <= 1) return '';
      
      const p = this.currentPage;
      const maxVisible = 7; // Máximo de páginas visibles
      const btn = (n, label = n, disabled = false) => {
        const classes = disabled 
          ? 'px-2 py-1 border rounded bg-gray-100 text-gray-400 cursor-not-allowed'
          : n === p 
            ? 'px-2 py-1 border rounded bg-emerald-500 text-white'
            : 'px-2 py-1 border rounded bg-white hover:bg-gray-50';
        return `<button data-page="${n}" class="${classes}" ${disabled ? 'disabled' : ''}>${label}</button>`;
      };
      
      let pages = [];
      
      if (totalPages <= maxVisible) {
        // Mostrar todas las páginas si son pocas
        pages = Array.from({length: totalPages}, (_, i) => btn(i + 1));
      } else {
        // Lógica de paginación inteligente
        const start = Math.max(1, Math.min(p - Math.floor(maxVisible / 2), totalPages - maxVisible + 1));
        const end = Math.min(totalPages, start + maxVisible - 1);
        
        // Primera página si no está en el rango
        if (start > 1) {
          pages.push(btn(1));
          if (start > 2) pages.push('<span class="px-2 py-1">...</span>');
        }
        
        // Páginas del rango actual
        for (let i = start; i <= end; i++) {
          pages.push(btn(i));
        }
        
        // Última página si no está en el rango
        if (end < totalPages) {
          if (end < totalPages - 1) pages.push('<span class="px-2 py-1">...</span>');
          pages.push(btn(totalPages));
        }
      }
      
      const prevBtn = btn(Math.max(1, p - 1), '◀', p === 1);
      const nextBtn = btn(Math.min(totalPages, p + 1), '▶', p === totalPages);
      
      return `<div class="mt-3 flex items-center gap-1 justify-center">${prevBtn} ${pages.join(' ')} ${nextBtn}</div>`;
    },

    setupFileListEventHandlers() {
      const pid = this.currentPrinterId;
      const search = document.getElementById(`gcode-search-${pid}`);
      const sort = document.getElementById(`gcode-sort-${pid}`);
      const container = document.getElementById(`gcode-files-${pid}`);

      if (search) {
        search.addEventListener('input', (e) => {
          this.searchTerm = e.target.value;
          this.currentPage = 1;
          this.applyFiltersAndSort();
          this.renderPaginatedList();
        });
      }

      if (sort) {
        sort.addEventListener('change', (e) => {
          this.sortOrder = e.target.value;
          this.currentPage = 1;
          this.applyFiltersAndSort();
          this.renderPaginatedList();
        });
      }

      if (container) {
        container.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-page]');
          if (btn) {
            const page = parseInt(btn.getAttribute('data-page'), 10);
            if (!Number.isNaN(page)) {
              this.currentPage = page;
              this.renderPaginatedList();
            }
          }
        });
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
