# Integración de KyberCore con Moonraker: Arquitectura y Flujo

## 1. ¿Qué es Moonraker y por qué integrarlo?

Moonraker es un servidor API (HTTP y WebSocket) que expone el control y monitoreo de impresoras 3D gestionadas por Klipper. Permite:
- Consultar el estado de la impresora (temperatura, posición, estado de impresión, etc.).
- Enviar comandos G-code y controlar la impresora remotamente.
- Recibir eventos en tiempo real (por ejemplo, cambios de estado, errores, progreso de impresión).

Integrar Moonraker permite que KyberCore gestione impresoras reales, no solo datos simulados.

---

## 2. Arquitectura de la integración

### a) Consulta de estado y datos (HTTP)
- Cuando el usuario abre la vista de flota, el frontend solicita los datos al backend.
- El backend (`fleet_service.py`) consulta:
  - El archivo `printers.json` para obtener la configuración y metadatos de las impresoras.
  - Moonraker (vía HTTP) para obtener el estado en tiempo real de cada impresora (por ejemplo, `/printer/info`, `/printer/objects/query`).
- El backend fusiona ambos conjuntos de datos y los envía al frontend.

### b) Acciones CRUD y comandos (HTTP)
- Cuando el usuario realiza una acción (por ejemplo, iniciar impresión, pausar, resetear, etc.), el frontend envía la petición al backend.
- El backend valida la acción (puede usar IA para validaciones avanzadas).
- Si la acción requiere modificar hardware real, el backend llama a Moonraker (HTTP) para ejecutar el comando correspondiente (por ejemplo, enviar G-code, pausar, etc.).
- El backend también actualiza `printers.json` si es necesario (por ejemplo, cambios de configuración).
- El resultado de la operación (éxito/error) se devuelve al frontend.

### c) Actualizaciones en tiempo real (WebSocket)
- El frontend abre una conexión WebSocket con el backend.
- El backend, a su vez, mantiene una conexión WebSocket con Moonraker.
- Cuando Moonraker emite un evento (por ejemplo, cambio de estado, error, progreso), el backend lo recibe y lo reenvía al frontend.
- El frontend actualiza la UI en tiempo real según los eventos recibidos.

---

## 3. Componentes principales

- **moonraker_client.py**: Módulo que encapsula toda la lógica de comunicación con Moonraker (HTTP y WebSocket).
- **fleet_service.py**: Orquesta la lógica de negocio, fusiona datos de `printers.json` y Moonraker, y delega comandos.
- **fleet_controller.py**: Expone los endpoints al frontend y gestiona la comunicación WebSocket.
- **printers.json**: Archivo local con la configuración y metadatos de las impresoras.
- **Frontend (fleet.js, fleet.html)**: Solicita datos, envía acciones y recibe eventos en tiempo real.

---

## 4. Ejemplo de flujo típico

1. **Carga de la flota**:
   - Frontend pide datos → Backend consulta `printers.json` y Moonraker → Fusiona datos → Devuelve al frontend.

2. **Acción de usuario (ej. iniciar impresión)**:
   - Frontend envía acción → Backend valida → Llama a Moonraker para ejecutar comando → Actualiza `printers.json` si aplica → Devuelve resultado.

3. **Actualización en tiempo real**:
   - Moonraker emite evento (ej. impresión completada) → Backend recibe por WebSocket → Reenvía al frontend → UI se actualiza automáticamente.

---

## 5. Ventajas de este enfoque

- Permite gestionar tanto la configuración local como el estado real de las impresoras.
- Escalable: puedes añadir más impresoras y más endpoints de Moonraker fácilmente.
- Modular: la lógica de integración está aislada en un módulo, facilitando el mantenimiento y la extensión.
- UX óptima: el usuario ve información en tiempo real y puede controlar la flota desde una sola interfaz.

---

## 6. Resumen visual (ver diagrama flujo_gestion_flota.mmd)

El diagrama `infografia/flujo_gestion_flota.mmd` refleja gráficamente este flujo y arquitectura, mostrando cómo interactúan los módulos de KyberCore con Moonraker tanto en operaciones síncronas (HTTP) como asíncronas (WebSocket).
