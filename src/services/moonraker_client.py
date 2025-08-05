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