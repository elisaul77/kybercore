import asyncio
from src.services.moonraker_client import MoonrakerClient

async def async_callback(data):
    print("Mensaje recibido:", data)

async def test_ws():
    client = MoonrakerClient('10.10.10.71', 7126)
    await client.subscribe_to_updates(async_callback)

if __name__ == "__main__":
    asyncio.run(test_ws())
