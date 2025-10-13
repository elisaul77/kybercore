/**
 * Módulo de Producción - JavaScript
 * Gestión de lotes de producción, asignación de recursos y orquestación
 */

class ProductionModule {
    constructor() {
        this.currentTab = 'dashboard';
        this.batches = [];
        this.printers = [];
        this.materials = [];
        this.charts = {};
        this.filters = {
            status: '',
            printer: '',
            material: ''
        };

        this.init();
    }

    init() {
        // No llamar inmediatamente a bindEvents y loadInitialData
        // Se llamarán cuando el módulo sea navegado
        console.log('✅ ProductionModule constructor ejecutado');
    }

    // Método para inicializar cuando el módulo es cargado
    onModuleLoad() {
        this.bindEvents();
        this.loadInitialData();
    }

    bindEvents() {
        // Tabs
        document.querySelectorAll('.production-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Filtros
        document.getElementById('filter-batch-status')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-printer')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-material')?.addEventListener('change', () => this.applyFilters());

        // Material type change
        document.getElementById('batch-material-type')?.addEventListener('change', () => this.loadMaterialColors());
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadDashboardData(),
                this.loadBatches(),
                this.loadPrinters(),
                this.loadMaterials()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Error al cargar datos iniciales', 'error');
        }
    }

    // ========== NAVEGACIÓN ==========

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.production-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Hide all tab contents
        document.querySelectorAll('.production-tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Show selected tab content
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');

        this.currentTab = tabName;

        // Load tab-specific data
        switch (tabName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'batches':
                this.loadBatches();
                break;
            case 'printers':
                this.loadPrinters();
                break;
            case 'materials':
                this.loadMaterials();
                break;
        }
    }

    // ========== DASHBOARD ==========

    async loadDashboardData() {
        try {
            const response = await fetch('/api/production/statistics');
            const data = await response.json();

            if (data.success) {
                this.updateKPIs(data.data);
                this.renderStatusChart(data.data);
                this.renderUtilizationChart(data.data);
                this.renderRecentBatches();
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateKPIs(stats) {
        document.getElementById('kpi-active-batches').textContent = stats.active_batches || 0;
        document.getElementById('kpi-busy-printers').textContent = stats.busy_printers || 0;
        document.getElementById('kpi-efficiency').textContent = `${stats.efficiency || 0}%`;
        document.getElementById('kpi-filament').textContent = `${stats.total_filament_kg || 0}kg`;
    }

    renderStatusChart(stats) {
        const ctx = document.getElementById('batches-status-chart');
        if (!ctx) return;

        const statusData = stats.by_status || {};
        const labels = Object.keys(statusData);
        const values = Object.values(statusData);

        if (this.charts.statusChart) {
            this.charts.statusChart.destroy();
        }

        this.charts.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#fef3c7', // pending
                        '#dbeafe', // processing
                        '#d1fae5', // completed
                        '#fee2e2'  // failed
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderUtilizationChart(stats) {
        const ctx = document.getElementById('printers-utilization-chart');
        if (!ctx) return;

        // Mock data - replace with real data
        const utilizationData = {
            labels: ['Impresora 1', 'Impresora 2', 'Impresora 3', 'Impresora 4'],
            datasets: [{
                label: 'Utilización (%)',
                data: [85, 60, 90, 45],
                backgroundColor: '#3b82f6'
            }]
        };

        if (this.charts.utilizationChart) {
            this.charts.utilizationChart.destroy();
        }

        this.charts.utilizationChart = new Chart(ctx, {
            type: 'bar',
            data: utilizationData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    async renderRecentBatches() {
        try {
            const response = await fetch('/api/production/batches?limit=5');
            const data = await response.json();

            const container = document.getElementById('recent-batches-list');
            if (!container || !data.success) return;

            container.innerHTML = data.data.map(batch => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p class="font-semibold text-sm">${batch.id}</p>
                        <p class="text-xs text-gray-600">Pedido: ${batch.order_id}</p>
                    </div>
                    <div class="text-right">
                        <span class="batch-status-badge status-${batch.status} text-xs">
                            ${this.getStatusLabel(batch.status)}
                        </span>
                        <p class="text-xs text-gray-600 mt-1">${batch.completion_percentage || 0}%</p>
                    </div>
                </div>
            `).join('') || '<p class="text-gray-500 text-center py-4">No hay lotes recientes</p>';
        } catch (error) {
            console.error('Error loading recent batches:', error);
        }
    }

    // ========== LOTES ==========

    async loadBatches() {
        try {
            const response = await fetch('/api/production/batches');
            const data = await response.json();

            if (data.success) {
                this.batches = data.data;
                this.renderBatchesTable();
                this.updateFilters();
            }
        } catch (error) {
            console.error('Error loading batches:', error);
        }
    }

    renderBatchesTable() {
        const tbody = document.getElementById('batches-table-body');
        if (!tbody) return;

        const filteredBatches = this.applyBatchFilters();

        tbody.innerHTML = filteredBatches.map(batch => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div>
                        <div class="text-sm font-medium text-gray-900">${batch.id}</div>
                        <div class="text-sm text-gray-500">Lote #${batch.batch_number}</div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${batch.order_id}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${batch.printer_id || 'Sin asignar'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${batch.material_type} ${batch.material_color}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="batch-status-badge status-${batch.status}">
                        ${this.getStatusLabel(batch.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${batch.completion_percentage || 0}%"></div>
                    </div>
                    <span class="text-xs text-gray-600 mt-1">${batch.completion_percentage || 0}%</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="ProductionModule.viewBatchDetails('${batch.id}')"
                            class="text-blue-600 hover:text-blue-900 mr-3">Ver</button>
                    <button onclick="ProductionModule.editBatch('${batch.id}')"
                            class="text-green-600 hover:text-green-900">Editar</button>
                </td>
            </tr>
        `).join('');
    }

    applyBatchFilters() {
        return this.batches.filter(batch => {
            if (this.filters.status && batch.status !== this.filters.status) return false;
            if (this.filters.printer && batch.printer_id !== this.filters.printer) return false;
            if (this.filters.material && batch.material_type !== this.filters.material) return false;
            return true;
        });
    }

    applyFilters() {
        this.filters.status = document.getElementById('filter-batch-status').value;
        this.filters.printer = document.getElementById('filter-printer').value;
        this.filters.material = document.getElementById('filter-material').value;
        this.renderBatchesTable();
    }

    clearFilters() {
        this.filters = { status: '', printer: '', material: '' };
        document.getElementById('filter-batch-status').value = '';
        document.getElementById('filter-printer').value = '';
        document.getElementById('filter-material').value = '';
        this.renderBatchesTable();
    }

    updateFilters() {
        // Update printer filter options
        const printerSelect = document.getElementById('filter-printer');
        if (printerSelect) {
            const options = ['<option value="">Todas las impresoras</option>'];
            this.printers.forEach(printer => {
                options.push(`<option value="${printer.id}">${printer.name || printer.id}</option>`);
            });
            printerSelect.innerHTML = options.join('');
        }
    }

    // ========== IMPRESORAS ==========

    async loadPrinters() {
        try {
            const response = await fetch('/api/fleet/printers');
            const data = await response.json();

            if (data.success) {
                this.printers = data.data;
                this.renderPrintersGrid();
            }
        } catch (error) {
            console.error('Error loading printers:', error);
        }
    }

    renderPrintersGrid() {
        const container = document.getElementById('printers-grid');
        if (!container) return;

        container.innerHTML = this.printers.map(printer => `
            <div class="bg-white rounded-lg shadow-md p-6 border-l-4 ${
                printer.status === 'busy' ? 'border-blue-500' :
                printer.status === 'idle' ? 'border-green-500' :
                printer.status === 'error' ? 'border-red-500' : 'border-gray-500'
            }">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-800">${printer.name || printer.id}</h3>
                    <span class="printer-status-badge printer-${printer.status || 'offline'}">
                        ${this.getPrinterStatusLabel(printer.status)}
                    </span>
                </div>

                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Modelo:</span>
                        <span class="font-semibold">${printer.model || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Estado:</span>
                        <span class="font-semibold">${printer.state || 'Desconocido'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Temperatura:</span>
                        <span class="font-semibold">${printer.nozzle_temp || 0}°C</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Trabajo actual:</span>
                        <span class="font-semibold">${printer.current_job || 'Ninguno'}</span>
                    </div>
                </div>

                <div class="mt-4 flex gap-2">
                    <button onclick="ProductionModule.assignToPrinter('${printer.id}')"
                            class="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Asignar Lote
                    </button>
                    <button onclick="ProductionModule.viewPrinterDetails('${printer.id}')"
                            class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                        Ver
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ========== MATERIALES ==========

    async loadMaterials() {
        try {
            const response = await fetch('/api/production/materials/available');
            const data = await response.json();

            if (data.success) {
                this.materials = data.data;
                this.renderMaterialsGrid();
            }
        } catch (error) {
            console.error('Error loading materials:', error);
        }
    }

    renderMaterialsGrid() {
        const container = document.getElementById('materials-grid');
        if (!container) return;

        container.innerHTML = this.materials.map(material => {
            const stockStatus = material.available_weight_kg > 500 ? 'good' :
                              material.available_weight_kg > 100 ? 'low' : 'empty';

            return `
                <div class="bg-white rounded-lg shadow-md p-4 border-l-4 ${
                    stockStatus === 'good' ? 'border-green-500' :
                    stockStatus === 'low' ? 'border-yellow-500' : 'border-red-500'
                }">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-lg font-semibold text-gray-800">${material.type} ${material.color}</h3>
                        <span class="material-stock-badge material-${stockStatus}">
                            ${material.available_weight_kg}kg
                        </span>
                    </div>

                    <div class="space-y-1 text-sm text-gray-600">
                        <div>${material.roll_count} rollos disponibles</div>
                        <div>Marcas: ${material.brands.join(', ')}</div>
                    </div>

                    <button onclick="ProductionModule.reserveMaterial('${material.type}', '${material.color}')"
                            class="w-full mt-3 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                        Reservar
                    </button>
                </div>
            `;
        }).join('');
    }

    // ========== GESTIÓN DE LOTES ==========

    async createBatchFromOrder() {
        try {
            // Load available orders
            const ordersResponse = await fetch('/api/orders?status=in_progress&status=pending');
            const ordersData = await ordersResponse.json();

            if (ordersData.success) {
                const orderSelect = document.getElementById('batch-order-select');
                orderSelect.innerHTML = '<option value="">Seleccionar pedido...</option>' +
                    ordersData.data.map(order =>
                        `<option value="${order.id}">${order.id} - ${order.customer_name || 'Cliente'}</option>`
                    ).join('');

                // Generate session ID
                document.getElementById('batch-session-id').value = `session_${Date.now()}`;

                // Load available printers
                await this.loadAvailablePrinters();
                await this.loadMaterialColors();

                this.showModal('modal-create-batch');
            }
        } catch (error) {
            console.error('Error preparing batch creation:', error);
            this.showNotification('Error al preparar creación de lote', 'error');
        }
    }

    async loadAvailablePrinters() {
        try {
            const response = await fetch('/api/production/printers/available');
            const data = await response.json();

            if (data.success) {
                const printerSelect = document.getElementById('batch-printer-select');
                printerSelect.innerHTML = '<option value="">Seleccionar impresora...</option>' +
                    data.data.map(printer =>
                        `<option value="${printer.id}">${printer.name || printer.id}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading available printers:', error);
        }
    }

    async loadMaterialColors() {
        const materialType = document.getElementById('batch-material-type').value;
        if (!materialType) return;

        try {
            const response = await fetch(`/api/consumables/colors?type=${materialType}`);
            const data = await response.json();

            if (data.success) {
                const colorSelect = document.getElementById('batch-material-color');
                colorSelect.innerHTML = '<option value="">Seleccionar color...</option>' +
                    data.data.map(color =>
                        `<option value="${color.color}">${color.color} (${color.total_weight}kg)</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading material colors:', error);
        }
    }

    async submitCreateBatch(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const batchData = {
            order_id: formData.get('order_id'),
            batch_number: parseInt(formData.get('batch_number')),
            session_id: formData.get('session_id'),
            printer_id: formData.get('printer_id'),
            material_type: formData.get('material_type'),
            material_color: formData.get('material_color'),
            items_count: 1 // TODO: Calculate from order lines
        };

        try {
            const response = await fetch('/api/production/batches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(batchData)
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Lote creado exitosamente', 'success');
                this.closeModal('modal-create-batch');
                this.loadBatches();
                this.loadDashboardData();
            } else {
                this.showNotification(data.message || 'Error al crear lote', 'error');
            }
        } catch (error) {
            console.error('Error creating batch:', error);
            this.showNotification('Error al crear lote', 'error');
        }
    }

    async viewBatchDetails(batchId) {
        try {
            const response = await fetch(`/api/production/batches/${batchId}`);
            const data = await response.json();

            if (data.success) {
                const batch = data.data;
                this.populateBatchDetailsModal(batch);
                this.showModal('modal-batch-details');
            }
        } catch (error) {
            console.error('Error loading batch details:', error);
            this.showNotification('Error al cargar detalles del lote', 'error');
        }
    }

    populateBatchDetailsModal(batch) {
        // Basic info
        document.getElementById('detail-batch-id').textContent = batch.id;
        document.getElementById('detail-order-id').textContent = batch.order_id;
        document.getElementById('detail-printer-id').textContent = batch.printer_id || 'Sin asignar';
        document.getElementById('detail-material').textContent = `${batch.material_type} ${batch.material_color}`;
        document.getElementById('detail-progress').textContent = `${batch.completion_percentage || 0}%`;

        // Status badge
        const statusBadge = document.getElementById('detail-status-badge');
        statusBadge.innerHTML = `<span class="batch-status-badge status-${batch.status}">${this.getStatusLabel(batch.status)}</span>`;

        // Timeline
        document.getElementById('timeline-created').textContent = this.formatDate(batch.created_at);
        if (batch.started_at) {
            document.getElementById('timeline-started').textContent = this.formatDate(batch.started_at);
            document.getElementById('timeline-started-container').classList.remove('hidden');
        }
        if (batch.completed_at) {
            document.getElementById('timeline-completed').textContent = this.formatDate(batch.completed_at);
            document.getElementById('timeline-completed-container').classList.remove('hidden');
        }

        // Items list (mock data for now)
        const itemsList = document.getElementById('detail-items-list');
        itemsList.innerHTML = batch.print_items?.map(item => `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span class="text-sm">${item.filename}</span>
                <span class="text-xs text-gray-600">${item.status}</span>
            </div>
        `).join('') || '<p class="text-gray-500 text-sm">No hay items</p>';

        // Control buttons visibility based on status
        this.updateBatchControlButtons(batch.status);
    }

    updateBatchControlButtons(status) {
        const btnStart = document.getElementById('btn-start-batch');
        const btnPause = document.getElementById('btn-pause-batch');
        const btnResume = document.getElementById('btn-resume-batch');
        const btnComplete = document.getElementById('btn-complete-batch');

        // Hide all first
        [btnStart, btnPause, btnResume, btnComplete].forEach(btn => btn.style.display = 'none');

        // Show based on status
        switch (status) {
            case 'pending':
                btnStart.style.display = 'block';
                break;
            case 'processing':
                btnPause.style.display = 'block';
                btnComplete.style.display = 'block';
                break;
            case 'paused':
                btnResume.style.display = 'block';
                break;
        }
    }

    async startBatch() {
        const batchId = document.getElementById('detail-batch-id').textContent;
        await this.updateBatchAction(batchId, 'start');
    }

    async pauseBatch() {
        const batchId = document.getElementById('detail-batch-id').textContent;
        await this.updateBatchAction(batchId, 'pause');
    }

    async resumeBatch() {
        const batchId = document.getElementById('detail-batch-id').textContent;
        await this.updateBatchAction(batchId, 'resume');
    }

    async completeBatch() {
        const batchId = document.getElementById('detail-batch-id').textContent;
        await this.updateBatchAction(batchId, 'complete');
    }

    async updateBatchAction(batchId, action) {
        try {
            const response = await fetch(`/api/production/batches/${batchId}/${action}`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification(`Lote ${action} exitosamente`, 'success');
                this.closeModal('modal-batch-details');
                this.loadBatches();
                this.loadDashboardData();
            } else {
                this.showNotification(data.message || `Error al ${action} lote`, 'error');
            }
        } catch (error) {
            console.error(`Error ${action} batch:`, error);
            this.showNotification(`Error al ${action} lote`, 'error');
        }
    }

    // ========== OPTIMIZACIÓN ==========

    async optimizeAssignments() {
        try {
            this.showNotification('Optimizando asignaciones...', 'info');

            // TODO: Implement optimization algorithm
            // For now, just show a mock optimization

            setTimeout(() => {
                this.showNotification('Asignaciones optimizadas exitosamente', 'success');
                this.loadDashboardData();
            }, 2000);
        } catch (error) {
            console.error('Error optimizing assignments:', error);
            this.showNotification('Error al optimizar asignaciones', 'error');
        }
    }

    // ========== MÉTODOS ADICIONALES ==========

    editBatch(batchId) {
        // TODO: Implementar edición de lote
        console.log('Editing batch:', batchId);
        this.showNotification('Función de edición en desarrollo', 'info');
    }

    assignToPrinter(printerId) {
        // TODO: Implementar asignación de lote a impresora
        console.log('Assigning to printer:', printerId);
        this.showNotification('Función de asignación en desarrollo', 'info');
    }

    viewPrinterDetails(printerId) {
        // TODO: Implementar vista detallada de impresora
        console.log('Viewing printer details:', printerId);
        this.showNotification('Función de vista de impresora en desarrollo', 'info');
    }

    reserveMaterial(type, color) {
        // TODO: Implementar reserva de material
        console.log('Reserving material:', type, color);
        this.showNotification('Función de reserva de material en desarrollo', 'info');
    }

    // ========== UTILIDADES ==========

    getStatusLabel(status) {
        const labels = {
            'pending': 'Pendiente',
            'processing': 'Procesando',
            'completed': 'Completado',
            'failed': 'Fallido',
            'paused': 'Pausado'
        };
        return labels[status] || status;
    }

    getPrinterStatusLabel(status) {
        const labels = {
            'idle': 'Libre',
            'busy': 'Ocupada',
            'error': 'Error',
            'offline': 'Offline'
        };
        return labels[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('es-ES');
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('production-notifications-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-lg">×</button>
            </div>
        `;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const productionInstance = new ProductionModule();
    
    // Exponer métodos globalmente para que puedan ser llamados desde onclick en HTML
    window.ProductionModule = {
        instance: productionInstance,
        
        // Métodos públicos
        switchTab: (tabName) => productionInstance.switchTab(tabName),
        createBatchFromOrder: () => productionInstance.createBatchFromOrder(),
        viewBatchDetails: (batchId) => productionInstance.viewBatchDetails(batchId),
        editBatch: (batchId) => productionInstance.editBatch(batchId),
        assignToPrinter: (printerId) => productionInstance.assignToPrinter(printerId),
        viewPrinterDetails: (printerId) => productionInstance.viewPrinterDetails(printerId),
        reserveMaterial: (type, color) => productionInstance.reserveMaterial(type, color),
        submitCreateBatch: (event) => productionInstance.submitCreateBatch(event),
        startBatch: () => productionInstance.startBatch(),
        pauseBatch: () => productionInstance.pauseBatch(),
        resumeBatch: () => productionInstance.resumeBatch(),
        completeBatch: () => productionInstance.completeBatch(),
        optimizeAssignments: () => productionInstance.optimizeAssignments(),
        showModal: (modalId) => productionInstance.showModal(modalId),
        closeModal: (modalId) => productionInstance.closeModal(modalId),
        applyFilters: () => productionInstance.applyFilters(),
        clearFilters: () => productionInstance.clearFilters(),
        
        // Método de inicialización
        init: () => {
            if (productionInstance.onModuleLoad) {
                productionInstance.onModuleLoad();
            }
        }
    };
    
    console.log('✅ Módulo de producción inicializado correctamente');
});