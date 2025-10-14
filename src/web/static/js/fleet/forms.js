// Módulo de formularios para la gestión de flota
window.FleetForms = (function() {
    
    function initAddPrinterForm() {
        // Configurar formulario
        const form = document.getElementById('add-printer-form');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const data = {
                    name: document.getElementById('printer-name').value,
                    model: document.getElementById('printer-model').value,
                    ip: document.getElementById('printer-ip').value,
                    status: 'offline',
                    capabilities: document.getElementById('printer-capabilities').value.split(',').map(s => s.trim()).filter(s => s),
                    location: document.getElementById('printer-location').value
                };
                
                try {
                    const response = await fetch('/api/fleet/printers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        cache: 'no-store',
                        body: JSON.stringify(data)
                    });
                    
                    if (response.ok) {
                        alert('Impresora agregada');
                        form.reset();
                        window.FleetData.loadRealData();
                    } else {
                        alert('Error al agregar');
                    }
                } catch (error) {
                    alert('Error de red');
                }
            });
        }
    }
    
    // 🆕 Mostrar modal de edición de impresora
    function showEditPrinterModal(printer) {
        console.log('🎨 Mostrando modal de edición para:', printer);
        
        const modal = document.getElementById('edit-printer-modal');
        if (!modal) {
            console.error('❌ Modal de edición no encontrado');
            return;
        }
        
        // Rellenar campos del formulario
        document.getElementById('edit-printer-id').value = printer.id;
        document.getElementById('edit-printer-name').value = printer.name || '';
        document.getElementById('edit-printer-model').value = printer.model || '';
        document.getElementById('edit-printer-local-ip').value = printer.local_ip || printer.ip || '';
        document.getElementById('edit-printer-vpn-ip').value = printer.vpn_ip || '';
        document.getElementById('edit-printer-priority').value = printer.connection_priority || 'local_first';
        document.getElementById('edit-printer-location').value = printer.location || '';
        document.getElementById('edit-printer-capabilities').value = (printer.capabilities || []).join(', ');
        
        // Limpiar estados de prueba
        document.getElementById('local-ip-status').textContent = '';
        document.getElementById('vpn-ip-status').textContent = '';
        
        // Mostrar modal
        modal.classList.remove('hidden');
        
        // Configurar listeners de botones si no están configurados
        setupEditModalListeners();
    }
    
    // 🔧 Configurar listeners del modal de edición
    function setupEditModalListeners() {
        // Cerrar modal
        const closeBtn = document.getElementById('close-edit-modal');
        const cancelBtn = document.getElementById('cancel-edit-btn');
        
        if (closeBtn) {
            closeBtn.onclick = () => {
                document.getElementById('edit-printer-modal').classList.add('hidden');
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                document.getElementById('edit-printer-modal').classList.add('hidden');
            };
        }
        
        // Botones de prueba de IP
        const testLocalBtn = document.getElementById('test-local-ip-btn');
        const testVpnBtn = document.getElementById('test-vpn-ip-btn');
        
        if (testLocalBtn) {
            testLocalBtn.onclick = async () => {
                const ip = document.getElementById('edit-printer-local-ip').value;
                await testIPConnection(ip, 'local');
            };
        }
        
        if (testVpnBtn) {
            testVpnBtn.onclick = async () => {
                const ip = document.getElementById('edit-printer-vpn-ip').value;
                await testIPConnection(ip, 'vpn');
            };
        }
        
        // Formulario de edición
        const form = document.getElementById('edit-printer-form');
        if (form && !form.dataset.listenerAttached) {
            form.dataset.listenerAttached = 'true';
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleEditPrinterSubmit();
            });
        }
    }
    
    // 🧪 Probar conexión a una IP
    async function testIPConnection(ip, type) {
        if (!ip) {
            alert(`Por favor ingresa una IP de ${type === 'local' ? 'red local' : 'VPN'}`);
            return;
        }
        
        const statusEl = document.getElementById(`${type}-ip-status`);
        statusEl.textContent = '🔄 Probando conexión...';
        statusEl.className = 'text-xs mt-1 block text-blue-600';
        
        try {
            // Usar el endpoint de prueba de IP directamente
            const response = await fetch(`/api/fleet/test-ip?ip=${encodeURIComponent(ip)}`);
            const data = await response.json();
            
            if (data.reachable) {
                statusEl.textContent = '✅ Conexión exitosa';
                statusEl.className = 'text-xs mt-1 block text-green-600 font-semibold';
            } else {
                statusEl.textContent = '❌ No se pudo conectar';
                statusEl.className = 'text-xs mt-1 block text-red-600 font-semibold';
            }
        } catch (error) {
            console.error('Error probando IP:', error);
            statusEl.textContent = '❌ Error de red';
            statusEl.className = 'text-xs mt-1 block text-red-600 font-semibold';
        }
    }
    
    // 💾 Manejar envío del formulario de edición
    async function handleEditPrinterSubmit() {
        const printerId = document.getElementById('edit-printer-id').value;
        
        const data = {
            name: document.getElementById('edit-printer-name').value,
            model: document.getElementById('edit-printer-model').value,
            local_ip: document.getElementById('edit-printer-local-ip').value || null,
            vpn_ip: document.getElementById('edit-printer-vpn-ip').value || null,
            connection_priority: document.getElementById('edit-printer-priority').value,
            location: document.getElementById('edit-printer-location').value || null,
            capabilities: document.getElementById('edit-printer-capabilities').value
                .split(',')
                .map(s => s.trim())
                .filter(s => s)
        };
        
        console.log('💾 Guardando cambios de impresora:', printerId, data);
        
        try {
            const response = await fetch(`/api/fleet/printers/${printerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                alert('✅ Impresora actualizada exitosamente');
                document.getElementById('edit-printer-modal').classList.add('hidden');
                
                // Recargar datos
                if (window.FleetData && window.FleetData.loadRealData) {
                    await window.FleetData.loadRealData();
                }
            } else {
                const error = await response.json();
                alert(`❌ Error al actualizar: ${error.detail || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error actualizando impresora:', error);
            alert('❌ Error de red al actualizar');
        }
    }
    
    return {
        initAddPrinterForm,
        showEditPrinterModal
    };
})();
