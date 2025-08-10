/**
 * Módulo de gestión de consumibles para KyberCore
 * Maneja la interfaz de inventario de filamentos y materiales
 */

// --- ESTADO GLOBAL DEL MÓDULO ---
let consumablesData = {
    filaments: [],
    filters: {
        status: '',
        type: '',
        brand: '',
        search: ''
    },
    statistics: {}
};

// --- API ENDPOINTS ---
const CONSUMABLES_API = {
    filaments: '/api/consumables/filaments',
    stats: '/api/consumables/stats',
    lowStock: '/api/consumables/low-stock',
    colors: '/api/consumables/colors',
    types: '/api/consumables/types',
    brands: '/api/consumables/brands'
};

// --- INICIALIZACIÓN DEL MÓDULO ---
function initConsumablesModule() {
    console.log('Inicializando módulo de consumibles...');
    
    // Configurar event listeners
    setupEventListeners();
    
    // Cargar datos iniciales
    loadConsumablesData();
    
    // Actualizar KPIs en el dashboard
    updateConsumablesKPIs();
    
    console.log('Módulo de consumibles inicializado correctamente');
}

// --- CONFIGURACIÓN DE EVENT LISTENERS ---
function setupEventListeners() {
    // Filtros
    const statusFilter = document.getElementById('filter-status');
    const typeFilter = document.getElementById('filter-type');
    const brandFilter = document.getElementById('filter-brand');
    const searchInput = document.getElementById('search-filaments');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            consumablesData.filters.status = statusFilter.value;
            filterFilaments();
        });
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            consumablesData.filters.type = typeFilter.value;
            filterFilaments();
        });
    }
    
    if (brandFilter) {
        brandFilter.addEventListener('change', () => {
            consumablesData.filters.brand = brandFilter.value;
            filterFilaments();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            consumablesData.filters.search = searchInput.value.toLowerCase();
            filterFilaments();
        });
    }
    
    // Botones de acción
    const addFilamentBtn = document.getElementById('add-filament-btn');
    const restockBtn = document.getElementById('restock-btn');
    const exportBtn = document.getElementById('export-inventory-btn');
    const refreshBtn = document.getElementById('refresh-inventory-btn');
    
    if (addFilamentBtn) {
        addFilamentBtn.addEventListener('click', openAddFilamentModal);
    }
    
    if (restockBtn) {
        restockBtn.addEventListener('click', openRestockModal);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportInventory);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadConsumablesData();
            showNotification('Inventario actualizado', 'success');
        });
    }
}

