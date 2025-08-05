// Gestión de flota para KyberCore SPA
window.initFleetModule = function() {
    let updateInterval;

    async function fetchPrinters() {
        try {
            const res = await fetch('/api/fleet/printers');
            const printers = await res.json();
            const tbody = document.getElementById('fleet-printers');
            if (!tbody) return;
            tbody.innerHTML = '';
            printers.forEach(printer => {
                const tr = document.createElement('tr');
                const extruderTemp = printer.realtime_data?.extruder_temp ?? 'N/A';
                const extruderTarget = printer.realtime_data?.extruder_target ?? 'N/A';
                const bedTemp = printer.realtime_data?.bed_temp ?? 'N/A';
                const bedTarget = printer.realtime_data?.bed_target ?? 'N/A';

            tr.innerHTML = `
                <td class="px-4 py-2">${printer.name}</td>
                <td class="px-4 py-2">${printer.model}</td>
                <td class="px-4 py-2">${printer.ip}</td>
                <td class="px-4 py-2">${printer.status}</td>
                <td class="px-4 py-2">${extruderTemp} / ${extruderTarget}</td>
                <td class="px-4 py-2">${bedTemp} / ${bedTarget}</td>
                <td class="px-4 py-2">${printer.capabilities?.join(', ') || ''}</td>
                <td class="px-4 py-2">${printer.location || ''}</td>
                <td class="px-4 py-2">
                    <button onclick="deletePrinter('${printer.id}')" class="text-red-600 hover:underline">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Actualizar timestamp de última actualización
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            const now = new Date();
            lastUpdateElement.textContent = `Última actualización: ${now.toLocaleTimeString()}`;
        }
        } catch (error) {
            console.error('Error al obtener datos de impresoras:', error);
        }
    }

    // Función para iniciar actualizaciones automáticas
    function startAutoUpdate() {
        // Limpiar intervalo anterior si existe
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        
        // Actualizar cada 5 segundos
        updateInterval = setInterval(fetchPrinters, 5000);
    }

    // Función para detener actualizaciones automáticas
    window.stopFleetUpdates = function() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }

    window.deletePrinter = async function(id) {
        await fetch(`/api/fleet/printers/${id}`, { method: 'DELETE' });
        fetchPrinters();
    }

    const form = document.getElementById('add-printer-form');
    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const capabilitiesValue = document.getElementById('printer-capabilities').value;
            const data = {
                name: document.getElementById('printer-name').value,
                model: document.getElementById('printer-model').value,
                ip: document.getElementById('printer-ip').value,
                status: 'offline',
                capabilities: capabilitiesValue.split(',').map(item => item.trim()).filter(item => item),
                location: document.getElementById('printer-location').value
            };
            try {
                const response = await fetch('/api/fleet/printers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    alert('Impresora agregada con éxito');
                    e.target.reset();
                    fetchPrinters();
                } else {
                    const errorData = await response.json();
                    alert(`Error al agregar la impresora: ${errorData.detail}`);
                }
            } catch (error) {
                console.error('Error en la solicitud:', error);
                alert('Ocurrió un error de red. Por favor, inténtalo de nuevo.');
            }
        });
    }
    
    // Cargar datos inicialmente
    fetchPrinters();
    
    // Iniciar actualizaciones automáticas
    startAutoUpdate();
}
