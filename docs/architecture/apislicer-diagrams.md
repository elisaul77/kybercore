# APISLICER - Diagramas de Arquitectura

## Arquitectura General del Sistema

```mermaid
graph TB
    subgraph "KyberCore Ecosystem"
        KC[KyberCore Main App]
        DB[(Base de Datos)]
        WS[WebSocket Handler]
    end
    
    subgraph "APISLICER Service"
        API[FastAPI Server<br/>Port 8001]
        FM[File Manager]
        PS[PrusaSlicer Engine]
        CFG[Config Manager]
    end
    
    subgraph "Storage"
        UPL[/app/uploads<br/>STL Files]
        OUT[/app/output<br/>G-code Files] 
        CNF[/app/config<br/>Printer Profiles]
    end
    
    subgraph "External"
        CLI[CLI/curl]
        GUI[Web Interface]
        EXT[External Apps]
    end
    
    KC --> API
    CLI --> API
    GUI --> API
    EXT --> API
    
    API --> FM
    API --> PS
    API --> CFG
    
    FM --> UPL
    FM --> OUT
    PS --> OUT
    CFG --> CNF
    
    PS --> |reads| CNF
    PS --> |writes| OUT
```

## Flujo de Procesamiento de Archivos

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as APISLICER API
    participant FS as File System
    participant PS as PrusaSlicer
    participant CFG as Config Manager
    
    Note over C,CFG: Inicio del proceso de slice
    
    C->>API: POST /slice (STL + parámetros)
    
    Note over API: Validación de entrada
    API->>API: Validar archivo STL
    API->>API: Validar parámetros
    
    Note over API,FS: Gestión de archivos
    API->>FS: Guardar STL temporal (UUID)
    FS-->>API: Confirmación archivo guardado
    
    Note over API,CFG: Configuración
    API->>CFG: Cargar perfil impresora
    CFG-->>API: Configuración del perfil
    
    Note over API,PS: Procesamiento
    API->>PS: Ejecutar comando slice
    Note over PS: prusa-slicer --export-gcode<br/>--load config.ini<br/>--layer-height 0.2<br/>--output file.gcode<br/>input.stl
    
    PS->>FS: Escribir G-code generado
    FS-->>PS: Confirmación escritura
    PS-->>API: Proceso completado (código salida)
    
    Note over API,FS: Respuesta
    API->>FS: Leer G-code generado
    FS-->>API: Contenido G-code
    API->>C: Retornar archivo G-code
    
    Note over API,FS: Limpieza
    API->>FS: Eliminar STL temporal
    FS-->>API: Archivo eliminado
    
    Note over C,CFG: Proceso completado
```

## Arquitectura de Componentes

```mermaid
graph LR
    subgraph "APISLICER Container"
        subgraph "FastAPI Application"
            MAIN(main.py)
            HEALTH(/health endpoint)
            SLICE(/slice endpoint) 
            PROF(/profiles endpoint)
        end
        
        subgraph "PrusaSlicer Integration"
            WRAPPER(Binary Wrapper)
            EXEC(prusa-slicer executable)
            EXTRACT(AppImage Extract)
        end
        
        subgraph "File Management"
            UPLOAD(Upload Handler)
            OUTPUT(Output Manager)
            CLEANUP(Cleanup Service)
        end
        
        subgraph "Configuration"
            INI(Printer Profiles .ini)
            ENV(Environment Variables)
            PATHS(Path Configuration)
        end
        
        subgraph "System Services"
            XVFB(Virtual Display)
            PYTHON(Python Runtime)
            UBUNTU(Ubuntu 24.04 Base)
        end
    end
    
    MAIN --> HEALTH
    MAIN --> SLICE
    MAIN --> PROF
    
    SLICE --> UPLOAD
    SLICE --> WRAPPER
    SLICE --> OUTPUT
    SLICE --> CLEANUP
    
    WRAPPER --> EXEC
    EXEC --> EXTRACT
    
    PROF --> INI
    
    UPLOAD --> PATHS
    OUTPUT --> PATHS
    
    WRAPPER --> XVFB
    MAIN --> PYTHON
    PYTHON --> UBUNTU
