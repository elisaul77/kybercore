import aiohttp
import websockets
import json
import asyncio
import logging
import base64
import re

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MoonrakerClient:
    def __init__(self, printer_ip, port=7125, session=None):
        self.base_url = f"http://{printer_ip}:{port}"
        self.websocket_url = f"ws://{printer_ip}:{port}/websocket"
        self._session = session
        self._owns_session = False
        if self._session is None:
            self._session = aiohttp.ClientSession()
            self._owns_session = True

    async def close(self):
        if self._owns_session:
            await self._session.close()

    async def get_printer_info(self):
        """Obtiene información general de la impresora."""
        try:
            async with self._session.get(f"{self.base_url}/printer/info") as response:
                response.raise_for_status()
                printer_info = await response.json()
                logger.info(f"Respuesta completa de la impresora: {json.dumps(printer_info, indent=2)}")
                return printer_info
        except aiohttp.ClientError as e:
            logger.error(f"Error al obtener información de la impresora: {e}")
            return None

    async def get_gcode_help(self):
        """Obtiene la lista de comandos G-code disponibles."""
        try:
            async with self._session.get(f"{self.base_url}/printer/gcode/help") as response:
                response.raise_for_status()
                return await response.json()
        except aiohttp.ClientError as e:
            logger.error(f"Error al obtener ayuda de G-code: {e}")
            return None

    async def post_gcode_script(self, script):
        """Envía un script G-code a la impresora."""
        try:
            async with self._session.post(f"{self.base_url}/printer/gcode/script", params={'script': script}) as response:
                response.raise_for_status()
                return await response.json()
        except aiohttp.ClientError as e:
            logger.error(f"Error al enviar script G-code: {e}")
            return None

    async def get_temperatures(self):
        """Obtiene las temperaturas del hotend y la cama."""
        try:
            # Usamos un GET request con los objetos como parámetros en la URL
            async with self._session.get(f"{self.base_url}/printer/objects/query?extruder&heater_bed") as response:
                response.raise_for_status()
                temperatures = await response.json()
                logger.info(f"Temperaturas obtenidas: {json.dumps(temperatures, indent=2)}")
                return temperatures
        except aiohttp.ClientError as e:
            logger.error(f"Error al obtener temperaturas: {e}")
            return None

    async def get_print_stats(self):
        """Obtiene las estadísticas de impresión incluyendo el progreso."""
        try:
            async with self._session.get(f"{self.base_url}/printer/objects/query?print_stats&virtual_sdcard") as response:
                response.raise_for_status()
                stats = await response.json()
                logger.info(f"Estadísticas de impresión obtenidas: {json.dumps(stats, indent=2)}")
                return stats
        except aiohttp.ClientError as e:
            logger.error(f"Error al obtener estadísticas de impresión: {e}")
            return None

    async def subscribe_to_updates(self, callback):
        """Se suscribe a actualizaciones de estado vía WebSocket."""
        try:
            logger.info(f"Intentando conectar al WebSocket: {self.websocket_url}")
            async with websockets.connect(self.websocket_url) as websocket:
                logger.info("Conexión WebSocket establecida.")
                # Suscripción a objetos de estado relevantes
                subscription_message = {
                    "jsonrpc": "2.0",
                    "method": "printer.objects.subscribe",
                    "params": {
                        "objects": {
                            "webhooks": None,
                            "gcode_move": None,
                            "toolhead": None,
                            "extruder": None,
                            "heater_bed": None,
                            "fan": None,
                            "print_stats": None
                        }
                    },
                    "id": 1
                }
                logger.info(f"Enviando mensaje de suscripción: {json.dumps(subscription_message)}")
                await websocket.send(json.dumps(subscription_message))

                # Esperar la confirmación de la suscripción
                initial_response = await websocket.recv()
                logger.info(f"Respuesta de suscripción recibida: {initial_response}")

                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    logger.info(f"Mensaje recibido: {data}")
                    await callback(data)
        except (websockets.exceptions.ConnectionClosed, asyncio.CancelledError) as e:
            logger.warning(f"Conexión WebSocket cerrada: {e}")
        except Exception as e:
            logger.error(f"Error en la conexión WebSocket: {e}")

    # === GESTIÓN DE ARCHIVOS G-CODE ===
    
    async def list_gcode_files(self):
        """Lista todos los archivos G-code disponibles en la impresora."""
        try:
            async with self._session.get(f"{self.base_url}/server/files/list?root=gcodes") as response:
                response.raise_for_status()
                files_data = await response.json()
                
                if 'result' in files_data:
                    files = files_data['result']
                else:
                    files = files_data
                    
                logger.info(f"Archivos G-code obtenidos: {len(files)} archivos")
                return files
        except aiohttp.ClientError as e:
            logger.error(f"Error al listar archivos G-code: {e}")
            return []

    async def get_gcode_metadata(self, filename):
        """Obtiene metadatos de un archivo G-code específico."""
        try:
            async with self._session.get(f"{self.base_url}/server/files/metadata?filename={filename}") as response:
                response.raise_for_status()
                metadata = await response.json()
                logger.info(f"Metadatos obtenidos para {filename}")
                return metadata
        except aiohttp.ClientError as e:
            logger.error(f"Error al obtener metadatos de {filename}: {e}")
            return None

    async def upload_gcode_file(self, file_data, filename, start_print=False):
        """Sube un archivo G-code a la impresora."""
        try:
            data = aiohttp.FormData()
            data.add_field('file', file_data, filename=filename, content_type='application/octet-stream')
            data.add_field('root', 'gcodes')
            if start_print:
                data.add_field('print', 'true')

            async with self._session.post(f"{self.base_url}/server/files/upload", data=data) as response:
                response.raise_for_status()
                result = await response.json()
                logger.info(f"Archivo {filename} subido exitosamente")
                return result
        except aiohttp.ClientError as e:
            logger.error(f"Error al subir archivo {filename}: {e}")
            return None

    async def start_print(self, filename):
        """Inicia la impresión de un archivo G-code."""
        try:
            async with self._session.post(f"{self.base_url}/printer/print/start?filename={filename}") as response:
                response.raise_for_status()
                result = await response.text()
                logger.info(f"Impresión iniciada: {filename}")
                return {"success": True, "message": result}
        except aiohttp.ClientError as e:
            logger.error(f"Error al iniciar impresión de {filename}: {e}")
            return {"success": False, "error": str(e)}

    async def delete_gcode_file(self, filename):
        """Elimina un archivo G-code de la impresora."""
        try:
            async with self._session.delete(f"{self.base_url}/server/files/gcodes/{filename}") as response:
                response.raise_for_status()
                result = await response.json()
                logger.info(f"Archivo {filename} eliminado exitosamente")
                return result
        except aiohttp.ClientError as e:
            logger.error(f"Error al eliminar archivo {filename}: {e}")
            return None

    async def get_thumbnails(self, filename):
        """Obtiene información de thumbnails para un archivo G-code."""
        try:
            async with self._session.get(f"{self.base_url}/server/files/thumbnails?filename={filename}") as response:
                response.raise_for_status()
                thumbnails = await response.json()
                logger.info(f"Thumbnails obtenidos para {filename}: {len(thumbnails)} thumbnails")
                return thumbnails
        except aiohttp.ClientError as e:
            logger.error(f"Error al obtener thumbnails de {filename}: {e}")
            return []

    async def get_gcode_thumbnail_data(self, filename):
        """Obtiene los datos de thumbnail embebidos en un archivo G-code."""
        try:
            # Primero intentar obtener metadatos que pueden incluir thumbnails
            metadata = await self.get_gcode_metadata(filename)
            if metadata and 'result' in metadata:
                thumbnails_metadata = metadata['result'].get('thumbnails', [])
                if thumbnails_metadata:
                    logger.info(f"📋 Metadatos de thumbnails encontrados para {filename}: {len(thumbnails_metadata)}")
                    
                    # Obtener los datos reales de cada thumbnail
                    thumbnails_with_data = []
                    for thumb_meta in thumbnails_metadata:
                        # Obtener datos del thumbnail usando el relative_path
                        relative_path = thumb_meta.get('relative_path')
                        if relative_path:
                            try:
                                # Solicitar el thumbnail específico desde Moonraker
                                async with self._session.get(f"{self.base_url}/server/files/gcodes/{relative_path}") as response:
                                    if response.status == 200:
                                        thumbnail_data = await response.read()
                                        # Convertir a base64
                                        import base64
                                        data_b64 = base64.b64encode(thumbnail_data).decode('utf-8')
                                        
                                        # Combinar metadatos con datos
                                        thumbnail_complete = thumb_meta.copy()
                                        thumbnail_complete['data'] = data_b64
                                        thumbnails_with_data.append(thumbnail_complete)
                                        
                                        logger.info(f"✅ Thumbnail obtenido: {thumb_meta.get('width')}x{thumb_meta.get('height')}, data length: {len(data_b64)}")
                                    else:
                                        logger.warning(f"⚠️ No se pudo obtener thumbnail: {relative_path} (status: {response.status})")
                                        # Incluir sin datos
                                        thumbnails_with_data.append(thumb_meta.copy())
                            except Exception as e:
                                logger.error(f"❌ Error obteniendo thumbnail {relative_path}: {e}")
                                # Incluir sin datos
                                thumbnails_with_data.append(thumb_meta.copy())
                    
                    return thumbnails_with_data
            
            # Si no hay thumbnails en metadatos, intentar leer el archivo directamente
            logger.info(f"🔄 Probando extracción directa del G-code para {filename}")
            async with self._session.get(f"{self.base_url}/server/files/gcodes/{filename}") as response:
                if response.status == 200:
                    content = await response.text()
                    thumbnails = self._extract_thumbnails_from_gcode(content)
                    if thumbnails:
                        logger.info(f"✅ Thumbnails extraídos del G-code {filename}: {len(thumbnails)}")
                        return thumbnails
                        
            logger.info(f"ℹ️ No se encontraron thumbnails para {filename}")
            return []
        except Exception as e:
            logger.error(f"❌ Error al obtener thumbnails de G-code {filename}: {e}")
            return []

    def _extract_thumbnails_from_gcode(self, gcode_content):
        """Extrae thumbnails de los comentarios THUMBNAIL_BLOCK_START/END en el G-code."""
        import base64
        import re
        
        thumbnails = []
        
        logger.info(f"🔍 Iniciando extracción de thumbnails desde G-code content (tamaño: {len(gcode_content)} chars)")
        
        # Buscar bloques de thumbnail en el contenido
        thumbnail_pattern = r'; thumbnail begin (\d+)x(\d+) (\d+)\n(.*?)\n; thumbnail end'
        matches = re.finditer(thumbnail_pattern, gcode_content, re.DOTALL)
        
        for match in matches:
            width = int(match.group(1))
            height = int(match.group(2))
            size = int(match.group(3))
            data_lines = match.group(4)
            
            logger.info(f"📐 Encontrado thumbnail format 1: {width}x{height}, size: {size}")
            
            # Limpiar y concatenar las líneas de datos
            data_clean = ""
            for line in data_lines.split('\n'):
                if line.startswith('; '):
                    data_clean += line[2:]  # Remover '; ' del inicio
            
            logger.info(f"📋 Data clean length: {len(data_clean)}, first 50 chars: {data_clean[:50]}...")
            
            try:
                # Decodificar base64
                thumbnail_data = base64.b64decode(data_clean)
                
                thumbnails.append({
                    'width': width,
                    'height': height,
                    'size': size,
                    'data': data_clean,  # Mantener en base64 para el frontend
                    'relative_path': f"thumbnail_{width}x{height}.png"
                })
                
                logger.info(f"✅ Thumbnail extraído: {width}x{height}, {size} bytes, data length: {len(data_clean)}")
                
            except Exception as e:
                logger.error(f"❌ Error decodificando thumbnail {width}x{height}: {e}")
                continue
        
        # También buscar el formato alternativo THUMBNAIL_BLOCK_START/END
        alt_pattern = r'; THUMBNAIL_BLOCK_START\n(.*?)\n; THUMBNAIL_BLOCK_END'
        alt_matches = re.finditer(alt_pattern, gcode_content, re.DOTALL)
        
        for i, match in enumerate(alt_matches):
            data_lines = match.group(1)
            
            logger.info(f"📐 Encontrado thumbnail format 2: block {i}")
            
            # Limpiar y concatenar las líneas de datos
            data_clean = ""
            for line in data_lines.split('\n'):
                if line.startswith('; '):
                    data_clean += line[2:]  # Remover '; ' del inicio
            
            try:
                # Intentar decodificar para verificar que es válido
                thumbnail_data = base64.b64decode(data_clean)
                
                # Estimar dimensiones (esto es aproximado)
                estimated_size = len(thumbnail_data)
                estimated_width = int((estimated_size / 3) ** 0.5)  # Aproximación para RGB
                estimated_height = estimated_width
                
                thumbnails.append({
                    'width': estimated_width,
                    'height': estimated_height,
                    'size': estimated_size,
                    'data': data_clean,  # Mantener en base64 para el frontend
                    'relative_path': f"thumbnail_block_{i}.png"
                })
                
                logger.info(f"Thumbnail block extraído: ~{estimated_width}x{estimated_height}, {estimated_size} bytes")
                
            except Exception as e:
                logger.error(f"Error decodificando thumbnail block {i}: {e}")
                continue
        
        return thumbnails

    async def pause_print(self):
        """Pausa la impresión actual."""
        try:
            async with self._session.post(f"{self.base_url}/printer/print/pause") as response:
                response.raise_for_status()
                result = await response.text()
                logger.info("Impresión pausada")
                return {"success": True, "message": result}
        except aiohttp.ClientError as e:
            logger.error(f"Error al pausar impresión: {e}")
            return {"success": False, "error": str(e)}

    async def resume_print(self):
        """Reanuda la impresión pausada."""
        try:
            async with self._session.post(f"{self.base_url}/printer/print/resume") as response:
                response.raise_for_status()
                result = await response.text()
                logger.info("Impresión reanudada")
                return {"success": True, "message": result}
        except aiohttp.ClientError as e:
            logger.error(f"Error al reanudar impresión: {e}")
            return {"success": False, "error": str(e)}

    async def cancel_print(self):
        """Cancela la impresión actual."""
        try:
            async with self._session.post(f"{self.base_url}/printer/print/cancel") as response:
                response.raise_for_status()
                result = await response.text()
                logger.info("Impresión cancelada")
                return {"success": True, "message": result}
        except aiohttp.ClientError as e:
            logger.error(f"Error al cancelar impresión: {e}")
            return {"success": False, "error": str(e)}

    async def download_gcode_file(self, filename: str):
        """Descarga el contenido de un archivo G-code."""
        try:
            async with self._session.get(f"{self.base_url}/server/files/gcodes/{filename}") as response:
                if response.status == 200:
                    content = await response.read()
                    logger.info(f"✅ Archivo {filename} descargado correctamente ({len(content)} bytes)")
                    return content
                else:
                    logger.error(f"❌ Error descargando archivo {filename}: HTTP {response.status}")
                    return None
        except Exception as e:
            logger.error(f"❌ Error descargando archivo {filename}: {e}")
            return None

# Ejemplo de uso (para pruebas)
async def example_callback(data):
    logger.info(f"Datos recibidos: {json.dumps(data, indent=2)}")

async def main():
    # Reemplazar con la IP de tu impresora de prueba
    PRINTER_IP = "10.10.10.71"
    client = MoonrakerClient(PRINTER_IP)

    # Probar endpoints HTTP
    printer_info = await client.get_printer_info()
    if printer_info:
        logger.info("Información de la impresora:")
        logger.info(json.dumps(printer_info, indent=2))
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(main())