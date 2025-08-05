# Gemini Collaboration Guide for KyberCore

Bienvenido a la guía de colaboración de Gemini para el proyecto KyberCore. Este documento me ayuda a entender la estructura, convenciones y flujos de trabajo del proyecto para poder asistirte de la manera más efectiva.

---

## 1. Visión y Descripción del Proyecto

**KyberCore** es un **orquestador local e inteligente para múltiples impresoras 3D**, inspirado en el ecosistema Klipper/Moonraker.

El **aspecto fundamental y diferenciador del proyecto es el uso intensivo de la Inteligencia Artificial**. El objetivo no es solo gestionar impresoras, sino crear un asistente que elimine las conjeturas y el proceso de prueba y error de la impresión 3D. La IA se aplicará para análisis, recomendación, optimización y automatización.

La propuesta de valor principal es: **"Imprime de Forma más Inteligente, no más Dura"**.

---

## 2. Pila Tecnológica (Tech Stack)

- **Backend y Lógica Principal:** **Python**. Toda la lógica de negocio, integración, análisis y servicios se desarrolla en Python.
- **API:** **FastAPI** o **Flask**.
- **Contenerización:** **Docker** y **Docker Compose**.
- **Frontend:** **HTML/CSS/JavaScript** (utilizado para prototipos funcionales y experimentos de UI/UX en `prototype/`).
- **Comunicación con Impresoras:** API de **Moonraker** (HTTP/WebSocket) y comandos **G-code**.

---

## 3. Configuración y Flujo de Trabajo

### 3.1. Ejecutar la Aplicación

**Para desarrollo local:**
```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Ejecutar la aplicación (desde el directorio raíz)
python src/api/main.py
```

**Para despliegue y pruebas de producción:**
```bash
# Levantar el entorno completo con Docker
docker-compose up --build
```

### 3.2. Ejecutar Pruebas

Para validar cualquier cambio, ejecutaré el siguiente comando desde el directorio raíz:
```bash
# Asumo que se usa pytest. Por favor, ajústalo si es diferente.
pytest
```

### 3.3. Linting y Formato de Código

Para mantener un estilo de código consistente, usaré las siguientes herramientas (por favor, confirma o ajústalas):

**Formateador (ej. Black):**
```bash
black .
```

**Linter (ej. ruff, flake8):**
```bash
ruff check .
```

---

## 4. Arquitectura y Archivos Clave

El proyecto sigue una arquitectura modular estricta para la separación de responsabilidades.

- `src/api/main.py`: Punto de entrada principal de la API.
- `src/controllers/`: Gestionan la lógica de las solicitudes de la API, orquestando las operaciones.
- `src/services/`: Implementan la lógica de negocio y las funcionalidades de IA (análisis, recomendación).
- `src/models/`: Definen los modelos y estructuras de datos (ej. `Printer`, `Job`).
- `src/printers/`: Gestionan la flota de impresoras (estado, capacidades, comunicación).
- `src/jobs/`: Gestionan las colas y los trabajos de impresión.
- `src/database/`: Lógica de interacción con la base de datos.
- `src/config/`: Archivos de configuración y parámetros de las impresoras.
- `src/utils/`: Funciones de utilidad reutilizables.
- `prototype/`: Prototipos funcionales y experimentos de UI/UX.
- `docs/`: Documentación estratégica y técnica.
- `INSTRUCCIONES.md`: Instrucciones generales del proyecto.
- `requirements.txt`: Dependencias de Python.
- `Dockerfile` / `docker-compose.yml`: Orquestación de los servicios de Docker.

---

## 5. Hoja de Ruta de Desarrollo (Features Principales)

Mi desarrollo se guiará por la hoja de ruta definida en `docs/investigacion.md`. Las características clave a desarrollar son:

| Nombre de la Característica | Descripción | Fase |
| :--- | :--- | :--- |
| **Analizador de Registros Inteligente** | Analiza `klippy.log` para traducir errores y sugerir soluciones. | **MVP** |
| **Panel de Control Unificado** | UI moderna y personalizable para la gestión de la flota. | **MVP** |
| **Framework de Contribución de Datos** | Backend para la recopilación de datos de impresiones para entrenar la IA. | **MVP** |
| **Recomendador de Perfiles por IA** | Modelo ML que recomienda perfiles de laminado óptimos. | **V2** |
| **Monitor de Calidad Predictivo** | Detección de anomalías en tiempo real combinando vídeo y sensores. | **V2** |
| **Análisis de Calidad Post-Impresión** | Análisis de imagen para identificar defectos y sugerir mejoras. | **V2** |
| **Orquestador de Flota Inteligente** | Asignación optimizada de trabajos a las impresoras más adecuadas. | **Futuro** |
| **Panel de Mantenimiento Predictivo** | Predicción de la vida útil restante (RUL) de los componentes. | **Futuro** |

---

## 6. Convenciones de Código

- **Estilo de Código:** Seguir las convenciones de **PEP 8**.
- **Nomenclatura:** Usar `snake_case` para variables y funciones, y `PascalCase` para clases.
- **Mensajes de Commit:** Seguir el estándar de **Conventional Commits** (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).

---

## 7. Mi Rol (Gemini)

- **Enfoque en IA:** Priorizaré la integración de la IA como valor diferencial en todas mis contribuciones.
- **Contexto Estratégico:** Consultaré `docs/investigacion.md` y `.github/copilot-instructions.md` para guiar las decisiones de desarrollo.
- **Proactividad:** Realizaré las tareas solicitadas y las acciones directamente implicadas (como escribir pruebas para una nueva función).
- **Adherencia:** Seguiré estrictamente las convenciones y guías de este archivo.
- **Seguridad:** No introduciré claves de API, secretos u otra información sensible en el código.