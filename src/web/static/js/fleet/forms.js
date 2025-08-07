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
    
    return {
        initAddPrinterForm
    };
})();
