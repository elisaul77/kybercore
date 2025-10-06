"""
Servicio para extraer imágenes desde archivos PDF.
Útil para obtener previsualizaciones de proyectos de Printables que incluyen PDFs con imágenes.
"""

import os
import io
from pathlib import Path
from typing import List, Optional, Tuple
from PIL import Image
import logging

logger = logging.getLogger(__name__)

try:
    import PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False
    logger.warning("PyPDF2 no está disponible. La extracción de imágenes de PDFs estará deshabilitada.")

try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    logger.warning("pdf2image no está disponible. La conversión de páginas PDF a imágenes estará deshabilitada.")


def extract_images_from_pdf_pypdf2(pdf_path: str, output_dir: str) -> List[str]:
    """
    Extrae imágenes embebidas directamente del PDF usando PyPDF2.
    
    Args:
        pdf_path: Ruta al archivo PDF
        output_dir: Directorio donde guardar las imágenes extraídas
        
    Returns:
        Lista de rutas a las imágenes extraídas
    """
    if not PYPDF2_AVAILABLE:
        logger.warning("PyPDF2 no disponible, no se pueden extraer imágenes embebidas")
        return []
    
    extracted_images = []
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    # Intentar extraer imágenes de la página
                    if '/XObject' in page['/Resources']:
                        xObject = page['/Resources']['/XObject'].get_object()
                        
                        for obj_name in xObject:
                            obj = xObject[obj_name]
                            
                            if obj['/Subtype'] == '/Image':
                                # Obtener datos de la imagen
                                size = (obj['/Width'], obj['/Height'])
                                data = obj.get_data()
                                
                                # Determinar el formato de la imagen
                                if '/Filter' in obj:
                                    filter_type = obj['/Filter']
                                    
                                    if filter_type == '/DCTDecode':
                                        # JPEG
                                        img_ext = 'jpg'
                                    elif filter_type == '/FlateDecode':
                                        # PNG o similar
                                        img_ext = 'png'
                                    elif filter_type == '/JPXDecode':
                                        # JPEG2000
                                        img_ext = 'jp2'
                                    else:
                                        img_ext = 'png'
                                else:
                                    img_ext = 'png'
                                
                                # Guardar imagen
                                img_filename = f"pdf_page{page_num + 1}_img{len(extracted_images) + 1}.{img_ext}"
                                img_path = output_path / img_filename
                                
                                try:
                                    if filter_type == '/DCTDecode':
                                        # JPEG: guardar directamente
                                        with open(img_path, 'wb') as img_file:
                                            img_file.write(data)
                                    else:
                                        # Otros formatos: procesar con PIL
                                        if '/ColorSpace' in obj:
                                            color_space = obj['/ColorSpace']
                                            if color_space == '/DeviceRGB':
                                                mode = 'RGB'
                                            elif color_space == '/DeviceGray':
                                                mode = 'L'
                                            else:
                                                mode = 'RGB'
                                        else:
                                            mode = 'RGB'
                                        
                                        img = Image.frombytes(mode, size, data)
                                        img.save(img_path)
                                    
                                    extracted_images.append(str(img_path))
                                    logger.info(f"✅ Imagen extraída: {img_filename}")
                                    
                                except Exception as e:
                                    logger.warning(f"⚠️ Error al guardar imagen {img_filename}: {e}")
                                    continue
                                    
                except Exception as e:
                    logger.warning(f"⚠️ Error al procesar página {page_num + 1}: {e}")
                    continue
        
        logger.info(f"✅ Extraídas {len(extracted_images)} imágenes de {pdf_path}")
        
    except Exception as e:
        logger.error(f"❌ Error al procesar PDF {pdf_path}: {e}")
    
    return extracted_images


def convert_pdf_page_to_image(pdf_path: str, output_dir: str, page_num: int = 0, dpi: int = 150) -> Optional[str]:
    """
    Convierte una página específica del PDF a imagen usando pdf2image.
    Útil cuando no se pueden extraer imágenes embebidas directamente.
    
    Args:
        pdf_path: Ruta al archivo PDF
        output_dir: Directorio donde guardar la imagen
        page_num: Número de página a convertir (0-indexed)
        dpi: Resolución de la imagen resultante
        
    Returns:
        Ruta a la imagen generada o None si falla
    """
    if not PDF2IMAGE_AVAILABLE:
        logger.warning("pdf2image no disponible, no se puede convertir PDF a imagen")
        return None
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    try:
        # Convertir solo la primera página (más rápido)
        images = convert_from_path(
            pdf_path,
            dpi=dpi,
            first_page=page_num + 1,
            last_page=page_num + 1,
            fmt='png'
        )
        
        if images:
            img_filename = f"pdf_preview_page{page_num + 1}.png"
            img_path = output_path / img_filename
            images[0].save(img_path, 'PNG')
            
            logger.info(f"✅ Página {page_num + 1} convertida a imagen: {img_filename}")
            return str(img_path)
            
    except Exception as e:
        logger.error(f"❌ Error al convertir PDF a imagen: {e}")
    
    return None


