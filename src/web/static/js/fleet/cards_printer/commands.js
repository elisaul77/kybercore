// 🎮 MÓDULO COMMANDS - Comandos de control de impresoras
// Manejo de comandos como pausar, reanudar, cancelar, home, restart, etc.

window.FleetCards = window.FleetCards || {};

window.FleetCards.Commands = {
    // ⏸️ Pausar impresión
    async pausePrint(printerId) {
        console.log('⏸️ Pausando impresión en impresora:', printerId);
        
        if (!confirm('¿Estás seguro de que quieres pausar la impresión actual?')) {
            console.log('❌ Pausa cancelada por el usuario');
            return;
        }

        return this.sendCommand(printerId, 'pause', {
            action: 'pause',
            successMessage: '⏸️ Impresión pausada correctamente',
            errorMessage: 'pausar la impresión'
        });
    },

    // ▶️ Reanudar impresión
    async resumePrint(printerId) {
        console.log('▶️ Reanudando impresión en impresora:', printerId);
        
        if (!confirm('¿Estás seguro de que quieres reanudar la impresión?')) {
            console.log('❌ Reanudación cancelada por el usuario');
            return;
        }

        return this.sendCommand(printerId, 'resume', {
            action: 'resume',
            successMessage: '▶️ Impresión reanudada correctamente',
            errorMessage: 'reanudar la impresión'
        });
    },

    // ❌ Cancelar impresión
    async cancelPrint(printerId) {
        console.log('❌ Cancelando impresión en impresora:', printerId);
        
        if (!confirm('¿Estás seguro de que quieres CANCELAR la impresión? Esta acción no se puede deshacer.')) {
            console.log('❌ Cancelación cancelada por el usuario');
            return;
        }

        return this.sendCommand(printerId, 'cancel', {
            action: 'cancel',
            successMessage: '❌ Impresión cancelada correctamente',
            errorMessage: 'cancelar la impresión'
        });
    },

    // 🏠 Home todas las coordenadas (XYZ)
    async homeAxes(printerId, axes = 'xyz') {
        console.log(`🏠 Ejecutando home ${axes.toUpperCase()} en impresora:`, printerId);
        
        const axesText = axes.toUpperCase();
        if (!confirm(`¿Estás seguro de que quieres ejecutar HOME ${axesText}?`)) {
            console.log('❌ Home cancelado por el usuario');
            return;
        }

        return this.sendCommand(printerId, 'home', {
            action: 'home',
            axes: axes,
            successMessage: `🏠 Home ${axesText} ejecutado correctamente`,
            errorMessage: `ejecutar home ${axesText}`
        });
    },

    // 🔄 Restart del host (Klipper)
    async restartKlipper(printerId) {
        console.log('🔄 Reiniciando Klipper en impresora:', printerId);
        
        if (!confirm('¿Estás seguro de que quieres reiniciar Klipper? Esto interrumpirá cualquier impresión en curso.')) {
            console.log('❌ Restart de Klipper cancelado por el usuario');
            return;
        }

        return this.sendCommand(printerId, 'restart', {
            action: 'restart_klipper',
            successMessage: '🔄 Klipper reiniciado correctamente',
            errorMessage: 'reiniciar Klipper'
        });
    },

    // ⚡ Restart del firmware
    async restartFirmware(printerId) {
        console.log('⚡ Reiniciando firmware en impresora:', printerId);
        
        if (!confirm('¿Estás seguro de que quieres reiniciar el firmware? Esto interrumpirá cualquier impresión en curso.')) {
            console.log('❌ Restart de firmware cancelado por el usuario');
            return;
        }

        return this.sendCommand(printerId, 'restart-firmware', {
            action: 'restart_firmware',
            successMessage: '⚡ Firmware reiniciado correctamente',
            errorMessage: 'reiniciar el firmware'
        });
    },

    // 🌡️ Establecer temperatura del hotend
    async setHotendTemperature(printerId, temperature) {
        console.log(`🌡️ Estableciendo temperatura del hotend a ${temperature}°C en impresora:`, printerId);
        
        // Validaciones de seguridad
        if (temperature < 0 || temperature > 300) {
            const errorMsg = 'La temperatura debe estar entre 0°C y 300°C';
            console.error('❌', errorMsg);
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`❌ ${errorMsg}`, 'error');
            }
            return;
        }

        if (temperature > 250 && !confirm(`⚠️ ADVERTENCIA: Estás estableciendo una temperatura alta (${temperature}°C). ¿Estás seguro?`)) {
            console.log('❌ Cambio de temperatura cancelado por el usuario');
            return;
        }

        return this.sendCommand(printerId, 'set-hotend-temp', {
            action: 'set_hotend_temperature',
            temperature: temperature,
            successMessage: `🌡️ Temperatura del hotend establecida a ${temperature}°C`,
            errorMessage: `establecer la temperatura del hotend a ${temperature}°C`
        });
    },

    // 🛏️ Establecer temperatura de la cama
    async setBedTemperature(printerId, temperature) {
        console.log(`🛏️ Estableciendo temperatura de la cama a ${temperature}°C en impresora:`, printerId);
        
        // Validaciones de seguridad
        if (temperature < 0 || temperature > 120) {
            const errorMsg = 'La temperatura de la cama debe estar entre 0°C y 120°C';
            console.error('❌', errorMsg);
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`❌ ${errorMsg}`, 'error');
            }
            return;
        }

        if (temperature > 100 && !confirm(`⚠️ ADVERTENCIA: Estás estableciendo una temperatura alta para la cama (${temperature}°C). ¿Estás seguro?`)) {
            console.log('❌ Cambio de temperatura cancelado por el usuario');
            return;
        }

        return this.sendCommand(printerId, 'set-bed-temp', {
            action: 'set_bed_temperature',
            temperature: temperature,
            successMessage: `🛏️ Temperatura de la cama establecida a ${temperature}°C`,
            errorMessage: `establecer la temperatura de la cama a ${temperature}°C`
        });
    },

    // 💨 Control de ventiladores
    async setFanSpeed(printerId, fanId = 'part_fan', speed = 100) {
        console.log(`💨 Estableciendo velocidad del ventilador ${fanId} a ${speed}% en impresora:`, printerId);
        
        // Validaciones
        if (speed < 0 || speed > 100) {
            const errorMsg = 'La velocidad del ventilador debe estar entre 0% y 100%';
            console.error('❌', errorMsg);
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`❌ ${errorMsg}`, 'error');
            }
            return;
        }

        return this.sendCommand(printerId, 'set-fan-speed', {
            action: 'set_fan_speed',
            fan_id: fanId,
            speed: speed,
            successMessage: `💨 Velocidad del ventilador ${fanId} establecida a ${speed}%`,
            errorMessage: `establecer la velocidad del ventilador ${fanId} a ${speed}%`
        });
    },

    // 🔧 Ejecutar comando G-code personalizado
    async executeGcode(printerId, gcode) {
        console.log(`🔧 Ejecutando G-code personalizado en impresora ${printerId}:`, gcode);
        
        // Validación básica
        if (!gcode || typeof gcode !== 'string' || gcode.trim().length === 0) {
            const errorMsg = 'Debes proporcionar un comando G-code válido';
            console.error('❌', errorMsg);
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`❌ ${errorMsg}`, 'error');
            }
            return;
        }

        const trimmedGcode = gcode.trim();
        
        // Advertencia para comandos potencialmente peligrosos
        const dangerousCommands = ['M112', 'M503', 'M500', 'M502'];
        const isDangerous = dangerousCommands.some(cmd => trimmedGcode.toUpperCase().includes(cmd));
        
        if (isDangerous && !confirm(`⚠️ ADVERTENCIA: El comando "${trimmedGcode}" puede ser peligroso. ¿Estás seguro de que quieres ejecutarlo?`)) {
            console.log('❌ Comando G-code cancelado por el usuario');
            return;
        }

        return this.sendCommand(printerId, 'execute-gcode', {
            action: 'execute_gcode',
            gcode: trimmedGcode,
            successMessage: `🔧 Comando G-code ejecutado: ${trimmedGcode}`,
            errorMessage: `ejecutar el comando G-code: ${trimmedGcode}`
        });
    },

    // 🚫 Parada de emergencia
    async emergencyStop(printerId) {
        console.log('🚫 PARADA DE EMERGENCIA en impresora:', printerId);
        
        if (!confirm('🚫 PARADA DE EMERGENCIA: Esto detendrá inmediatamente todos los motores y calentadores. ¿Continuar?')) {
            console.log('❌ Parada de emergencia cancelada por el usuario');
            return;
        }

        return this.sendCommand(printerId, 'emergency-stop', {
            action: 'emergency_stop',
            successMessage: '🚫 PARADA DE EMERGENCIA ejecutada',
            errorMessage: 'ejecutar parada de emergencia'
        });
    },

    // 📡 Función genérica para enviar comandos
    async sendCommand(printerId, commandType, options = {}) {
        console.log(`📡 Enviando comando ${commandType} a impresora:`, printerId, options);
        
        try {
            // Mostrar loading
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast('Enviando comando...', 'info');
            }

            const requestBody = {
                command: options.action || commandType,
                ...Object.fromEntries(
                    Object.entries(options).filter(([key]) => 
                        !['action', 'successMessage', 'errorMessage'].includes(key)
                    )
                )
            };

            const response = await fetch(`/api/fleet/printers/${printerId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log(`✅ Comando ${commandType} ejecutado correctamente:`, result);
            
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(options.successMessage || `✅ Comando ${commandType} ejecutado correctamente`, 'success');
            }

            // Recargar datos de la flota después de 1 segundo para reflejar cambios
            if (window.FleetCards.Core && window.FleetCards.Core.loadFleetData) {
                setTimeout(() => {
                    window.FleetCards.Core.loadFleetData();
                }, 1000);
            }

            return result;

        } catch (error) {
            console.error(`❌ Error ejecutando comando ${commandType}:`, error);
            const errorMessage = options.errorMessage || `ejecutar comando ${commandType}`;
            
            if (window.FleetCards.Core) {
                window.FleetCards.Core.showToast(`❌ Error al ${errorMessage}: ${error.message}`, 'error');
            }
            
            throw error;
        }
    },

    // 📋 Obtener comandos disponibles para una impresora
    getAvailableCommands(printerStatus) {
        const commands = [];
        
        // Comandos básicos siempre disponibles
        commands.push(
            { id: 'home', label: '🏠 Home XYZ', action: () => this.homeAxes },
            { id: 'restart-klipper', label: '🔄 Restart Klipper', action: () => this.restartKlipper },
            { id: 'restart-firmware', label: '⚡ Restart Firmware', action: () => this.restartFirmware },
            { id: 'emergency-stop', label: '🚫 Parada Emergencia', action: () => this.emergencyStop, danger: true }
        );
        
        // Comandos de impresión según estado
        if (printerStatus === 'printing') {
            commands.unshift(
                { id: 'pause', label: '⏸️ Pausar', action: () => this.pausePrint },
                { id: 'cancel', label: '❌ Cancelar', action: () => this.cancelPrint, danger: true }
            );
        } else if (printerStatus === 'paused') {
            commands.unshift(
                { id: 'resume', label: '▶️ Reanudar', action: () => this.resumePrint },
                { id: 'cancel', label: '❌ Cancelar', action: () => this.cancelPrint, danger: true }
            );
        }
        
        return commands;
    },

    // 🎛️ Mostrar panel de control avanzado
    showAdvancedControlPanel(printerId) {
        console.log('🎛️ Mostrando panel de control avanzado para impresora:', printerId);
        
        // Crear modal de control avanzado si no existe
        let controlModal = document.getElementById('advanced-control-modal');
        if (!controlModal) {
            controlModal = this.createAdvancedControlModal();
            document.body.appendChild(controlModal);
        }

        // Configurar el modal para la impresora específica
        const modalTitle = controlModal.querySelector('#control-modal-title');
        const printerIdInput = controlModal.querySelector('#control-printer-id');
        
        if (modalTitle) {
            modalTitle.textContent = `Control Avanzado - Impresora ${printerId}`;
        }
        
        if (printerIdInput) {
            printerIdInput.value = printerId;
        }

        // Mostrar modal
        controlModal.classList.remove('hidden');
        controlModal.classList.add('flex');
    },

    // 🏗️ Crear modal de control avanzado
    createAdvancedControlModal() {
        const modal = document.createElement('div');
        modal.id = 'advanced-control-modal';
        modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 z-50 items-center justify-center';
        
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden max-h-screen overflow-y-auto">
                <!-- Header -->
                <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 text-white">
                    <div class="flex items-center justify-between">
                        <h3 id="control-modal-title" class="text-lg font-bold">🎛️ Control Avanzado</h3>
                        <button onclick="window.FleetCards.Commands.hideAdvancedControlPanel()" 
                                class="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors">
                            ❌
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-6 space-y-6">
                    <input type="hidden" id="control-printer-id" value="">
                    
                    <!-- Temperaturas -->
                    <div class="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                        <h4 class="text-lg font-bold text-orange-900 mb-4">🌡️ Control de Temperaturas</h4>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Hotend -->
                            <div>
                                <label class="block text-sm font-medium text-orange-800 mb-2">🔥 Hotend (°C)</label>
                                <div class="flex gap-2">
                                    <input type="number" id="hotend-temp" min="0" max="300" placeholder="200" 
                                           class="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                                    <button onclick="window.FleetCards.Commands.setHotendTemperatureFromInput()" 
                                            class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                                        ✅ Aplicar
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Cama -->
                            <div>
                                <label class="block text-sm font-medium text-orange-800 mb-2">🛏️ Cama (°C)</label>
                                <div class="flex gap-2">
                                    <input type="number" id="bed-temp" min="0" max="120" placeholder="60" 
                                           class="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                                    <button onclick="window.FleetCards.Commands.setBedTemperatureFromInput()" 
                                            class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                                        ✅ Aplicar
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Presets de temperatura -->
                        <div class="mt-4">
                            <h5 class="text-sm font-medium text-orange-800 mb-2">🎯 Presets:</h5>
                            <div class="flex flex-wrap gap-2">
                                <button onclick="window.FleetCards.Commands.applyTempPreset('pla')" 
                                        class="px-3 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm">
                                    PLA (200°/60°)
                                </button>
                                <button onclick="window.FleetCards.Commands.applyTempPreset('petg')" 
                                        class="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 text-sm">
                                    PETG (230°/80°)
                                </button>
                                <button onclick="window.FleetCards.Commands.applyTempPreset('abs')" 
                                        class="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 text-sm">
                                    ABS (250°/100°)
                                </button>
                                <button onclick="window.FleetCards.Commands.applyTempPreset('off')" 
                                        class="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm">
                                    Apagar (0°/0°)
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Ventiladores -->
                    <div class="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-200">
                        <h4 class="text-lg font-bold text-cyan-900 mb-4">💨 Control de Ventiladores</h4>
                        
                        <div class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium text-cyan-800 mb-2">🌪️ Ventilador de Pieza (%)</label>
                                <div class="flex gap-2">
                                    <input type="range" id="part-fan-speed" min="0" max="100" value="0" 
                                           class="flex-1"
                                           oninput="document.getElementById('part-fan-value').textContent = this.value + '%'">
                                    <span id="part-fan-value" class="w-12 text-sm text-cyan-700">0%</span>
                                    <button onclick="window.FleetCards.Commands.setPartFanSpeedFromInput()" 
                                            class="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors">
                                        ✅ Aplicar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Comandos G-code -->
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                        <h4 class="text-lg font-bold text-gray-900 mb-4">🔧 Comandos G-code Personalizados</h4>
                        
                        <div class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-800 mb-2">Comando G-code:</label>
                                <div class="flex gap-2">
                                    <input type="text" id="custom-gcode" placeholder="Ej: G28, M104 S200, etc." 
                                           class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500">
                                    <button onclick="window.FleetCards.Commands.executeGcodeFromInput()" 
                                            class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                                        🔧 Ejecutar
                                    </button>
                                </div>
                                <p class="mt-1 text-xs text-gray-500">
                                    ⚠️ Ten cuidado con los comandos personalizados. Pueden afectar la impresión o la seguridad.
                                </p>
                            </div>
                            
                            <!-- Comandos rápidos -->
                            <div>
                                <h5 class="text-sm font-medium text-gray-800 mb-2">⚡ Comandos Rápidos:</h5>
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    <button onclick="window.FleetCards.Commands.executeQuickGcode('G28')" 
                                            class="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 text-sm">
                                        🏠 G28 (Home)
                                    </button>
                                    <button onclick="window.FleetCards.Commands.executeQuickGcode('M84')" 
                                            class="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 text-sm">
                                        🔓 M84 (Motores Off)
                                    </button>
                                    <button onclick="window.FleetCards.Commands.executeQuickGcode('M106 S255')" 
                                            class="px-3 py-2 bg-cyan-100 text-cyan-800 rounded-lg hover:bg-cyan-200 text-sm">
                                        💨 M106 (Fan Max)
                                    </button>
                                    <button onclick="window.FleetCards.Commands.executeQuickGcode('M107')" 
                                            class="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm">
                                        🚫 M107 (Fan Off)
                                    </button>
                                    <button onclick="window.FleetCards.Commands.executeQuickGcode('M114')" 
                                            class="px-3 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm">
                                        📍 M114 (Posición)
                                    </button>
                                    <button onclick="window.FleetCards.Commands.executeQuickGcode('M503')" 
                                            class="px-3 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 text-sm">
                                        ⚙️ M503 (Config)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    },

    // 👁️ Ocultar panel de control avanzado
    hideAdvancedControlPanel() {
        const modal = document.getElementById('advanced-control-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            console.log('✅ Panel de control avanzado ocultado');
        }
    },

    // 🌡️ Funciones auxiliares para el panel de control
    setHotendTemperatureFromInput() {
        const tempInput = document.getElementById('hotend-temp');
        const printerIdInput = document.getElementById('control-printer-id');
        
        if (tempInput && printerIdInput) {
            const temperature = parseInt(tempInput.value);
            const printerId = printerIdInput.value;
            
            if (!isNaN(temperature) && printerId) {
                this.setHotendTemperature(printerId, temperature);
            }
        }
    },

    setBedTemperatureFromInput() {
        const tempInput = document.getElementById('bed-temp');
        const printerIdInput = document.getElementById('control-printer-id');
        
        if (tempInput && printerIdInput) {
            const temperature = parseInt(tempInput.value);
            const printerId = printerIdInput.value;
            
            if (!isNaN(temperature) && printerId) {
                this.setBedTemperature(printerId, temperature);
            }
        }
    },

    setPartFanSpeedFromInput() {
        const speedInput = document.getElementById('part-fan-speed');
        const printerIdInput = document.getElementById('control-printer-id');
        
        if (speedInput && printerIdInput) {
            const speed = parseInt(speedInput.value);
            const printerId = printerIdInput.value;
            
            if (!isNaN(speed) && printerId) {
                this.setFanSpeed(printerId, 'part_fan', speed);
            }
        }
    },

    executeGcodeFromInput() {
        const gcodeInput = document.getElementById('custom-gcode');
        const printerIdInput = document.getElementById('control-printer-id');
        
        if (gcodeInput && printerIdInput) {
            const gcode = gcodeInput.value.trim();
            const printerId = printerIdInput.value;
            
            if (gcode && printerId) {
                this.executeGcode(printerId, gcode);
                gcodeInput.value = ''; // Limpiar input después de ejecutar
            }
        }
    },

    executeQuickGcode(gcode) {
        const printerIdInput = document.getElementById('control-printer-id');
        
        if (printerIdInput) {
            const printerId = printerIdInput.value;
            
            if (printerId) {
                this.executeGcode(printerId, gcode);
            }
        }
    },

    applyTempPreset(preset) {
        const hotendInput = document.getElementById('hotend-temp');
        const bedInput = document.getElementById('bed-temp');
        
        if (hotendInput && bedInput) {
            switch (preset) {
                case 'pla':
                    hotendInput.value = '200';
                    bedInput.value = '60';
                    break;
                case 'petg':
                    hotendInput.value = '230';
                    bedInput.value = '80';
                    break;
                case 'abs':
                    hotendInput.value = '250';
                    bedInput.value = '100';
                    break;
                case 'off':
                    hotendInput.value = '0';
                    bedInput.value = '0';
                    break;
            }
            
            // Aplicar temperaturas automáticamente
            this.setHotendTemperatureFromInput();
            this.setBedTemperatureFromInput();
        }
    },

    // 🧪 Función de prueba
    testCommands() {
        console.log('🧪 Ejecutando test de comandos...');
        
        // Test comandos disponibles
        const testStatuses = ['idle', 'printing', 'paused', 'error'];
        testStatuses.forEach(status => {
            const commands = this.getAvailableCommands(status);
            console.log(`📋 Comandos para estado ${status}:`, commands.length);
        });
        
        console.log('✅ Test de comandos completado');
    }
};

console.log('🎮 Módulo FleetCards.Commands cargado');