```


## Flujo de Estados del Archivo

```mermaid
stateDiagram-v2
    [*] --> Received: Cliente envía STL
    
    Received --> Validating: Verificar formato
    Validating --> Invalid: Formato incorrecto
    Invalid --> [*]: Error 400
    
    Validating --> Stored: STL válido
    Stored --> Processing: Ejecutar PrusaSlicer
    
    Processing --> Slicing: Proceso iniciado
    Slicing --> Failed: Error en slice
    Failed --> Cleanup: Limpiar archivos
    Cleanup --> [*]: Error 500
    
    Slicing --> Generated: G-code creado
    Generated --> Serving: Enviar al cliente
    Serving --> Cleanup2: Eliminar temporales
    Cleanup2 --> [*]: Éxito 200
```

## Diagrama de Despliegue

```mermaid
graph TB
    subgraph "Host System"
        DK[Docker Engine]
        FS[Host File System]
        NET[Network Bridge]
    end
    
    subgraph "Docker Compose Stack"
        subgraph "KyberCore Container"
            KC[KyberCore App<br/>Port 8000]
        end
        
        subgraph "APISLICER Container"
            API[FastAPI Server<br/>Port 8000 internal]
            PS[PrusaSlicer Binary]
            XV[Xvfb Display Server]
        end
        
        subgraph "Volumes"
            VOL1[uploads/]
            VOL2[output/]
            VOL3[config/]
        end
    end
    
    subgraph "External Access"
        PORT1[localhost:8000]
        PORT2[localhost:8001]
        CURL[curl/API clients]
    end
    
    DK --> KC
    DK --> API
    
    FS --> VOL1
    FS --> VOL2
    FS --> VOL3
    
    NET --> PORT1
    NET --> PORT2
    
    PORT1 --> KC
    PORT2 --> API
    
    CURL --> PORT2
    
    API --> VOL1
    API --> VOL2
    API --> VOL3
    
    API --> PS
    API --> XV
```

## Flujo de Integración con KyberCore

```mermaid
sequenceDiagram
    participant UI as KyberCore UI
    participant BE as KyberCore Backend
    participant API as APISLICER API
    participant FS as File Storage
    
    Note over UI,FS: Usuario sube modelo para imprimir
    
    UI->>BE: Upload STL file
    BE->>FS: Store STL in projects
    FS-->>BE: File stored confirmation
    
    Note over UI,FS: Proceso de slice automático
    
    BE->>API: POST /slice with STL
    API->>API: Process with PrusaSlicer
    API-->>BE: Return G-code
    
    BE->>FS: Store G-code with project
    FS-->>BE: G-code stored
    
    Note over UI,FS: Notificación al usuario
    
    BE->>UI: WebSocket: Slice completed
    UI->>UI: Update UI status
    
    Note over UI,FS: Usuario puede descargar o imprimir
    
    UI->>BE: Request print job
    BE->>BE: Queue G-code for printer
    BE->>UI: Job queued confirmation
```

## Monitoreo y Observabilidad

```mermaid
graph TB
    subgraph "APISLICER Monitoring"
        LOG[Container Logs]
        HEALTH[Health Checks]
        METRICS[Performance Metrics]
    end
    
    subgraph "Docker Integration"
        COMPOSE[Docker Compose]
        RESTART[Auto Restart Policy]
        LIMITS[Resource Limits]
    end
    
    subgraph "External Monitoring"
        PROM[Prometheus/Grafana]
        ALERT[Alerting System]
        DASH[Dashboard]
    end
    
    LOG --> COMPOSE
    HEALTH --> RESTART
    METRICS --> LIMITS
    
    LOG --> PROM
    HEALTH --> ALERT
    METRICS --> DASH
    
    COMPOSE --> RESTART
    ALERT --> DASH
```
