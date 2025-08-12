import aiohttp
import websockets
import json
import asyncio
import logging

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
                logger.info(f"Archivos G-code obtenidos: {len(files_data)} archivos")
                return files_data
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