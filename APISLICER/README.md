# 3D Slicer API

API REST para laminar archivos STL usando PrusaSlicer en Docker.

## Características

- **Endpoint POST /slice**: Recibe STL, devuelve gcode
- **Parámetros configurables**: layer height, fill density, temperaturas
- **Múltiples perfiles**: Ender-3, Ender-3 Pro, etc.
- **Dockerizado**: Fácil deployment y escalabilidad
- **Headless**: No requiere interfaz gráfica

## Uso Rápido

```bash
# Construir y ejecutar
docker-compose up --build

# Laminar archivo
curl -X POST "http://localhost:8000/slice" \
  -F "file=@modelo.stl" \
  -F "layer_height=0.2" \
  -F "fill_density=20" \
  -F "printer_profile=ender3" \
  --output modelo.gcode
```

## Endpoints

### POST /slice
Lamina un archivo STL y devuelve el gcode.

**Parámetros:**
- `file`: Archivo STL (required)
- `layer_height`: Altura de capa en mm (default: 0.2)
- `fill_density`: Densidad de relleno % (default: 20)
- `nozzle_temp`: Temperatura extrusor °C (default: 210)
- `bed_temp`: Temperatura cama °C (default: 60)
- `printer_profile`: Perfil de impresora (default: ender3)

### GET /health
Health check del servicio.

### GET /profiles
Lista de perfiles de impresora disponibles.

## Estructura del Proyecto

```
APISLICER/
├── app/
│   └── main.py              # API FastAPI
├── config/
│   └── printer_configs/     # Configuraciones de impresoras
│       ├── ender3.ini
│       └── ender3_pro.ini
├── uploads/                 # Archivos STL temporales
├── output/                  # Archivos gcode generados
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```