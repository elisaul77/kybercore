import requests
import websockets
import json
import asyncio
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MoonrakerClient:
    def __init__(self, printer_ip, port=7125):
        self.base_url = f"http://{printer_ip}:{port}"
        self.websocket_url = f"ws://{printer_ip}:{port}/websocket"
        self.session = requests.Session()

    def get_printer_info(self):
        """Obtiene información general de la impresora."""
        try:
            response = self.session.get(f"{self.base_url}/printer/info")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener información de la impresora: {e}")
            return None

    def get_gcode_help(self):
        """Obtiene la lista de comandos G-code disponibles."""
        try:
            response = self.session.get(f"{self.base_url}/printer/gcode/help")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener ayuda de G-code: {e}")
            return None

    def post_gcode_script(self, script):
        """Envía un script G-code a la impresora."""
        try:
            response = self.session.post(f"{self.base_url}/printer/gcode/script", params={'script': script})
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al enviar script G-code: {e}")
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

if __name__ == "__main__":
    # Reemplazar con la IP de tu impresora de prueba
    PRINTER_IP = "10.10.10.71"
    client = MoonrakerClient(PRINTER_IP)

    # Probar endpoints HTTP
    printer_info = client.get_printer_info()
    if printer_info:
        logger.info("Información de la impresora:")
        logger.info(json.dumps(printer_info, indent=2))

    # Probar WebSocket (ejecutar en un bucle de eventos asyncio)
    # loop = asyncio.get_event_loop()
    # try:
    #     loop.run_until_complete(client.subscribe_to_updates(example_callback))
    # except KeyboardInterrupt:
    #     pass
    # finally:
    #     loop.close()
