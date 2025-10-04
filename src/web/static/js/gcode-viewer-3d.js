/**
 * G-code 3D Viewer Module
 * Maneja la visualización 3D de archivos G-code usando Three.js
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Variables para optimización de renderizado
let renderingInProgress = false;
let currentRenderFrame = 0;

// Exportar funciones para uso global
window.initialize3DViewer = function() {
    console.log('🎬 Inicializando visor 3D (modo optimizado)...');
    
    const container = document.getElementById('gcode-3d-canvas');
    if (!container) return;
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Crear escena
    gcodeData.scene = new THREE.Scene();
    gcodeData.scene.background = new THREE.Color(0xf8fafc);
    
    // Configurar cámara
    const width = container.clientWidth;
    const height = container.clientHeight || 500;
    gcodeData.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    
    // Calcular dimensiones y centro del modelo
    const bounds = gcodeData.bounds;
    const modelWidth = bounds.maxX - bounds.minX;
    const modelDepth = bounds.maxY - bounds.minY;
    const modelHeight = bounds.maxZ - bounds.minZ;
    
    // El centro del modelo debe estar en el origen (0, 0, 0) para la plataforma
    // La cámara mira hacia el centro de la plataforma
    const maxDim = Math.max(modelWidth, modelDepth, modelHeight);
    
    // Posicionar cámara en perspectiva isométrica (como OrcaSlicer)
    const distance = maxDim * 1.8;
    gcodeData.camera.position.set(distance, distance * 0.8, distance);
    gcodeData.camera.lookAt(0, modelHeight / 2, 0);
    
    // Crear renderer
    gcodeData.renderer = new THREE.WebGLRenderer({ antialias: true });
    gcodeData.renderer.setSize(width, height);
    gcodeData.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(gcodeData.renderer.domElement);
    
    // Agregar controles de órbita
    gcodeData.controls = new OrbitControls(gcodeData.camera, gcodeData.renderer.domElement);
    gcodeData.controls.target.set(0, modelHeight / 2, 0); // Centrar en el medio del modelo
    gcodeData.controls.enableDamping = true;
    gcodeData.controls.dampingFactor = 0.05;
    gcodeData.controls.minDistance = maxDim * 0.5;
    gcodeData.controls.maxDistance = maxDim * 5;
    gcodeData.controls.update();
    
    // Agregar luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    gcodeData.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    gcodeData.scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-100, -100, -100);
    gcodeData.scene.add(directionalLight2);
    
    // Agregar plataforma de impresión PRIMERO (antes del modelo)
    create3DBuildPlate();
    
    // Agregar ejes de coordenadas en el origen
    const axesHelper = new THREE.AxesHelper(Math.max(modelWidth, modelDepth) / 2);
    gcodeData.scene.add(axesHelper);
    
    // Agregar grid centrado en el origen
    const gridSize = Math.max(modelWidth, modelDepth) * 1.5;
    const gridHelper = new THREE.GridHelper(gridSize, 20, 0x888888, 0xcccccc);
    gridHelper.position.y = 0; // Grid en Y=0 (plataforma)
    gcodeData.scene.add(gridHelper);
    
    console.log(`📐 Modelo: ${modelWidth.toFixed(1)}x${modelDepth.toFixed(1)}x${modelHeight.toFixed(1)}mm`);
    console.log(`📍 Cámara posicionada para vista isométrica centrada`);
    
    // Iniciar loop de animación
    animate3DScene();
    
    console.log('✅ Visor 3D inicializado');
};

function create3DBuildPlate() {
    const bounds = gcodeData.bounds;
    const modelWidth = bounds.maxX - bounds.minX;
    const modelDepth = bounds.maxY - bounds.minY;
    
    // Plataforma un poco más grande que el modelo
    const plateWidth = modelWidth * 1.3;
    const plateDepth = modelDepth * 1.3;
    
    // Geometría de la plataforma
    const geometry = new THREE.PlaneGeometry(plateWidth, plateDepth);
    
    // Material con textura tipo rejilla
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x404040,
        side: THREE.DoubleSide,
        metalness: 0.3,
        roughness: 0.7,
        transparent: true,
        opacity: 0.8
    });
    
    gcodeData.buildPlate = new THREE.Mesh(geometry, material);
    gcodeData.buildPlate.rotation.x = -Math.PI / 2; // Rotar para que sea horizontal
    gcodeData.buildPlate.position.set(0, 0, 0); // Centrada en el origen
    
    // Agregar borde a la plataforma
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x2563eb, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.rotation.x = -Math.PI / 2;
    wireframe.position.set(0, 0.1, 0); // Ligeramente arriba para evitar z-fighting
    
    gcodeData.scene.add(gcodeData.buildPlate);
    gcodeData.scene.add(wireframe);
    
    console.log(`🛏️ Plataforma creada: ${plateWidth.toFixed(1)}x${plateDepth.toFixed(1)}mm centrada en origen`);
}

window.render3DLayer = function() {
    if (!gcodeData.scene || gcodeData.layers.length === 0) return;
    
    const startTime = performance.now();
    console.log(`🎨 Renderizando capa ${gcodeData.currentLayer + 1} en 3D (optimizado)`);
    
    // Limpiar geometrías anteriores
    gcodeData.lines3D.forEach(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        gcodeData.scene.remove(obj);
    });
    gcodeData.lines3D = [];
    
    const showTravels = document.getElementById('show-travels')?.checked;
    const colorBySpeed = document.getElementById('color-by-speed')?.checked;
    
    // Calcular offset para centrar el modelo en el origen
    const bounds = gcodeData.bounds;
    const offsetX = -(bounds.minX + bounds.maxX) / 2;
    const offsetY = -(bounds.minY + bounds.maxY) / 2;
    const offsetZ = -bounds.minZ;
    
    // ===== OPTIMIZACIÓN: Usar geometrías fusionadas =====
    // Arrays para acumular puntos de todas las extrusiones
    const extrusionPoints = [];
    const extrusionColors = [];
    
    // Arrays para líneas de travel (si están habilitadas)
    const travelPoints = [];
    
    // Arrays para retracciones (si están habilitadas)
    const retractionPoints = [];
    
    let segmentCount = 0;
    const maxSegmentsPerFrame = 50000; // Límite de segmentos para evitar colapso
    
    // Renderizar todas las capas hasta la actual
    for (let i = 0; i <= gcodeData.currentLayer; i++) {
        const layer = gcodeData.layers[i];
        const opacity = i === gcodeData.currentLayer ? 1.0 : 0.6;
        
        // Color base para esta capa (más oscuras las anteriores)
        const layerBrightness = i === gcodeData.currentLayer ? 1.0 : 0.7;
        
        layer.moves.forEach(move => {
            if (move.toX === undefined || move.toY === undefined) return;
            if (segmentCount >= maxSegmentsPerFrame) return; // Límite de seguridad
            
            // Coordenadas con offset (centradas en origen)
            const start = new THREE.Vector3(
                move.x + offsetX,
                move.z + offsetZ,
                move.y + offsetY
            );
            const end = new THREE.Vector3(
                move.toX + offsetX,
                move.z + offsetZ,
                move.toY + offsetY
            );
            
            if (move.type === 'extrude') {
                // Agregar puntos a la geometría fusionada de extrusiones
                extrusionPoints.push(start, end);
                
                // Determinar color
                let color;
                if (colorBySpeed && move.f) {
                    const speedRatio = Math.min(move.f / 3000, 1);
                    const hue = speedRatio * 0.33;
                    color = new THREE.Color().setHSL(hue, 0.8, 0.5 * layerBrightness);
                } else {
                    color = new THREE.Color(0xff8c42); // Naranja
                    color.multiplyScalar(layerBrightness);
                }
                
                // Agregar color para cada vértice (inicio y fin)
                extrusionColors.push(color.r, color.g, color.b);
                extrusionColors.push(color.r, color.g, color.b);
                
                segmentCount++;
                
            } else if (move.type === 'retract' && showRetractions) {
                // Agregar puntos a la geometría de retracciones (blanco)
                retractionPoints.push(start, end);
                segmentCount++;
                
            } else if (move.type === 'travel' && showTravels) {
                // Agregar puntos a la geometría fusionada de travels
                travelPoints.push(start, end);
                segmentCount++;
            }
        });
    }
    
    // Crear geometría fusionada de extrusiones (líneas gruesas)
    if (extrusionPoints.length > 0) {
        const extrusionGeometry = new THREE.BufferGeometry().setFromPoints(extrusionPoints);
        extrusionGeometry.setAttribute('color', new THREE.Float32BufferAttribute(extrusionColors, 3));
        
        const extrusionMaterial = new THREE.LineBasicMaterial({ 
            vertexColors: true,
            linewidth: 3, // Líneas más gruesas para extrusiones
            transparent: false
        });
        
        const extrusionLines = new THREE.LineSegments(extrusionGeometry, extrusionMaterial);
        gcodeData.scene.add(extrusionLines);
        gcodeData.lines3D.push(extrusionLines);
    }
    
    // Crear geometría fusionada de retracciones (líneas blancas)
    if (retractionPoints.length > 0 && showRetractions) {
        const retractionGeometry = new THREE.BufferGeometry().setFromPoints(retractionPoints);
        
        const retractionMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff, // Blanco
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        });
        
        const retractionLines = new THREE.LineSegments(retractionGeometry, retractionMaterial);
        gcodeData.scene.add(retractionLines);
        gcodeData.lines3D.push(retractionLines);
    }
    
    // Crear geometría fusionada de travels (líneas finas en azul oscuro)
    if (travelPoints.length > 0 && showTravels) {
        const travelGeometry = new THREE.BufferGeometry().setFromPoints(travelPoints);
        
        const travelMaterial = new THREE.LineBasicMaterial({ 
            color: 0x1e3a8a, // Azul oscuro
            transparent: true,
            opacity: 0.4, // Más visible que antes
            linewidth: 1
        });
        
        const travelLines = new THREE.LineSegments(travelGeometry, travelMaterial);
        gcodeData.scene.add(travelLines);
        gcodeData.lines3D.push(travelLines);
    }
    
    const elapsed = performance.now() - startTime;
    console.log(`✅ Renderizado optimizado: ${segmentCount} segmentos en ${elapsed.toFixed(1)}ms (${gcodeData.lines3D.length} objetos)`);
    
    if (segmentCount >= maxSegmentsPerFrame) {
        console.warn(`⚠️ Límite de segmentos alcanzado (${maxSegmentsPerFrame}). Algunos segmentos no se renderizaron.`);
    }
};

// Función alternativa para renderizado progresivo (archivos muy grandes)
window.render3DLayerProgressive = async function() {
    if (!gcodeData.scene || gcodeData.layers.length === 0) return;
    
    if (renderingInProgress) {
        console.log('⏳ Renderizado en progreso, cancelando solicitud duplicada');
        return;
    }
    
    renderingInProgress = true;
    const startTime = performance.now();
    console.log(`🎨 Renderizando capa ${gcodeData.currentLayer + 1} en 3D (modo progresivo)`);
    
    // Limpiar geometrías anteriores
    gcodeData.lines3D.forEach(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        gcodeData.scene.remove(obj);
    });
    gcodeData.lines3D = [];
    
    const showTravels = document.getElementById('show-travels')?.checked;
    const showRetractions = document.getElementById('show-retractions')?.checked;
    const colorBySpeed = document.getElementById('color-by-speed')?.checked;
    
    const bounds = gcodeData.bounds;
    const offsetX = -(bounds.minX + bounds.maxX) / 2;
    const offsetY = -(bounds.minY + bounds.maxY) / 2;
    const offsetZ = -bounds.minZ;
    
    const extrusionPoints = [];
    const extrusionColors = [];
    const travelPoints = [];
    const retractionPoints = [];
    
    const CHUNK_SIZE = 10000; // Procesar 10k segmentos a la vez
    let segmentCount = 0;
    let totalSegments = 0;
    
    // Contar total de segmentos
    for (let i = 0; i <= gcodeData.currentLayer; i++) {
        totalSegments += gcodeData.layers[i].moves.length;
    }
    
    console.log(`📊 Total de segmentos a procesar: ${totalSegments}`);
    
    // Procesar en chunks para no congelar el navegador
    for (let i = 0; i <= gcodeData.currentLayer; i++) {
        const layer = gcodeData.layers[i];
        const layerBrightness = i === gcodeData.currentLayer ? 1.0 : 0.7;
        
        for (let j = 0; j < layer.moves.length; j++) {
            const move = layer.moves[j];
            
            if (move.toX === undefined || move.toY === undefined) continue;
            
            const start = new THREE.Vector3(
                move.x + offsetX,
                move.z + offsetZ,
                move.y + offsetY
            );
            const end = new THREE.Vector3(
                move.toX + offsetX,
                move.z + offsetZ,
                move.toY + offsetY
            );
            
            if (move.type === 'extrude') {
                extrusionPoints.push(start, end);
                
                let color;
                if (colorBySpeed && move.f) {
                    const speedRatio = Math.min(move.f / 3000, 1);
                    color = new THREE.Color().setHSL(speedRatio * 0.33, 0.8, 0.5 * layerBrightness);
                } else {
                    color = new THREE.Color(0xff8c42);
                    color.multiplyScalar(layerBrightness);
                }
                
                extrusionColors.push(color.r, color.g, color.b);
                extrusionColors.push(color.r, color.g, color.b);
                
            } else if (move.type === 'retract' && showRetractions) {
                retractionPoints.push(start, end);
                
            } else if (move.type === 'travel' && showTravels) {
                travelPoints.push(start, end);
            }
            
            segmentCount++;
            
            // Yield al navegador cada CHUNK_SIZE segmentos
            if (segmentCount % CHUNK_SIZE === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                console.log(`⏳ Progreso: ${segmentCount}/${totalSegments} (${(segmentCount/totalSegments*100).toFixed(1)}%)`);
            }
        }
    }
    
    // Crear geometrías finales
    if (extrusionPoints.length > 0) {
        const extrusionGeometry = new THREE.BufferGeometry().setFromPoints(extrusionPoints);
        extrusionGeometry.setAttribute('color', new THREE.Float32BufferAttribute(extrusionColors, 3));
        
        const extrusionMaterial = new THREE.LineBasicMaterial({ 
            vertexColors: true,
            linewidth: 3
        });
        
        const extrusionLines = new THREE.LineSegments(extrusionGeometry, extrusionMaterial);
        gcodeData.scene.add(extrusionLines);
        gcodeData.lines3D.push(extrusionLines);
    }
    
    if (retractionPoints.length > 0 && showRetractions) {
        const retractionGeometry = new THREE.BufferGeometry().setFromPoints(retractionPoints);
        const retractionMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff, // Blanco
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        });
        
        const retractionLines = new THREE.LineSegments(retractionGeometry, retractionMaterial);
        gcodeData.scene.add(retractionLines);
        gcodeData.lines3D.push(retractionLines);
    }
    
    if (travelPoints.length > 0 && showTravels) {
        const travelGeometry = new THREE.BufferGeometry().setFromPoints(travelPoints);
        const travelMaterial = new THREE.LineBasicMaterial({ 
            color: 0x1e3a8a, // Azul oscuro
            transparent: true,
            opacity: 0.4
        });
        
        const travelLines = new THREE.LineSegments(travelGeometry, travelMaterial);
        gcodeData.scene.add(travelLines);
        gcodeData.lines3D.push(travelLines);
    }
    
    const elapsed = performance.now() - startTime;
    console.log(`✅ Renderizado progresivo completado: ${segmentCount} segmentos en ${elapsed.toFixed(1)}ms`);
    
    renderingInProgress = false;
};

function animate3DScene() {
    if (!gcodeData.renderer || !gcodeData.scene || !gcodeData.camera) return;
    
    requestAnimationFrame(animate3DScene);
    
    if (gcodeData.controls) {
        gcodeData.controls.update();
    }
    
    gcodeData.renderer.render(gcodeData.scene, gcodeData.camera);
}

window.cleanup3DViewer = function() {
    if (gcodeData.renderer) {
        gcodeData.renderer.dispose();
        gcodeData.renderer = null;
    }
    
    if (gcodeData.scene) {
        gcodeData.scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        gcodeData.scene = null;
    }
    
    gcodeData.camera = null;
    gcodeData.controls = null;
    gcodeData.lines3D = [];
};

console.log('✅ Módulo de visor 3D cargado');
