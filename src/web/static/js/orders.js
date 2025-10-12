/**
 * Módulo de Gestión de Pedidos
 * Interactúa con la API REST del sistema de pedidos
 */

const OrdersModule = {
    // Configuración
    config: {
        apiBaseUrl: 'http://localhost:8000/api',
        refreshInterval: 30000, // 30 segundos
    },

    // Estado del módulo
    state: {
        currentTab: 'dashboard',
        orders: [],
        customers: [],
        productionBatches: [],
        metrics: {},
        filters: {
            customer: '',
            status: '',
            priority: ''
        },
        refreshTimer: null
    },

    /**
     * Inicializa el módulo
     */
    async init() {
        console.log('Inicializando módulo de pedidos...');
        
        try {
            // Cargar datos iniciales
            await this.loadAllData();
            
            // Configurar actualización automática
            this.startAutoRefresh();
            
            // Renderizar dashboard por defecto
            this.renderDashboard();
            
            console.log('✓ Módulo de pedidos inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar módulo de pedidos:', error);
            this.showError('Error al cargar los datos del sistema de pedidos');
        }
    },    /**
     * Limpia el módulo al salir
     */
    cleanup() {
        if (this.state.refreshTimer) {
            clearInterval(this.state.refreshTimer);
            this.state.refreshTimer = null;
        }
        console.log('Módulo de pedidos limpiado');
    },

    /**
     * Carga todos los datos necesarios
     */
    async loadAllData() {
        try {
            const [orders, customers, metrics] = await Promise.all([
                this.fetchOrders(),
                this.fetchCustomers(),
                this.fetchMetrics()
            ]);

            this.state.orders = orders;
            this.state.customers = customers;
            this.state.metrics = metrics;

            // Cargar lotes de producción si hay pedidos en progreso
            const inProgressOrders = orders.filter(o => o.status === 'in_progress');
            if (inProgressOrders.length > 0) {
                this.state.productionBatches = await this.fetchProductionBatches();
            }

            return true;
        } catch (error) {
            console.error('Error al cargar datos:', error);
            throw error;
        }
    },

    /**
     * Realiza petición GET a la API
     */
    async apiGet(endpoint) {
        const response = await fetch(`${this.config.apiBaseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Realiza petición POST a la API
     */
    async apiPost(endpoint, data) {
        const response = await fetch(`${this.config.apiBaseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Error ${response.status}`);
        }

        return await response.json();
    },

    /**
     * Realiza petición PATCH a la API
     */
    async apiPatch(endpoint, data) {
        const response = await fetch(`${this.config.apiBaseUrl}${endpoint}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Error ${response.status}`);
        }

        return await response.json();
    },

    /**
     * Obtiene todos los pedidos
     */
    async fetchOrders() {
        return await this.apiGet('/orders/');
    },

    /**
     * Obtiene todos los clientes
     */
    async fetchCustomers() {
        return await this.apiGet('/customers/');
    },

    /**
     * Obtiene métricas del dashboard
     */
    async fetchMetrics() {
        return await this.apiGet('/metrics/dashboard/');
    },

    /**
     * Obtiene lotes de producción
     */
    async fetchProductionBatches() {
        return await this.apiGet('/production/batches/');
    },

    /**
     * Inicia actualización automática
     */
    startAutoRefresh() {
        this.state.refreshTimer = setInterval(async () => {
            try {
                await this.loadAllData();
                this.refreshCurrentView();
            } catch (error) {
                console.error('Error en actualización automática:', error);
            }
        }, this.config.refreshInterval);
    },

    /**
     * Refresca la vista actual
     */
    refreshCurrentView() {
        switch (this.state.currentTab) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'orders':
                this.renderOrdersTable();
                break;
            case 'customers':
                this.renderCustomersGrid();
                break;
            case 'production':
                this.renderProductionBatches();
                break;
        }
    },

    /**
     * Cambia de pestaña
     */
    switchTab(tabName) {
        // Actualizar estado visual de tabs
        document.querySelectorAll('.orders-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.orders-tab[data-tab="${tabName}"]`).classList.add('active');

        // Ocultar todos los contenidos
        document.querySelectorAll('.orders-tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Mostrar contenido seleccionado
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');

        // Actualizar estado
        this.state.currentTab = tabName;

        // Renderizar contenido
        this.refreshCurrentView();
    },

    /**
     * Renderiza el dashboard
     */
    renderDashboard() {
        const metrics = this.state.metrics;

        // Actualizar métricas principales
        document.getElementById('metric-total-orders').textContent = metrics.total_orders || 0;
        document.getElementById('metric-pending-orders').textContent = metrics.pending_orders || 0;
        document.getElementById('metric-completed-orders').textContent = metrics.completed_orders || 0;
        document.getElementById('metric-revenue').textContent = `$${(metrics.total_revenue || 0).toFixed(2)}`;

        // Renderizar gráfico de estado
        this.renderStatusChart();

        // Renderizar pedidos recientes
        this.renderRecentOrders();
    },

    /**
     * Renderiza gráfico de estado de pedidos
     */
    renderStatusChart() {
        const chartContainer = document.getElementById('orders-status-chart');
        const statusCounts = this.state.metrics.orders_by_status || {};

        const statuses = {
            pending: { label: 'Pendientes', color: '#fbbf24', emoji: '⏳' },
            in_progress: { label: 'En Progreso', color: '#3b82f6', emoji: '🔄' },
            completed: { label: 'Completados', color: '#10b981', emoji: '✅' },
            cancelled: { label: 'Cancelados', color: '#ef4444', emoji: '❌' }
        };

        const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

        let html = '<div class="space-y-3">';
        
        for (const [status, config] of Object.entries(statuses)) {
            const count = statusCounts[status] || 0;
            const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;

            html += `
                <div class="flex items-center gap-3">
                    <span class="text-2xl">${config.emoji}</span>
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-sm font-medium text-gray-700">${config.label}</span>
                            <span class="text-sm font-semibold text-gray-800">${count} (${percentage}%)</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="h-2 rounded-full transition-all duration-500" 
                                 style="width: ${percentage}%; background-color: ${config.color}"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        chartContainer.innerHTML = html;
    },

    /**
     * Renderiza lista de pedidos recientes
     */
    renderRecentOrders() {
        const listContainer = document.getElementById('recent-orders-list');
        const recentOrders = this.state.orders
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

        if (recentOrders.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No hay pedidos recientes</p>';
            return;
        }

        let html = '';
        for (const order of recentOrders) {
            const customer = this.state.customers.find(c => c.id === order.customer_id);
            const statusEmoji = this.getStatusEmoji(order.status);
            const priorityColor = this.getPriorityColor(order.priority);

            html += `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                     onclick="OrdersModule.showOrderDetails('${order.id}')">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">${statusEmoji}</span>
                        <div>
                            <p class="font-medium text-gray-800">${customer?.name || 'Cliente desconocido'}</p>
                            <p class="text-sm text-gray-600">${order.items?.length || 0} items • $${order.total_amount.toFixed(2)}</p>
                        </div>
                    </div>
                    <span class="priority-badge priority-${order.priority}">${order.priority}</span>
                </div>
            `;
        }

        listContainer.innerHTML = html;
    },

    /**
     * Renderiza tabla de pedidos
     */
    renderOrdersTable() {
        const tableBody = document.getElementById('orders-table-body');
        let orders = this.applyFiltersToOrders();

        if (orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-8 text-center text-gray-500">
                        No hay pedidos que mostrar
                    </td>
                </tr>
            `;
            return;
        }

        // Cargar clientes en el filtro
        this.populateCustomerFilter();

        let html = '';
        for (const order of orders) {
            const customer = this.state.customers.find(c => c.id === order.customer_id);
            const statusEmoji = this.getStatusEmoji(order.status);
            const progressPercentage = this.calculateOrderProgress(order);

            html += `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${order.id.substring(0, 8)}...</div>
                        <div class="text-xs text-gray-500">${this.formatDate(order.created_at)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${customer?.name || 'N/A'}</div>
                        <div class="text-xs text-gray-500">${customer?.email || ''}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="status-badge status-${order.status}">
                            ${statusEmoji} ${this.formatStatus(order.status)}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="priority-badge priority-${order.priority}">${order.priority}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="w-32">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-xs text-gray-600">${progressPercentage}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full transition-all" 
                                     style="width: ${progressPercentage}%"></div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${order.items?.length || 0}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        $${order.total_amount.toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="OrdersModule.showOrderDetails('${order.id}')"
                                class="text-blue-600 hover:text-blue-900 mr-3">Ver</button>
                        <button onclick="OrdersModule.updateOrderStatus('${order.id}')"
                                class="text-green-600 hover:text-green-900">Actualizar</button>
                    </td>
                </tr>
            `;
        }

        tableBody.innerHTML = html;
    },

    /**
     * Renderiza grid de clientes
     */
    renderCustomersGrid() {
        const grid = document.getElementById('customers-grid');

        if (this.state.customers.length === 0) {
            grid.innerHTML = '<p class="col-span-full text-gray-500 text-center py-8">No hay clientes registrados</p>';
            return;
        }

        let html = '';
        for (const customer of this.state.customers) {
            const customerOrders = this.state.orders.filter(o => o.customer_id === customer.id);
            const totalSpent = customerOrders.reduce((sum, o) => sum + o.total_amount, 0);

            html += `
                <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span class="text-2xl">👤</span>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-800">${customer.name}</h4>
                                <p class="text-sm text-gray-600">${customer.email}</p>
                            </div>
                        </div>
                        <button onclick="OrdersModule.showEditCustomerModal('${customer.id}')"
                                class="text-blue-600 hover:text-blue-700 text-xl"
                                title="Editar cliente">
                            ✏️
                        </button>
                    </div>

                    ${customer.phone ? `
                        <div class="mb-3 flex items-center gap-2 text-sm text-gray-600">
                            <span>📞</span>
                            <span>${customer.phone}</span>
                        </div>
                    ` : ''}

                    ${customer.company ? `
                        <div class="mb-3 flex items-center gap-2 text-sm text-gray-600">
                            <span>🏢</span>
                            <span>${customer.company}</span>
                        </div>
                    ` : ''}

                    <div class="mt-4 pt-4 border-t border-gray-200">
                        <div class="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p class="text-2xl font-bold text-gray-800">${customerOrders.length}</p>
                                <p class="text-xs text-gray-600">Pedidos</p>
                            </div>
                            <div>
                                <p class="text-2xl font-bold text-gray-800">$${totalSpent.toFixed(2)}</p>
                                <p class="text-xs text-gray-600">Total Gastado</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        grid.innerHTML = html;
    },

    /**
     * Renderiza lotes de producción
     */
    renderProductionBatches() {
        const listContainer = document.getElementById('production-batches-list');

        if (this.state.productionBatches.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No hay lotes de producción activos</p>';
            return;
        }

        let html = '';
        for (const batch of this.state.productionBatches) {
            html += `
                <div class="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div class="flex items-start justify-between mb-4">
                        <div>
                            <h4 class="text-lg font-semibold text-gray-800">Lote ${batch.id.substring(0, 8)}...</h4>
                            <p class="text-sm text-gray-600">Pedido: ${batch.order_id.substring(0, 8)}...</p>
                        </div>
                        <span class="status-badge status-${batch.status}">
                            ${this.formatStatus(batch.status)}
                        </span>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                            <p class="text-xs text-gray-600 mb-1">Items</p>
                            <p class="text-lg font-semibold text-gray-800">${batch.items?.length || 0}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-600 mb-1">Impresora</p>
                            <p class="text-sm font-medium text-gray-800">${batch.assigned_printer || 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-600 mb-1">Inicio</p>
                            <p class="text-sm text-gray-800">${batch.start_time ? this.formatDate(batch.start_time) : 'Pendiente'}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-600 mb-1">Estimado</p>
                            <p class="text-sm text-gray-800">${batch.estimated_completion_time || 'N/A'}</p>
                        </div>
                    </div>

                    ${batch.progress_percentage !== undefined ? `
                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-xs text-gray-600">Progreso</span>
                                <span class="text-xs font-semibold text-gray-800">${batch.progress_percentage}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full transition-all" 
                                     style="width: ${batch.progress_percentage}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        listContainer.innerHTML = html;
    },

    /**
     * Aplica filtros a los pedidos
     */
    applyFiltersToOrders() {
        let filtered = [...this.state.orders];

        if (this.state.filters.customer) {
            filtered = filtered.filter(o => o.customer_id === this.state.filters.customer);
        }

        if (this.state.filters.status) {
            filtered = filtered.filter(o => o.status === this.state.filters.status);
        }

        if (this.state.filters.priority) {
            filtered = filtered.filter(o => o.priority === this.state.filters.priority);
        }

        return filtered;
    },

    /**
     * Aplica los filtros seleccionados
     */
    applyFilters() {
        this.state.filters.customer = document.getElementById('filter-customer').value;
        this.state.filters.status = document.getElementById('filter-status').value;
        this.state.filters.priority = document.getElementById('filter-priority').value;

        this.renderOrdersTable();
    },

    /**
     * Limpia los filtros
     */
    clearFilters() {
        document.getElementById('filter-customer').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-priority').value = '';

        this.state.filters = { customer: '', status: '', priority: '' };
        this.renderOrdersTable();
    },

    /**
     * Puebla el filtro de clientes
     */
    populateCustomerFilter() {
        const select = document.getElementById('filter-customer');
        const currentValue = select.value;

        select.innerHTML = '<option value="">Todos los clientes</option>';
        
        for (const customer of this.state.customers) {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            if (customer.id === currentValue) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    },

    /**
     * Muestra detalles de un pedido
     */
    showOrderDetails(orderId) {
        const order = this.state.orders.find(o => o.id === orderId);
        if (!order) return;

        const customer = this.state.customers.find(c => c.id === order.customer_id);
        
        alert(`Pedido: ${orderId}\nCliente: ${customer?.name}\nEstado: ${order.status}\nTotal: $${order.total_amount}`);
        // TODO: Implementar modal de detalles del pedido
    },

    /**
     * Actualiza estado de un pedido
     */
    async updateOrderStatus(orderId) {
        const newStatus = prompt('Nuevo estado (pending, in_progress, completed, cancelled):');
        if (!newStatus) return;

        try {
            await this.apiPatch(`/orders/${orderId}/status/`, { status: newStatus });
            await this.loadAllData();
            this.refreshCurrentView();
            this.showSuccess('Estado actualizado correctamente');
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            this.showError('Error al actualizar el estado del pedido');
        }
    },

    /**
     * Calcula el progreso de un pedido
     */
    calculateOrderProgress(order) {
        if (order.status === 'completed') return 100;
        if (order.status === 'cancelled') return 0;
        if (order.status === 'in_progress') return 50;
        return 0;
    },

    /**
     * Obtiene emoji para un estado
     */
    getStatusEmoji(status) {
        const emojis = {
            pending: '⏳',
            in_progress: '🔄',
            completed: '✅',
            cancelled: '❌'
        };
        return emojis[status] || '❓';
    },

    /**
     * Obtiene color para una prioridad
     */
    getPriorityColor(priority) {
        const colors = {
            low: 'gray',
            normal: 'blue',
            high: 'orange',
            urgent: 'red'
        };
        return colors[priority] || 'gray';
    },

    /**
     * Formatea un estado para mostrar
     */
    formatStatus(status) {
        const formatted = {
            pending: 'Pendiente',
            in_progress: 'En Progreso',
            completed: 'Completado',
            cancelled: 'Cancelado'
        };
        return formatted[status] || status;
    },

    /**
     * Formatea una fecha
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    },

    /**
     * Sistema de notificaciones
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-2xl">${icons[type]}</span>
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="text-gray-500 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    },

    showSuccess(message) {
        this.showNotification(message, 'success');
    },

    showError(message) {
        this.showNotification(message, 'error');
    },

    showWarning(message) {
        this.showNotification(message, 'warning');
    },

    showInfo(message) {
        this.showNotification(message, 'info');
    },

    // ==========================================
    // GESTIÓN DE MODALES
    // ==========================================

    /**
     * Cierra un modal
     */
    closeModal(modalId, event) {
        if (event && event.target !== event.currentTarget) {
            return; // Click dentro del modal, no cerrar
        }
        
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            
            // Resetear formulario si existe
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                // Limpiar errores
                modal.querySelectorAll('.form-error').forEach(el => el.classList.add('hidden'));
                modal.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
            }
        }
    },

    /**
     * Abre un modal
     */
    openModal(modalId) {
        console.log('Abriendo modal:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            console.log('Modal abierto:', modalId);
        } else {
            console.error('Modal no encontrado:', modalId);
        }
    },

    // ==========================================
    // GESTIÓN DE CLIENTES
    // ==========================================

    /**
     * Muestra modal de crear cliente
     */
    showCreateCustomerModal() {
        this.openModal('modal-create-customer');
        document.getElementById('customer-name').focus();
    },

    /**
     * Muestra modal de editar cliente
     */
    showEditCustomerModal(customerId) {
        const customer = this.state.customers.find(c => c.id === customerId);
        if (!customer) {
            this.showError('Cliente no encontrado');
            return;
        }

        // Rellenar formulario
        document.getElementById('edit-customer-id').value = customer.id;
        document.getElementById('edit-customer-name').value = customer.name;
        document.getElementById('edit-customer-email').value = customer.email;
        document.getElementById('edit-customer-phone').value = customer.phone || '';
        document.getElementById('edit-customer-company').value = customer.company || '';
        document.getElementById('edit-customer-address').value = customer.address || '';
        document.getElementById('edit-customer-notes').value = customer.notes || '';

        this.openModal('modal-edit-customer');
    },

    /**
     * Envía formulario de crear cliente
     */
    async submitCreateCustomer(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const customerData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone') || null,
            company: formData.get('company') || null,
            address: formData.get('address') || null,
            notes: formData.get('notes') || null
        };

        try {
            const newCustomer = await this.apiPost('/customers/', customerData);
            
            this.showSuccess(`Cliente "${newCustomer.name}" creado exitosamente`);
            this.closeModal('modal-create-customer');
            
            // Recargar datos
            await this.loadAllData();
            this.refreshCurrentView();
            
            // Si estamos en el modal de crear pedido, actualizar dropdown
            this.populateCustomerDropdown();
            
        } catch (error) {
            console.error('Error al crear cliente:', error);
            this.showError('Error al crear el cliente: ' + error.message);
        }
    },

    /**
     * Envía formulario de editar cliente
     */
    async submitEditCustomer(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const customerId = formData.get('customer_id');
        
        const customerData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone') || null,
            company: formData.get('company') || null,
            address: formData.get('address') || null,
            notes: formData.get('notes') || null
        };

        try {
            await this.apiPatch(`/customers/${customerId}/`, customerData);
            
            this.showSuccess('Cliente actualizado exitosamente');
            this.closeModal('modal-edit-customer');
            
            // Recargar datos
            await this.loadAllData();
            this.refreshCurrentView();
            
        } catch (error) {
            console.error('Error al actualizar cliente:', error);
            this.showError('Error al actualizar el cliente: ' + error.message);
        }
    },

    // ==========================================
    // GESTIÓN DE PEDIDOS
    // ==========================================

    /**
     * Muestra modal de crear pedido
     */
    showCreateOrderModal() {
        this.populateCustomerDropdown();
        this.resetOrderForm();
        this.openModal('modal-create-order');
    },

    /**
     * Alterna entre tipos de pedido
     */
    toggleOrderType(orderType) {
        const designSection = document.getElementById('design-section');
        const itemsSection = document.querySelector('.border-t.border-gray-200.pt-4');
        
        if (orderType === 'design_and_print') {
            // Mostrar sección de diseño
            designSection.classList.remove('hidden');
            
            // Hacer campos de diseño requeridos
            document.getElementById('design-description').required = true;
            
            // Ocultar sección de items (se agregarán después del diseño)
            if (itemsSection) {
                itemsSection.style.display = 'none';
            }
            
            this.showInfo('💡 Para pedidos con diseño, primero completa la información de diseño. Los items se agregarán una vez aprobado el diseño.');
        } else {
            // Ocultar sección de diseño
            designSection.classList.add('hidden');
            
            // Remover requerimiento de campos de diseño
            document.getElementById('design-description').required = false;
            
            // Mostrar sección de items
            if (itemsSection) {
                itemsSection.style.display = 'block';
            }
        }
    },

    /**
     * Puebla el dropdown de clientes
     */
    populateCustomerDropdown() {
        const select = document.getElementById('order-customer-id');
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">Seleccionar cliente...</option>';
        
        for (const customer of this.state.customers) {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.email})`;
            if (customer.id === currentValue) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    },

    /**
     * Resetea el formulario de pedido
     */
    resetOrderForm() {
        document.getElementById('form-create-order').reset();
        document.getElementById('order-items-list').innerHTML = '';
        this.updateOrderSummary();
        
        // Agregar un item por defecto
        this.addOrderItem();
    },

    /**
     * Agrega un nuevo item al pedido
     */
    addOrderItem() {
        const container = document.getElementById('order-items-list');
        const itemIndex = container.children.length;
        
        const itemHtml = `
            <div class="order-item bg-gray-50 rounded-lg p-4 border border-gray-200" data-item-index="${itemIndex}">
                <div class="flex items-start justify-between mb-3">
                    <h4 class="font-medium text-gray-800">Item #${itemIndex + 1}</h4>
                    <button type="button" 
                            onclick="OrdersModule.removeOrderItem(${itemIndex})"
                            class="text-red-600 hover:text-red-700 text-xl leading-none">
                        ×
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="md:col-span-2">
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            Nombre del Producto <span class="text-red-500">*</span>
                        </label>
                        <input type="text" 
                               name="items[${itemIndex}][name]" 
                               class="form-input text-sm"
                               placeholder="Ej: Engranaje de 20mm"
                               required
                               onchange="OrdersModule.updateOrderSummary()">
                    </div>
                    
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            Cantidad <span class="text-red-500">*</span>
                        </label>
                        <input type="number" 
                               name="items[${itemIndex}][quantity]" 
                               class="form-input text-sm"
                               min="1"
                               value="1"
                               required
                               onchange="OrdersModule.updateOrderSummary()">
                    </div>
                    
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            Precio Unitario <span class="text-red-500">*</span>
                        </label>
                        <input type="number" 
                               name="items[${itemIndex}][unit_price]" 
                               class="form-input text-sm"
                               min="0"
                               step="0.01"
                               value="10.00"
                               required
                               onchange="OrdersModule.updateOrderSummary()">
                    </div>
                    
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            Material
                        </label>
                        <select name="items[${itemIndex}][material]" class="form-input text-sm">
                            <option value="PLA">PLA</option>
                            <option value="ABS">ABS</option>
                            <option value="PETG">PETG</option>
                            <option value="TPU">TPU</option>
                            <option value="Nylon">Nylon</option>
                            <option value="Other">Otro</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            Color
                        </label>
                        <input type="text" 
                               name="items[${itemIndex}][color]" 
                               class="form-input text-sm"
                               placeholder="Ej: Blanco">
                    </div>
                    
                    <div class="md:col-span-2">
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            Archivo STL
                        </label>
                        <input type="text" 
                               name="items[${itemIndex}][file_path]" 
                               class="form-input text-sm"
                               placeholder="Ruta o URL del archivo STL">
                        <p class="text-xs text-gray-500 mt-1">
                            💡 En futuras versiones podrás subir archivos directamente
                        </p>
                    </div>
                    
                    <div class="md:col-span-2">
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            Notas del Item
                        </label>
                        <textarea name="items[${itemIndex}][notes]" 
                                  class="form-input text-sm" 
                                  rows="2"
                                  placeholder="Requisitos especiales, acabado, etc."></textarea>
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', itemHtml);
        this.updateOrderSummary();
    },

    /**
     * Elimina un item del pedido
     */
    removeOrderItem(itemIndex) {
        const container = document.getElementById('order-items-list');
        const item = container.querySelector(`[data-item-index="${itemIndex}"]`);
        
        if (item) {
            item.remove();
            
            // Re-numerar items
            const items = container.querySelectorAll('.order-item');
            items.forEach((item, index) => {
                item.dataset.itemIndex = index;
                item.querySelector('h4').textContent = `Item #${index + 1}`;
            });
            
            this.updateOrderSummary();
        }
    },

    /**
     * Actualiza el resumen del pedido
     */
    updateOrderSummary() {
        const container = document.getElementById('order-items-list');
        const items = container.querySelectorAll('.order-item');
        
        let totalItems = items.length;
        let totalQuantity = 0;
        let totalPrice = 0;
        
        items.forEach(item => {
            const quantity = parseFloat(item.querySelector('[name*="[quantity]"]')?.value || 0);
            const unitPrice = parseFloat(item.querySelector('[name*="[unit_price]"]')?.value || 0);
            
            totalQuantity += quantity;
            totalPrice += quantity * unitPrice;
        });
        
        document.getElementById('summary-items-count').textContent = totalItems;
        document.getElementById('summary-total-quantity').textContent = totalQuantity;
        document.getElementById('summary-total-price').textContent = `$${totalPrice.toFixed(2)}`;
    },

    /**
     * Envía formulario de crear pedido
     */
    async submitCreateOrder(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const orderType = formData.get('order_type');
        
        // Para pedidos con diseño, validar campos de diseño
        if (orderType === 'design_and_print') {
            const description = formData.get('design_description');
            if (!description || description.trim() === '') {
                this.showError('Debe proporcionar una descripción del diseño');
                return;
            }
            
            // Construir objeto design_info
            const designInfo = {
                description: description,
                purpose: formData.get('design_purpose') || null,
                dimensions: formData.get('design_dimensions') || null,
                material_preference: formData.get('design_material_preference') || null,
                color_preference: formData.get('design_color_preference') || null,
                finishing_requirements: formData.get('design_finishing_requirements') || null,
                special_requirements: formData.get('design_special_requirements') || null,
                reference_photos: [], // TODO: Manejar upload de archivos
                technical_drawings: [],
                reference_files: []
            };
            
            const orderData = {
                customer_id: formData.get('customer_id'),
                order_type: orderType,
                design_info: designInfo,
                items: [], // Los items se agregarán después del diseño
                priority: formData.get('priority'),
                due_date: formData.get('due_date') || null,
                notes: formData.get('notes') || null
            };
            
            try {
                const newOrder = await this.apiPost('/orders/', orderData);
                
                this.showSuccess(`Pedido con diseño creado exitosamente. ID: ${newOrder.id.substring(0, 8)}...`);
                this.showInfo('El equipo de diseño será notificado para comenzar el trabajo.');
                this.closeModal('modal-create-order');
                
                // Recargar datos
                await this.loadAllData();
                this.switchTab('orders');
                
            } catch (error) {
                console.error('Error al crear pedido:', error);
                this.showError('Error al crear el pedido: ' + error.message);
            }
            return;
        }
        
        // Para pedidos solo impresión, validar items
        const itemsContainer = document.getElementById('order-items-list');
        const items = itemsContainer.querySelectorAll('.order-item');
        
        if (items.length === 0) {
            document.getElementById('error-order-items').classList.remove('hidden');
            this.showError('Debe agregar al menos un item al pedido');
            return;
        }
        
        // Construir array de items
        const orderItems = [];
        items.forEach((item, index) => {
            const itemData = {
                name: formData.get(`items[${index}][name]`),
                quantity: parseInt(formData.get(`items[${index}][quantity]`)),
                unit_price: parseFloat(formData.get(`items[${index}][unit_price]`)),
                material: formData.get(`items[${index}][material]`),
                color: formData.get(`items[${index}][color]`) || null,
                file_path: formData.get(`items[${index}][file_path]`) || null,
                notes: formData.get(`items[${index}][notes]`) || null
            };
            orderItems.push(itemData);
        });
        
        const orderData = {
            customer_id: formData.get('customer_id'),
            order_type: orderType,
            items: orderItems,
            priority: formData.get('priority'),
            due_date: formData.get('due_date') || null,
            notes: formData.get('notes') || null
        };
        
        try {
            const newOrder = await this.apiPost('/orders/', orderData);
            
            this.showSuccess(`Pedido creado exitosamente (ID: ${newOrder.id.substring(0, 8)}...)`);
            this.closeModal('modal-create-order');
            
            // Recargar datos
            await this.loadAllData();
            
            // Cambiar a la pestaña de pedidos
            this.switchTab('orders');
            
        } catch (error) {
            console.error('Error al crear pedido:', error);
            this.showError('Error al crear el pedido: ' + error.message);
        }
    }
};

// Exportar para uso global
window.OrdersModule = OrdersModule;