// --- CARGA DE DATOS ---
async function loadConsumablesData() {
    try {
        console.log('Cargando datos de consumibles desde la API...');
        
        // Cargar filamentos desde la API
        const filamentsResponse = await fetch(CONSUMABLES_API.filaments);
        if (!filamentsResponse.ok) {
            throw new Error(`Error al cargar filamentos: ${filamentsResponse.status}`);
        }
        const filamentsData = await filamentsResponse.json();
        
        if (filamentsData.success) {
            consumablesData.filaments = filamentsData.data;
            console.log(`Cargados ${filamentsData.total} filamentos`);
        } else {
            throw new Error('Error en la respuesta de filamentos');
        }
        
        // Cargar estadísticas desde la API
        const statsResponse = await fetch(CONSUMABLES_API.stats);
        if (!statsResponse.ok) {
            throw new Error(`Error al cargar estadísticas: ${statsResponse.status}`);
        }
        const statsData = await statsResponse.json();
        
        if (statsData.success) {
            consumablesData.statistics = statsData.data;
            console.log('Estadísticas cargadas correctamente');
        } else {
            throw new Error('Error en la respuesta de estadísticas');
        }
        
        // Renderizar la interfaz
        renderFilamentInventory();
        updateConsumablesKPIs();
        updateColorPalette();
        updateQuickStats();
        updateStockAlerts();
        
    } catch (error) {
        console.error('Error al cargar datos de consumibles:', error);
        showNotification('Error al cargar el inventario: ' + error.message, 'error');
        
        // Mostrar mensaje de error en la interfaz
        const filamentsGrid = document.getElementById('filaments-grid');
        if (filamentsGrid) {
            filamentsGrid.innerHTML = `
                <div class="text-center py-8 text-red-500 col-span-full">
                    <div class="text-4xl mb-2">❌</div>
                    <p class="font-medium">Error al cargar el inventario</p>
                    <p class="text-sm text-gray-500 mt-1">${error.message}</p>
                    <button onclick="loadConsumablesData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }
}

// --- ACTUALIZACIÓN DE KPIS ---
function updateConsumablesKPIs() {
    const stats = consumablesData.statistics;
    if (!stats) return;
    
    // Actualizar KPIs principales en el template KPI
    updateKPI('total-filaments-kpi', stats.total_filaments);
    updateKPI('colors-available-kpi', stats.colors_available || stats.colors_list?.length || 0);
    updateKPI('types-available-kpi', stats.types_available || stats.types_list?.length || 0);
    updateKPI('low-stock-kpi', stats.low_stock);
    
    // Actualizar KPIs de valores en el template KPI
    updateKPI('total-weight-kpi', `${(stats.total_weight_kg || 0).toFixed(1)} kg`);
    updateKPI('total-value-kpi', `€${(stats.total_value || 0).toFixed(2)}`);
    updateKPI('estimated-time-kpi', `${Math.round(stats.estimated_print_hours || 0)}h`);
    
    // Actualizar gráfico de estado del stock
    updateStockChart(stats);
    
    console.log('KPIs de consumibles actualizados');
}

function updateStockChart(stats) {
    const inStockEl = document.querySelector('[data-stock-status="in_stock"]');
    const lowStockEl = document.querySelector('[data-stock-status="low_stock"]');
    const outOfStockEl = document.querySelector('[data-stock-status="out_of_stock"]');
    
    if (inStockEl) inStockEl.textContent = `${stats.in_stock} En Stock`;
    if (lowStockEl) lowStockEl.textContent = `${stats.low_stock} Stock Bajo`;
    if (outOfStockEl) outOfStockEl.textContent = `${stats.out_of_stock} Sin Stock`;
}

// --- UTILIDAD PARA ACTUALIZAR KPIS ---
function updateKPI(elementId, value) {
    const element = document.querySelector(`[data-kpi="${elementId}"]`);
    if (element) {
        element.textContent = value;
    }
}

// --- RENDERIZADO DEL INVENTARIO ---
function renderFilamentInventory() {
    const filamentsGrid = document.getElementById('filaments-grid');
    const filamentsCount = document.getElementById('filaments-count');
    
    if (!filamentsGrid) {
        console.error('No se encontró el contenedor del inventario');
        return;
    }
    
    const filaments = getFilteredFilaments();
    
    // Actualizar contador
    if (filamentsCount) {
        filamentsCount.textContent = `${filaments.length} filamentos`;
    }
    
    if (filaments.length === 0) {
        filamentsGrid.innerHTML = `
            <div class="text-center py-8 text-gray-500 col-span-full">
                <div class="text-4xl mb-2">📦</div>
                <p>No hay filamentos que coincidan con los filtros</p>
            </div>
        `;
        return;
    }
    
    const template = document.getElementById('filament-card-template');
    if (!template) {
        console.error('No se encontró el template de tarjeta de filamento');
        return;
    }
    
    filamentsGrid.innerHTML = '';
    
    filaments.forEach(filament => {
        const card = template.content.cloneNode(true);
        
        // Rellenar datos del filamento
        card.querySelector('.filament-color').style.backgroundColor = getColorCode(filament.color);
        card.querySelector('.filament-name').textContent = filament.name;
        card.querySelector('.filament-type').textContent = filament.filament_type;
        card.querySelector('.filament-brand').textContent = filament.brand;
        card.querySelector('.filament-diameter').textContent = filament.diameter || '1.75';
        card.querySelector('.filament-temp').textContent = filament.temperature_nozzle || '200';
        card.querySelector('.remaining-percentage').textContent = `${Math.round(filament.remaining_percentage)}%`;
        card.querySelector('.remaining-weight').textContent = `${filament.remaining_weight}kg`;
        card.querySelector('.total-weight').textContent = `${filament.weight_kg}kg`;
        
        // Configurar barra de progreso
        const progressBar = card.querySelector('.stock-progress');
        progressBar.style.width = `${filament.remaining_percentage}%`;
        progressBar.className = `stock-progress h-2 rounded-full transition-all duration-300 ${getProgressBarColor(filament.stock_status)}`;
        
        // Configurar badge de estado
        const statusBadge = card.querySelector('.stock-status-badge');
        statusBadge.textContent = getStatusText(filament.stock_status);
        statusBadge.className = `stock-status-badge px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(filament.stock_status)}`;
        
        // Configurar botones
        const consumeBtn = card.querySelector('.consume-btn');
        const restockBtn = card.querySelector('.restock-btn');
        const editBtn = card.querySelector('.edit-btn');
        
        consumeBtn.onclick = () => openConsumeModal(filament);
        restockBtn.onclick = () => openRestockModal(filament);
        editBtn.onclick = () => openEditModal(filament);
        
        // Deshabilitar consumo si no hay stock
        if (filament.stock_status === 'out_of_stock') {
            consumeBtn.disabled = true;
            consumeBtn.className += ' opacity-50 cursor-not-allowed';
        }
        
        filamentsGrid.appendChild(card);
    });
    
    console.log(`Renderizados ${filaments.length} filamentos`);
}

// --- FUNCIONES AUXILIARES ---
function getFilteredFilaments() {
    return consumablesData.filaments.filter(filament => {
        const filters = consumablesData.filters;
        
        if (filters.status && filament.stock_status !== filters.status) return false;
        if (filters.type && filament.filament_type !== filters.type) return false;
        if (filters.brand && filament.brand !== filters.brand) return false;
        if (filters.search && !filament.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        
        return true;
    });
}

function getColorCode(colorName) {
    const colorMap = {
        'Negro': '#2d3748',
        'Blanco': '#f7fafc',
        'Rojo': '#e53e3e',
        'Azul': '#3182ce',
        'Verde': '#38a169',
        'Amarillo': '#d69e2e',
        'Transparente': '#e2e8f0',
        'Madera': '#d69e2e'
    };
    return colorMap[colorName] || '#718096';
}

function getProgressBarColor(status) {
    switch (status) {
        case 'in_stock': return 'bg-green-500';
        case 'low_stock': return 'bg-yellow-500';
        case 'out_of_stock': return 'bg-red-500';
        default: return 'bg-gray-500';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'in_stock': return 'En Stock';
        case 'low_stock': return 'Stock Bajo';
        case 'out_of_stock': return 'Sin Stock';
        default: return 'Desconocido';
    }
}

function getStatusBadgeColor(status) {
    switch (status) {
        case 'in_stock': return 'bg-green-100 text-green-800';
        case 'low_stock': return 'bg-yellow-100 text-yellow-800';
        case 'out_of_stock': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// --- FILTRADO DE FILAMENTOS ---
function filterFilaments() {
    // Implementar lógica de filtrado
    console.log('Aplicando filtros:', consumablesData.filters);
    renderFilamentInventory();
}

// --- MODALES Y ACCIONES ---
function openAddFilamentModal() {
    console.log('Abriendo modal para agregar filamento...');
    const modal = document.getElementById('add-filament-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function openConsumeModal(filament) {
    console.log('Abriendo modal de consumo para:', filament.name);
    const modal = document.getElementById('consume-modal');
    if (modal) {
        // Rellenar información del filamento
        modal.querySelector('.consume-color').style.backgroundColor = getColorCode(filament.color);
        modal.querySelector('.consume-name').textContent = filament.name;
        modal.querySelector('.consume-available').textContent = `${filament.remaining_weight}kg`;
        
        // Configurar límite máximo en el input
        const amountInput = modal.querySelector('input[name="amount"]');
        if (amountInput) {
            amountInput.max = filament.remaining_weight;
            amountInput.value = '';
        }
        
        // Guardar ID del filamento para el submit
        modal.dataset.filamentId = filament.id;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function openRestockModal(filament) {
    console.log('Abriendo modal de reabastecimiento para:', filament.name);
    const modal = document.getElementById('restock-modal');
    if (modal) {
        // Rellenar información del filamento
        modal.querySelector('.restock-color').style.backgroundColor = getColorCode(filament.color);
        modal.querySelector('.restock-name').textContent = filament.name;
        modal.querySelector('.restock-current').textContent = `${filament.remaining_weight}kg`;
        
        // Limpiar input
        const amountInput = modal.querySelector('input[name="amount"]');
        if (amountInput) {
            amountInput.value = '';
        }
        
        // Guardar ID del filamento para el submit
        modal.dataset.filamentId = filament.id;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function openEditModal(filament) {
    console.log('Abriendo modal de edición para:', filament.name);
    // Implementar modal de edición
    showNotification('Función de edición en desarrollo', 'info');
}

function exportInventory() {
    console.log('Exportando inventario...');
    // Implementar exportación
    showNotification('Función de exportación en desarrollo', 'info');
}

// --- ACTUALIZACIÓN DE COMPONENTES ---
function updateColorPalette() {
    const colorPalette = document.getElementById('color-palette');
    const stats = consumablesData.statistics;
    
    if (!colorPalette || !stats?.colors_list) return;
    
    const template = document.getElementById('color-template');
    if (!template) return;
    
    colorPalette.innerHTML = '';
    
    stats.colors_list.forEach(color => {
        const colorElement = template.content.cloneNode(true);
        const swatch = colorElement.querySelector('.color-swatch');
        const name = colorElement.querySelector('.color-name');
        const count = colorElement.querySelector('.color-count');
        
        const filamentCount = consumablesData.filaments.filter(f => 
            f.color === color && f.stock_status !== 'out_of_stock'
        ).length;
        
        swatch.style.backgroundColor = getColorCode(color);
        name.textContent = color;
        count.textContent = `${filamentCount} bobina${filamentCount !== 1 ? 's' : ''}`;
        
        colorPalette.appendChild(colorElement);
    });
    
    // Actualizar resumen
    const totalColors = document.getElementById('total-colors');
    const mostUsedColor = document.getElementById('most-used-color');
    
    if (totalColors) totalColors.textContent = stats.colors_list.length;
    if (mostUsedColor && stats.colors_list.length > 0) {
        mostUsedColor.textContent = stats.colors_list[0]; // Simplificado
    }
}

function updateQuickStats() {
    const stats = consumablesData.statistics;
    if (!stats) return;
    
    const totalValue = document.getElementById('total-value');
    const totalWeight = document.getElementById('total-weight');
    const estimatedTime = document.getElementById('estimated-time');
    const mostCritical = document.getElementById('most-critical');
    const popularType = document.getElementById('popular-type');
    
    if (totalValue) totalValue.textContent = `€${(stats.total_value || 0).toFixed(0)}`;
    if (totalWeight) totalWeight.textContent = `${(stats.total_weight_kg || 0).toFixed(1)} kg`;
    if (estimatedTime) estimatedTime.textContent = `${Math.round(stats.estimated_print_hours || 0)}h`;
    
    // Filamento más crítico (menor stock)
    if (mostCritical) {
        const critical = consumablesData.filaments
            .filter(f => f.stock_status === 'low_stock' || f.stock_status === 'out_of_stock')
            .sort((a, b) => a.remaining_percentage - b.remaining_percentage)[0];
        mostCritical.textContent = critical ? critical.name.substring(0, 15) + '...' : '-';
    }
    
    // Tipo más popular
    if (popularType && stats.types_list?.length > 0) {
        popularType.textContent = stats.types_list[0]; // Simplificado
    }
}

async function updateStockAlerts() {
    try {
        const response = await fetch(CONSUMABLES_API.lowStock);
        if (!response.ok) {
            throw new Error(`Error al cargar alertas: ${response.status}`);
        }
        
        const alertsData = await response.json();
        const alertsContainer = document.getElementById('stock-alerts');
        const noAlertsEl = document.getElementById('no-alerts');
        
        if (!alertsContainer) return;
        
        if (!alertsData.success || alertsData.data.length === 0) {
            if (noAlertsEl) noAlertsEl.style.display = 'block';
            return;
        }
        
        if (noAlertsEl) noAlertsEl.style.display = 'none';
        
        const template = document.getElementById('alert-template');
        if (!template) return;
        
        // Limpiar alertas anteriores (excepto el mensaje de "sin alertas")
        const existingAlerts = alertsContainer.querySelectorAll('.alert-item');
        existingAlerts.forEach(alert => alert.remove());
        
        alertsData.data.forEach(filament => {
            const alertElement = template.content.cloneNode(true);
            
            const title = alertElement.querySelector('.alert-title');
            const description = alertElement.querySelector('.alert-description');
            const color = alertElement.querySelector('.alert-color');
            const remaining = alertElement.querySelector('.alert-remaining');
            const action = alertElement.querySelector('.alert-action');
            const alertContainer = alertElement.querySelector('.alert-item');
            
            title.textContent = filament.name;
            description.textContent = `${filament.filament_type} - ${filament.brand}`;
            color.style.backgroundColor = getColorCode(filament.color);
            remaining.textContent = `${filament.remaining_weight}kg restante`;
            
            if (filament.stock_status === 'out_of_stock') {
                alertContainer.className += ' bg-red-50 border-red-400';
                action.textContent = 'Reabastecer';
                action.className += ' bg-red-500 hover:bg-red-600';
                action.onclick = () => openRestockModal(filament);
            } else {
                alertContainer.className += ' bg-yellow-50 border-yellow-400';
                action.textContent = 'Revisar';
                action.className += ' bg-yellow-500 hover:bg-yellow-600';
                action.onclick = () => openEditModal(filament);
            }
            
            alertsContainer.appendChild(alertElement);
        });
        
    } catch (error) {
        console.error('Error al cargar alertas:', error);
    }
}

// --- NOTIFICACIONES ---
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Implementar sistema de notificaciones visual
}

// --- EXPOSICIÓN GLOBAL ---
window.initConsumablesModule = initConsumablesModule;

// --- AUTO-INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si estamos en el módulo de consumibles
    if (document.getElementById('consumables')) {
        initConsumablesModule();
    }
});

// --- INTEGRACIÓN CON APP.JS ---
// Esta función será llamada desde app.js cuando se navegue al módulo
window.consumablesModuleReady = function() {
    setTimeout(() => {
        if (typeof initConsumablesModule === 'function') {
            initConsumablesModule();
        }
    }, 100);
};
