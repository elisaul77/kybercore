#!/usr/bin/env python3
"""
Servicio de renderizado STL para generar imágenes previas de modelos 3D.
"""
import trimesh
import numpy as np
from PIL import Image, ImageDraw
import matplotlib.pyplot as plt
from pathlib import Path
import logging
from typing import Optional, Tuple
import io
import os
import signal
import time

logger = logging.getLogger(__name__)

class STLRenderer:
    """Servicio para renderizar archivos STL a imágenes PNG."""

    def __init__(self):
        self.default_size = (400, 400)
        self.bg_color = (255, 255, 255)  # Blanco
        self.mesh_color = (64, 128, 255)  # Azul claro
        self.max_file_size = 200 * 1024 * 1024  # 200MB máximo
        self.render_timeout = 60  # 60 segundos máximo para renderizar
        self.max_vertices = 500000  # Máximo 500K vértices para evitar problemas de memoria
        self.max_faces = 1000000  # Máximo 1M caras

    def render_stl_to_image(self, stl_path: str, output_path: Optional[str] = None,
                           size: Tuple[int, int] = None) -> Optional[bytes]:
        """
        Renderiza un archivo STL a una imagen PNG.

        Args:
            stl_path: Ruta al archivo STL
            output_path: Ruta donde guardar la imagen (opcional)
            size: Tamaño de la imagen (ancho, alto)

        Returns:
            Bytes de la imagen PNG si output_path es None, None si se guardó en archivo
        """
        # Verificar que el archivo existe
        if not os.path.exists(stl_path):
            logger.error(f"Archivo STL no encontrado: {stl_path}")
            return None

        # Verificar tamaño del archivo
        file_size = os.path.getsize(stl_path)
        logger.info(f"📏 Tamaño del archivo STL: {file_size} bytes")

        # Límite más conservador para archivos muy grandes que causan problemas de memoria
        conservative_limit = 10 * 1024 * 1024  # 10MB máximo para procesamiento seguro
        if file_size > conservative_limit:
            logger.error(f"❌ Archivo STL demasiado grande para procesamiento: {file_size} bytes (máximo: {conservative_limit})")
            logger.error(f"💡 Este archivo es demasiado complejo. Por favor, simplifica el modelo 3D usando software como Meshlab o Blender antes de subirlo.")
            logger.error(f"💡 Recomendaciones: Reduce el número de polígonos, elimina detalles innecesarios, o divide el modelo en partes más pequeñas.")
            return None

        # Configurar procesamiento con timeout
        if size is None:
            size = self.default_size

        # Función de timeout para el renderizado
        def timeout_handler(signum, frame):
            raise TimeoutError("Renderizado STL excedió el tiempo límite")

        # Configurar timeout
        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(self.render_timeout)

        try:
            # Para archivos normales, cargar normalmente
            try:
                mesh = trimesh.load(stl_path)

                if mesh is None:
                    logger.error(f"No se pudo cargar el mesh: {stl_path}")
                    return None

                # Validar que el mesh tenga geometría
                if len(mesh.vertices) == 0:
                    logger.error(f"Mesh STL no tiene vértices: {stl_path}")
                    return None

                if len(mesh.faces) == 0:
                    logger.error(f"Mesh STL no tiene caras: {stl_path}")
                    return None

                logger.info(f"📐 Mesh cargado: {len(mesh.vertices)} vértices, {len(mesh.faces)} caras")
            except Exception as e:
                logger.error(f"❌ Error cargando mesh: {e}")
                return None

            # Simplificar mesh si es demasiado complejo
            original_vertices = len(mesh.vertices)
            original_faces = len(mesh.faces)

            if len(mesh.vertices) > self.max_vertices or len(mesh.faces) > self.max_faces:
                logger.info(f"Mesh muy complejo ({len(mesh.vertices)} vértices, {len(mesh.faces)} caras) - simplificando...")
                try:
                    # Calcular factor de reducción
                    vertex_ratio = min(1.0, self.max_vertices / len(mesh.vertices))
                    face_ratio = min(1.0, self.max_faces / len(mesh.faces))
                    reduction_ratio = min(vertex_ratio, face_ratio)

                    if reduction_ratio < 1.0:
                        # Simplificar mesh
                        target_faces = int(len(mesh.faces) * reduction_ratio)
                        mesh = mesh.simplify_quadric_decimation(target_faces)
                        logger.info(f"Mesh simplificado: {original_vertices} -> {len(mesh.vertices)} vértices, {original_faces} -> {len(mesh.faces)} caras")
                except Exception as e:
                    logger.warning(f"No se pudo simplificar mesh: {e} - continuando con mesh original")

            logger.info(f"📐 Mesh final: {len(mesh.vertices)} vértices, {len(mesh.faces)} caras")

            # Ajustar resolución de imagen para meshes complejos
            if len(mesh.vertices) > 100000:  # Mesh complejo
                size = (200, 200)  # Resolución más baja
                logger.info(f"Usando resolución baja (200x200) para mesh complejo")
            else:
                size = self.default_size

            # Crear figura matplotlib
            fig = plt.figure(figsize=(size[0]/100, size[1]/100), dpi=100)
            ax = fig.add_subplot(111, projection='3d')

            # Configurar vista 3D
            ax.set_axis_off()
            ax.set_facecolor('white')
            fig.patch.set_facecolor('white')

            # Renderizar el mesh
            ax.plot_trisurf(mesh.vertices[:, 0], mesh.vertices[:, 1], mesh.vertices[:, 2],
                          triangles=mesh.faces, color=np.array(self.mesh_color)/255,
                          alpha=0.8, linewidth=0.1, edgecolor='black')

            # Auto-escalar la vista
            bounds = mesh.bounds
            center = (bounds[0] + bounds[1]) / 2
            size_mesh = bounds[1] - bounds[0]
            max_size = np.max(size_mesh)

            # Configurar límites de los ejes
            ax.set_xlim(center[0] - max_size/2, center[0] + max_size/2)
            ax.set_ylim(center[1] - max_size/2, center[1] + max_size/2)
            ax.set_zlim(center[2] - max_size/2, center[2] + max_size/2)

            # Vista isométrica
            ax.view_init(elev=20, azim=45)

            # Convertir a imagen
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight',
                       facecolor='white', edgecolor='none', dpi=100)
            plt.close(fig)

            buf.seek(0)
            image_bytes = buf.getvalue()
            buf.close()

            if output_path:
                # Guardar en archivo
                with open(output_path, 'wb') as f:
                    f.write(image_bytes)
                logger.info(f"Imagen renderizada guardada: {output_path}")
                return None
            else:
                # Retornar bytes
                return image_bytes

        except TimeoutError:
            logger.error(f"Timeout renderizando STL {stl_path} (límite: {self.render_timeout}s)")
            return None
        except Exception as e:
            logger.error(f"Error renderizando STL {stl_path}: {e}")
            return None
        finally:
            # Restaurar handler de señal y cancelar alarma
            signal.alarm(0)
            signal.signal(signal.SIGALRM, old_handler)

    def _run_with_timeout(self, func, timeout_seconds):
        """Ejecuta una función con timeout."""
        def timeout_handler(signum, frame):
            raise TimeoutError(f"Operación excedió el tiempo límite de {timeout_seconds}s")

        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(timeout_seconds)

        try:
            result = func()
            return result
        finally:
            signal.alarm(0)
            signal.signal(signal.SIGALRM, old_handler)

    def render_stl_preview(self, stl_path: str, project_images_dir: Path,
                          filename: str = "stl_preview.png") -> Optional[str]:
        """
        Renderiza un preview de STL y lo guarda en el directorio de imágenes del proyecto.

        Args:
            stl_path: Ruta al archivo STL
            project_images_dir: Directorio donde guardar la imagen
            filename: Nombre del archivo de imagen

        Returns:
            Ruta relativa de la imagen generada, o None si falló
        """
        try:
            output_path = project_images_dir / filename
            logger.info(f"🔧 Renderizando STL: {stl_path} -> {output_path}")
            
            # Asegurar que el directorio existe
            project_images_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"📁 Directorio de imágenes: {project_images_dir} (existe: {project_images_dir.exists()})")

            # Renderizar y guardar
            image_bytes = self.render_stl_to_image(stl_path, str(output_path))
            logger.info(f"🎨 render_stl_to_image retornó: {type(image_bytes)} (None: {image_bytes is None})")

            # Verificar si se guardó en archivo de todas formas
            exists = output_path.exists()
            size = output_path.stat().st_size if exists else 0
            logger.info(f"📁 Verificación archivo: existe={exists}, tamaño={size}")
            
            if exists and size > 0:
                logger.info(f"✅ Preview STL generado exitosamente: {output_path}")
                return filename
            else:
                logger.error(f"❌ No se pudo generar preview STL: archivo no existe o está vacío")
                return None

        except Exception as e:
            logger.error(f"❌ Error generando preview STL: {e}")
            return None

def generate_stl_preview(stl_path: str, output_path: str) -> bool:
    """
    Función de conveniencia para generar preview de STL.

    Args:
        stl_path: Ruta al archivo STL
        output_path: Ruta donde guardar la imagen PNG

    Returns:
        True si se generó exitosamente, False en caso contrario
    """
    renderer = STLRenderer()
    result = renderer.render_stl_to_image(stl_path, output_path)
    return result is not None

if __name__ == "__main__":
    # Ejemplo de uso
    import sys

    if len(sys.argv) != 3:
        print("Uso: python stl_renderer.py <stl_file> <output_png>")
        sys.exit(1)

    stl_file = sys.argv[1]
    output_file = sys.argv[2]

    if generate_stl_preview(stl_file, output_file):
        print(f"✅ Preview generado: {output_file}")
    else:
        print(f"❌ Error generando preview")
        sys.exit(1)
