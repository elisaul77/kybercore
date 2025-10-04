/**
 * G-code 3D Viewer Module
 * Maneja la visualización 3D de archivos G-code usando Three.js
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Exportar funciones para uso global
window.initialize3DViewer = function() {
    console.log('🎬 Inicializando visor 3D...');
    
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
    
    console.log(`🎨 Renderizando capa ${gcodeData.currentLayer + 1} en 3D`);
    
    // Limpiar geometrías anteriores
    gcodeData.lines3D.forEach(obj => gcodeData.scene.remove(obj));
    gcodeData.lines3D = [];
    
    const showTravels = document.getElementById('show-travels')?.checked;
    const colorBySpeed = document.getElementById('color-by-speed')?.checked;
    
    // Calcular offset para centrar el modelo en el origen
    const bounds = gcodeData.bounds;
    const offsetX = -(bounds.minX + bounds.maxX) / 2;
    const offsetY = -(bounds.minY + bounds.maxY) / 2;
    const offsetZ = -bounds.minZ; // El Z mínimo debe estar en 0 (sobre la plataforma)
    
    // Renderizar todas las capas hasta la actual
    for (let i = 0; i <= gcodeData.currentLayer; i++) {
        const layer = gcodeData.layers[i];
        const opacity = i === gcodeData.currentLayer ? 1.0 : 0.4;
        
        layer.moves.forEach(move => {
            if (move.toX === undefined || move.toY === undefined) return;
            if (move.type === 'travel' && !showTravels) return;
            
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
                // EXTRUSIONES: Crear cilindros/tubos gruesos (cordones de filamento)
                const extrusionWidth = 0.4; // Ancho de extrusión típico (mm)
                const radius = extrusionWidth / 2;
                
                // Calcular dirección y longitud
                const direction = new THREE.Vector3().subVectors(end, start);
                const length = direction.length();
                
                if (length < 0.001) return; // Evitar segmentos de longitud cero
                
                // Crear geometría de cilindro
                const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
                
                // Determinar color
                let color;
                if (colorBySpeed && move.f) {
                    const speedRatio = Math.min(move.f / 3000, 1);
                    const hue = speedRatio * 0.33; // 0 (rojo) a 0.33 (verde)
                    color = new THREE.Color().setHSL(hue, 0.8, 0.5);
                } else {
                    color = new THREE.Color(0xff8c42); // Naranja brillante para buen contraste
                }
                
                // Material para extrusión (cordón)
                const material = new THREE.MeshStandardMaterial({ 
                    color: color,
                    transparent: true,
                    opacity: opacity,
                    metalness: 0.1,
                    roughness: 0.8
                });
                
                const cylinder = new THREE.Mesh(geometry, material);
                
                // Posicionar y orientar el cilindro
                const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                cylinder.position.copy(midpoint);
                
                // Orientar el cilindro en la dirección correcta
                cylinder.quaternion.setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    direction.normalize()
                );
                
                gcodeData.scene.add(cylinder);
                gcodeData.lines3D.push(cylinder);
                
            } else {
                // DESPLAZAMIENTOS: Líneas finas y semi-transparentes
                const points = [start, end];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                
                const material = new THREE.LineBasicMaterial({ 
                    color: 0xd1d5db, // Gris muy claro
                    transparent: true,
                    opacity: opacity * 0.3, // Muy transparente
                    linewidth: 1
                });
                
                const line = new THREE.Line(geometry, material);
                gcodeData.scene.add(line);
                gcodeData.lines3D.push(line);
            }
        });
    }
    
    console.log(`✅ Renderizadas ${gcodeData.lines3D.length} geometrías (cordones y travels) centradas en origen`);
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