def extract_best_preview_from_pdf(pdf_path: str, output_dir: str, max_images: int = 3) -> List[str]:
    """
    Intenta extraer las mejores imágenes de un PDF para usar como preview.
    Combina ambos métodos: extracción directa y conversión de páginas.
    
    Args:
        pdf_path: Ruta al archivo PDF
        output_dir: Directorio donde guardar las imágenes
        max_images: Número máximo de imágenes a extraer
        
    Returns:
        Lista de rutas a las imágenes extraídas (ordenadas por calidad/relevancia)
    """
    all_images = []
    
    # Método 1: Intentar extraer imágenes embebidas
    logger.info(f"🔍 Intentando extraer imágenes embebidas de {pdf_path}...")
    embedded_images = extract_images_from_pdf_pypdf2(pdf_path, output_dir)
    
    if embedded_images:
        all_images.extend(embedded_images[:max_images])
        logger.info(f"✅ Extraídas {len(embedded_images)} imágenes embebidas")
    
    # Método 2: Si no hay imágenes embebidas o queremos más, convertir la primera página
    if len(all_images) < max_images:
        logger.info(f"🔍 Convirtiendo primera página de PDF a imagen...")
        page_image = convert_pdf_page_to_image(pdf_path, output_dir, page_num=0, dpi=150)
        
        if page_image:
            all_images.append(page_image)
            logger.info(f"✅ Primera página convertida a imagen")
    
    # Filtrar y optimizar imágenes
    final_images = []
    for img_path in all_images[:max_images]:
        try:
            # Verificar que la imagen sea válida y tenga tamaño razonable
            img = Image.open(img_path)
            width, height = img.size
            
            # Filtrar imágenes muy pequeñas (probablemente iconos o logos)
            if width >= 200 and height >= 200:
                # Redimensionar si es muy grande (optimización)
                max_dimension = 1200
                if width > max_dimension or height > max_dimension:
                    ratio = min(max_dimension / width, max_dimension / height)
                    new_size = (int(width * ratio), int(height * ratio))
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
                    img.save(img_path, optimize=True, quality=85)
                    logger.info(f"🔧 Imagen redimensionada: {os.path.basename(img_path)} -> {new_size}")
                
                final_images.append(img_path)
            else:
                logger.info(f"⚠️ Imagen descartada por tamaño pequeño: {os.path.basename(img_path)} ({width}x{height})")
                # Eliminar imagen pequeña
                try:
                    os.remove(img_path)
                except:
                    pass
                    
        except Exception as e:
            logger.warning(f"⚠️ Error al procesar imagen {img_path}: {e}")
    
    logger.info(f"✅ Total de imágenes válidas extraídas: {len(final_images)}")
    return final_images


def process_project_pdfs(project_dir: Path, images_dir: Path) -> List[str]:
    """
    Procesa todos los PDFs en un directorio de proyecto y extrae imágenes.
    
    Args:
        project_dir: Directorio raíz del proyecto
        images_dir: Directorio donde guardar las imágenes extraídas
        
    Returns:
        Lista de rutas a las imágenes extraídas de todos los PDFs
    """
    all_extracted_images = []
    
    # Buscar PDFs en el directorio del proyecto (incluyendo subdirectorios)
    pdf_files = list(project_dir.rglob("*.pdf")) + list(project_dir.rglob("*.PDF"))
    
    if not pdf_files:
        logger.info(f"ℹ️ No se encontraron archivos PDF en {project_dir}")
        return all_extracted_images
    
    logger.info(f"📄 Encontrados {len(pdf_files)} archivos PDF en el proyecto")
    
    for pdf_file in pdf_files:
        logger.info(f"📄 Procesando PDF: {pdf_file.name}")
        
        try:
            extracted = extract_best_preview_from_pdf(
                str(pdf_file),
                str(images_dir),
                max_images=2  # Máximo 2 imágenes por PDF
            )
            all_extracted_images.extend(extracted)
            
        except Exception as e:
            logger.error(f"❌ Error al procesar PDF {pdf_file.name}: {e}")
    
    return all_extracted_images
