// Gestión de flota para KyberCore SPA
window.initFleetModule = function() {
    async function fetchPrinters() {
        const res = await fetch('/api/fleet/printers');
        const printers = await res.json();
        const tbody = document.getElementById('fleet-printers');
        if (!tbody) return;
        tbody.innerHTML = '';
        printers.forEach(printer => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-2">${printer.name}</td>
                <td class="px-4 py-2">${printer.model}</td>
                <td class="px-4 py-2">${printer.ip}</td>
                <td class="px-4 py-2">${printer.status}</td>
                <td class="px-4 py-2">${printer.capabilities || ''}</td>
                <td class="px-4 py-2">${printer.location || ''}</td>
                <td class="px-4 py-2">
                    <button onclick="deletePrinter('${printer.id}')" class="text-red-600 hover:underline">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.deletePrinter = async function(id) {
        await fetch(`/api/fleet/printers/${id}`, { method: 'DELETE' });
        fetchPrinters();
    }

    const form = document.getElementById('add-printer-form');
    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const data = {
                name: document.getElementById('printer-name').value,
                model: document.getElementById('printer-model').value,
                ip: document.getElementById('printer-ip').value,
                status: 'offline',
                capabilities: document.getElementById('printer-capabilities').value,
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
    fetchPrinters();
}
