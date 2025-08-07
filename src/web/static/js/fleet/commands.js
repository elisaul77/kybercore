// Módulo de comandos para las impresoras
window.FleetCommands = (function() {
    
    // Función para hacer homing en ejes específicos
    async function homePrinter(printerId, axis, event = null) {
        try {
            console.log(`🏠 Ejecutando homing ${axis} en impresora ${printerId}`);
            
            const response = await fetch(`/api/fleet/printers/${printerId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
                body: JSON.stringify({
                    command: 'home',
                    axis: axis
                })
            });
            
            if (response.ok) {
                console.log(`✅ Homing ${axis} ejecutado exitosamente`);
                // Mostrar feedback visual temporal si hay evento
                if (event && event.target) {
                    const button = event.target;
                    const originalText = button.innerHTML;
                    button.innerHTML = '✅';
                    button.disabled = true;
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.disabled = false;
                    }, 2000);
                }
            } else {
                console.error('Error en homing:', response.status);
                alert(`Error al ejecutar homing ${axis}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        }
    }

    // Función para pausar impresión
    async function pausePrinter(printerId, event = null) {
        try {
            console.log(`⏸️ Pausando impresora ${printerId}`);
            
            const response = await fetch(`/api/fleet/printers/${printerId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
                body: JSON.stringify({
                    command: 'pause'
                })
            });
            
            if (response.ok) {
                console.log('✅ Impresión pausada exitosamente');
                // Mostrar feedback visual si hay evento
                if (event && event.target) {
                    const button = event.target;
                    const originalText = button.innerHTML;
                    button.innerHTML = '✅';
                    setTimeout(() => {
                        button.innerHTML = originalText;
                    }, 2000);
                }
            } else {
                console.error('Error pausando:', response.status);
                alert('Error al pausar impresión');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        }
    }

    // Función para reanudar impresión
    async function resumePrinter(printerId, event = null) {
        try {
            console.log(`▶️ Reanudando impresora ${printerId}`);
            
            const response = await fetch(`/api/fleet/printers/${printerId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
                body: JSON.stringify({
                    command: 'resume'
                })
            });
            
            if (response.ok) {
                console.log('✅ Impresión reanudada exitosamente');
                // Mostrar feedback visual si hay evento
                if (event && event.target) {
                    const button = event.target;
                    const originalText = button.innerHTML;
                    button.innerHTML = '✅';
                    setTimeout(() => {
                        button.innerHTML = originalText;
                    }, 2000);
                }
            } else {
                console.error('Error reanudando:', response.status);
                alert('Error al reanudar impresión');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        }
    }

    // Función para cancelar impresión
    async function cancelPrinter(printerId, event = null) {
        try {
            // Confirmar la acción porque es destructiva
            if (!confirm('¿Estás seguro de que quieres cancelar la impresión? Esta acción no se puede deshacer.')) {
                return;
            }
            
            console.log(`❌ Cancelando impresión en impresora ${printerId}`);
            
            const response = await fetch(`/api/fleet/printers/${printerId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
                body: JSON.stringify({
                    command: 'cancel'
                })
            });
            
            if (response.ok) {
                console.log('✅ Impresión cancelada exitosamente');
                // Mostrar feedback visual si hay evento
                if (event && event.target) {
                    const button = event.target;
                    const originalText = button.innerHTML;
                    button.innerHTML = '✅';
                    setTimeout(() => {
                        button.innerHTML = originalText;
                    }, 2000);
                }
            } else {
                console.error('Error cancelando:', response.status);
                alert('Error al cancelar impresión');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        }
    }
    
    // Función para eliminar impresora
    async function deletePrinter(id) {
        try {
            const response = await fetch(`/api/fleet/printers/${id}`, { 
                method: 'DELETE',
                cache: 'no-store'
            });
            if (response.ok) {
                const row = document.querySelector(`tr[data-printer-id="${id}"]`);
                if (row) row.remove();
                console.log('Impresora eliminada');
                
                // Actualizar estado de la flota después de eliminar
                const tbody = document.getElementById('fleet-printers');
                const remainingRows = tbody.querySelectorAll('tr[data-printer-id]');
                let connectedCount = 0;
                remainingRows.forEach(row => {
                    const statusSpan = row.querySelector('.status-badge');
                    if (statusSpan && !statusSpan.textContent.includes('unreachable')) {
                        connectedCount++;
                    }
                });
                
                const state = window.FleetState;
                state.setFleetState({
                    isConnected: connectedCount > 0,
                    printerCount: remainingRows.length,
                    hasError: false
                });
                window.FleetUI.syncConnectionStatus();
            } else {
                alert('Error al eliminar');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        }
    }
    
    return {
        homePrinter,
        pausePrinter,
        resumePrinter,
        cancelPrinter,
        deletePrinter
    };
})();
