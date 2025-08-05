document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE ---
    let appData = {};

    // --- API URL ---
    const API_URL = 'http://127.0.0.1:8000';

    // --- DOM ELEMENTS ---
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const contentSections = document.querySelectorAll('.main-content > section');
    const printerSelect = document.getElementById('printer-select');
    const filamentSelect = document.getElementById('filament-select');
    const getProfileBtn = document.getElementById('get-profile-btn');
    const recommenderForm = document.getElementById('recommender-form');
    const recommenderResult = document.getElementById('recommender-result');
    const analysisTabs = document.querySelectorAll('.analysis-tab');
    const analysisContents = document.querySelectorAll('.analysis-content');
    const analyzeLogBtn = document.getElementById('analyze-log-btn');
    const logResult = document.getElementById('log-result');
    const analyzePhotoBtn = document.getElementById('analyze-photo-btn');
    const photoResult = document.getElementById('photo-result');
    const printQueueEl = document.getElementById('print-queue');
    const fleetPrintersEl = document.getElementById('fleet-printers');

    // New Job AI Elements
    const steps = document.querySelectorAll('.step');
    const uploadStlBtn = document.getElementById('upload-stl-btn');
    const analysisLoader = document.getElementById('analysis-loader');
    const analysisResult = document.getElementById('analysis-result');
    const gotoStep3Btn = document.getElementById('goto-step3-btn');
    const jobFilamentSelect = document.getElementById('job-filament-select');
    const gotoStep4Btn = document.getElementById('goto-step4-btn');
    const autoProfileBtn = document.getElementById('auto-profile-btn');
    const uploadProfileBtn = document.getElementById('upload-profile-btn');
    const slicingLoader = document.getElementById('slicing-loader');
    const slicingLoaderText = document.getElementById('slicing-loader-text');
    const slicingResult = document.getElementById('slicing-result');
    const recommendedPrinterEl = document.getElementById('recommended-printer');
    const recommendationReasonEl = document.getElementById('recommendation-reason');
    const cloudSliceBtn = document.getElementById('cloud-slice-btn');
    const localSliceBtn = document.getElementById('local-slice-btn');
    const slicingStatus = document.getElementById('slicing-status');


    // --- INITIALIZATION ---
    async function init() {
        // Fetch data from the backend
        try {
            const response = await fetch(`${API_URL}/api/fleet/data`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            appData = await response.json();
        } catch (error) {
            console.error("Failed to fetch data from backend:", error);
            // Handle error display in the UI
            document.body.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert"><strong class="font-bold">Error de Conexión!</strong><span class="block sm:inline"> No se pudo conectar a la API de KyberCore. Asegúrate de que el backend esté corriendo en ${API_URL}.</span></div>`;
            return;
        }

        // Navigation
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                navigateTo(targetId);
            });
        });
        navigateTo('dashboard'); // Default view

        // Populate Selects
        appData.printers.forEach(p => {
            printerSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
        appData.filaments.forEach(f => {
            filamentSelect.innerHTML += `<option value="${f.id}">${f.name}</option>`;
            jobFilamentSelect.innerHTML += `<option value="${f.id}">${f.name}</option>`;
        });
        
        // Populate Queues & Fleets
        updatePrintQueue();
        updateFleetStatus();


        // Event Listeners
        getProfileBtn.addEventListener('click', getAIProfile);
        analysisTabs.forEach(tab => tab.addEventListener('click', switchAnalysisTab));
        analyzeLogBtn.addEventListener('click', simulateLogAnalysis);
        analyzePhotoBtn.addEventListener('click', simulatePhotoAnalysis);

        // New Job AI Listeners
        uploadStlBtn.addEventListener('click', () => goToStep('step2'));
        gotoStep3Btn.addEventListener('click', () => goToStep('step3'));
        gotoStep4Btn.addEventListener('click', () => goToStep('step4'));
        autoProfileBtn.addEventListener('click', () => goToStep('step5', { profileChoice: 'auto' }));
        uploadProfileBtn.addEventListener('click', () => goToStep('step5', { profileChoice: 'upload' }));
        cloudSliceBtn.addEventListener('click', simulateCloudSlicing);
        localSliceBtn.addEventListener('click', simulateLocalSlicing);
    }
    
    function updatePrintQueue() {
        printQueueEl.innerHTML = '';
        appData.print_queue.forEach(job => {
            printQueueEl.innerHTML += `<li class="text-sm text-gray-700 p-2 bg-gray-100 rounded">📄 ${job.name} (~${job.eta})</li>`;
        });
    }
    
    function updateFleetStatus() {
        fleetPrintersEl.innerHTML = '';
        appData.fleet.forEach(printer => {
            const statusColor = { green: 'text-green-600', gray: 'text-gray-500', yellow: 'text-yellow-600'}[printer.color];
            fleetPrintersEl.innerHTML += `
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h4 class="font-bold">${printer.name}</h4>
                    <p class="text-sm text-gray-500 mt-1">Estado: <span class="font-semibold ${statusColor}">${printer.status}</span></p>
                    <p class="text-sm text-gray-500 mt-1">Trabajo: <span class="font-semibold">${printer.job}</span></p>
                    ${printer.progress > 0 ? `
                    <div class="mt-3">
                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                            <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${printer.progress}%"></div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        });
    }


    // --- NAVIGATION ---
    function navigateTo(id) {
        sidebarLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
        contentSections.forEach(section => {
            section.classList.toggle('active', section.id === id);
        });
        if (id === 'new-job') {
            goToStep('step1'); // Reset the new job flow
        }
    }

    // --- NEW JOB AI WORKFLOW ---
    function goToStep(stepId, options = {}) {
        steps.forEach(step => step.classList.remove('active'));
        document.getElementById(stepId).classList.add('active');

        if (stepId === 'step2') {
            analysisLoader.style.display = 'block';
            analysisResult.classList.add('hidden');
            setTimeout(() => {
                analysisLoader.style.display = 'none';
                analysisResult.classList.remove('hidden');
            }, 2500);
        }
        if (stepId === 'step5') {
            slicingLoader.style.display = 'block';
            slicingResult.classList.add('hidden');
            slicingStatus.innerHTML = ''; // Clear previous status
            
            if (options.profileChoice === 'auto') {
                slicingLoaderText.textContent = 'Configurando perfil con IA...';
                setTimeout(() => {
                    slicingLoaderText.textContent = 'Buscando la mejor impresora en tu flota...';
                    setTimeout(() => {
                        slicingLoader.style.display = 'none';
                        slicingResult.classList.remove('hidden');
                        recommendPrinter();
                    }, 1500);
                }, 2000);
            } else { // 'upload'
                slicingLoaderText.textContent = 'Analizando perfil cargado y buscando la mejor impresora...';
                 setTimeout(() => {
                    slicingLoader.style.display = 'none';
                    slicingResult.classList.remove('hidden');
                    recommendPrinter();
                }, 2000);
            }
        }
    }
    
    function recommendPrinter() {
        const resistance = document.getElementById('resistance-select').value;
        let recommendedPrinter;
        let reason;

        if (resistance === 'Componente Estructural') {
            recommendedPrinter = appData.printers.find(p => p.id === 'voron24');
            reason = "Recomendada por su alta rigidez y capacidad para materiales de ingeniería como ABS/ASA.";
        } else {
            recommendedPrinter = appData.printers.find(p => p.id === 'prusamk4');
            reason = "Recomendada por su fiabilidad y excelente calidad para piezas funcionales.";
        }
        
        recommendedPrinterEl.textContent = recommendedPrinter.name;
        recommendationReasonEl.textContent = reason;
    }
    
    function simulateCloudSlicing() {
        slicingStatus.innerHTML = `
            <div class="mt-6 p-4 bg-gray-100 rounded-lg">
                <p class="font-semibold">☁️ Laminando en la Nube...</p>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div id="slice-progress" class="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" style="width: 10%"></div>
                </div>
            </div>
        `;
        const progressBar = document.getElementById('slice-progress');
        setTimeout(() => { progressBar.style.width = '50%'; }, 1000);
        setTimeout(() => { 
            progressBar.style.width = '100%';
            slicingStatus.innerHTML = `
                <div class="mt-6 p-4 bg-green-100 text-green-800 rounded-lg">
                    <p class="font-bold">✅ ¡Laminado Completo!</p>
                    <p>Enviando G-code a la impresora y añadiendo a la cola de impresión...</p>
                </div>
            `;
            appData.print_queue.unshift({ name: 'Pieza_Optimizada_IA.gcode', eta: '2h 30m' });
            updatePrintQueue();
        }, 2500);
    }

    function simulateLocalSlicing() {
        slicingStatus.innerHTML = `
            <div class="mt-6 p-4 bg-yellow-100 text-yellow-800 rounded-lg">
                <p class="font-bold">🖥️ Acción Requerida</p>
                <p>El proyecto ha sido enviado a tu OrcaSlicer local. Por favor, abre la aplicación, revisa los ajustes y haz clic en "Laminar".</p>
                <p class="mt-2">KUNA está esperando el G-code...</p>
            </div>
        `;
        setTimeout(() => {
            slicingStatus.innerHTML = `
                <div class="mt-6 p-4 bg-green-100 text-green-800 rounded-lg">
                    <p class="font-bold">✅ ¡G-code Recibido!</p>
                    <p>Enviando G-code a la impresora y añadiendo a la cola de impresión...</p>
                </div>
            `;
            appData.print_queue.unshift({ name: 'Pieza_Optimizada_Local.gcode', eta: '2h 35m' });
            updatePrintQueue();
        }, 8000); // Simulate user taking time to slice
    }


    // --- RECOMMENDER LOGIC ---
    async function getAIProfile() {
        recommenderForm.classList.add('hidden');
        recommenderResult.classList.remove('hidden');
        recommenderResult.innerHTML = `
            <div class="text-center">
                <div class="loader mx-auto"></div>
                <p class="mt-4 font-semibold">Analizando millones de impresiones...</p>
                <p class="text-sm text-gray-500">El cerebro IA de KUNA está encontrando el perfil óptimo para ti.</p>
            </div>
        `;

        const printerId = printerSelect.value;
        const filamentId = filamentSelect.value;

        try {
            const response = await fetch(`${API_URL}/api/recommender/get_profile?printer_id=${printerId}&filament_id=${filamentId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const profile = await response.json();

            const printerName = printerSelect.options[printerSelect.selectedIndex].text;
            const filamentName = filamentSelect.options[filamentSelect.selectedIndex].text;
            recommenderResult.innerHTML = `
                <h3 class="text-xl font-bold text-center">Perfil Optimizado por KUNA</h3>
                <p class="text-center text-gray-500 mb-4">Para ${printerName} con ${filamentName}</p>
                <div class="bg-gray-100 p-4 rounded-lg">
                    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <p>Altura de Capa: <span class="font-bold">${profile.layer_height}</span></p>
                        <p>Temperatura Boquilla: <span class="font-bold">${profile.nozzle_temp}</span></p>
                        <p>Temperatura Cama: <span class="font-bold">${profile.bed_temp}</span></p>
                        <p>Velocidad de Impresión: <span class="font-bold">${profile.print_speed}</span></p>
                        <p>Velocidad de Retracción: <span class="font-bold">${profile.retraction_speed}</span></p>
                        <p>Distancia de Retracción: <span class="font-bold">${profile.retraction_distance}</span></p>
                        <p>Ventilador: <span class="font-bold">${profile.fan_speed}</span></p>
                        <p>Avance de Presión: <span class="font-bold">${profile.pressure_advance}</span></p>
                    </div>
                </div>
                <div class="mt-4 text-center bg-green-100 text-green-800 p-3 rounded-lg">
                    <p class="font-bold">Tasa de Éxito Predicha: ${profile.success_rate}</p>
                    <p class="text-xs">${profile.reason}</p>
                </div>
                <button class="mt-6 w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800" onclick="document.getElementById('recommender-form').classList.remove('hidden'); document.getElementById('recommender-result').classList.add('hidden');">Empezar de Nuevo</button>
            `;
        } catch (error) {
            console.error("Failed to fetch AI profile:", error);
            recommenderResult.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert"><strong class="font-bold">Error!</strong><span class="block sm:inline"> No se pudo obtener el perfil de la IA.</span></div>`;
        }
    }

    // --- ANALYSIS LOGIC ---
    function switchAnalysisTab(e) {
        const targetTab = e.currentTarget.dataset.tab;
        analysisTabs.forEach(tab => {
            const isTarget = tab.dataset.tab === targetTab;
            tab.classList.toggle('border-blue-600', isTarget);
            tab.classList.toggle('text-blue-600', isTarget);
            tab.classList.toggle('border-transparent', !isTarget);
            tab.classList.toggle('text-gray-500', !isTarget);
        });
        analysisContents.forEach(content => {
            content.classList.toggle('hidden', content.id !== `${targetTab}-analysis`);
        });
    }

    function simulateLogAnalysis() {
        logResult.classList.remove('hidden');
        logResult.innerHTML = `<div class="loader mx-auto"></div>`;
        setTimeout(() => {
            logResult.innerHTML = `
                <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg" role="alert">
                  <p class="font-bold">Error Detectado: Heater not heating at expected rate</p>
                  <p class="mt-2"><strong class="text-gray-800">Traducción IA de KUNA:</strong> El calentador de la boquilla no está alcanzando la temperatura objetivo lo suficientemente rápido.</p>
                  <div class="mt-4">
                    <p class="font-semibold text-gray-800">Causas Probables:</p>
                    <ul class="list-disc list-inside text-sm">
                        <li>Conexión del termistor suelta o dañada.</li>
                        <li>Cartucho calentador defectuoso.</li>
                        <li>Ventilador de capa soplando directamente sobre el bloque calentador.</li>
                    </ul>
                    <p class="font-semibold text-gray-800 mt-2">Acción Recomendada:</p>
                    <p class="text-sm">Verifique visualmente la conexión del termistor en el bloque calentador. Asegúrese de que esté firme.</p>
                  </div>
                </div>
            `;
        }, 2000);
    }

    function simulatePhotoAnalysis() {
        photoResult.classList.remove('hidden');
        photoResult.innerHTML = `<div class="loader mx-auto mt-4"></div>`;
        setTimeout(() => {
            photoResult.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mt-4">
                    <div>
                        <p class="font-semibold text-center mb-2">Imagen Analizada</p>
                        <img src="https://placehold.co/600x400/e0e0e0/333333?text=Impresión+con+Hilos" alt="Impresión con hilos" class="rounded-lg shadow-md w-full">
                    </div>
                    <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg">
                        <p class="font-bold">Diagnóstico IA de KUNA: Hilos Severos (Stringing)</p>
                        <p class="mt-2"><strong class="text-gray-800">Análisis:</strong> Se detectan finos hilos de plástico entre las partes separadas del modelo. Esto ocurre cuando el filamento gotea de la boquilla mientras se desplaza.</p>
                        <div class="mt-4">
                            <p class="font-semibold text-gray-800">Sugerencias de Ajuste:</p>
                            <ul class="list-disc list-inside text-sm">
                                <li><strong>Aumentar Retracción:</strong> Incrementa la distancia de retracción en 0.5mm.</li>
                                <li><strong>Bajar Temperatura:</strong> Reduce la temperatura de impresión en 5-10°C.</li>
                                <li><strong>Aumentar Velocidad de Desplazamiento:</strong> Incrementa la velocidad de los movimientos sin impresión.</li>
                                <li><strong>Verificar Humedad del Filamento:</strong> El filamento húmedo puede causar hilos. Considera secarlo.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }, 2000);
    }

    // --- START THE APP ---
    init();
});