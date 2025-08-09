# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
- **Install dependencies**: `pip install -r requirements.txt`
- **Start development server**: `uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000`
- **Quick start script**: `./run.sh` (starts development server)

### Docker Development
- **Build and run**: `docker-compose up --build`
- **Run in background**: `docker-compose up -d --build`
- **Stop services**: `docker-compose down`

### Testing
- **Run tests with Docker**: `./run_tests.sh`
- **Verbose tests**: `./run_tests.sh -v`
- **Coverage report**: `./run_tests.sh --coverage`
- **Direct pytest**: `python -m pytest tests/`

### Application Access
- **Health check**: http://localhost:8000/health
- **API documentation**: http://localhost:8000/docs (Swagger UI)
- **Alternative docs**: http://localhost:8000/redoc (ReDoc)
- **Main interface**: http://localhost:8000/

## Project Architecture

KyberCore is a Python-based 3D printer fleet orchestrator with AI integration, structured around these core concepts:

### Core Architecture Pattern
- **API Layer** (`src/api/`): FastAPI application with lifespan management
- **Controllers** (`src/controllers/`): Route handlers and request orchestration
- **Services** (`src/services/`): Business logic and external integrations
- **Models** (`src/models/`): Data structures and Pydantic schemas
- **Web Interface** (`src/web/`): Static files and Jinja2 templates

### Key Components
- **Fleet Management**: Central coordination of multiple 3D printers
- **Real-time Monitoring**: WebSocket-based live updates
- **AI Integration**: Analysis, recommendations, and optimization
- **Moonraker Client**: Communication with Klipper-based printers
- **Job Queue System**: Print job management and assignment

### Service Integration
The application uses a service-oriented architecture where:
- `fleet_service` manages printer fleet operations
- `websocket_service` handles real-time communication
- `realtime_monitor` provides live status updates
- `moonraker_client` interfaces with printer APIs

### Data Models
- **Printer**: Core printer representation with status, capabilities, and real-time data
- **Job**: Print job with queuing, assignment, and tracking
- Pydantic schemas in `src/schemas/` define API contracts

## Development Guidelines

### AI as Core Differentiator
Every feature should consider AI integration opportunities:
- Analysis and diagnostics
- Automated recommendations  
- Process optimization
- Intelligent job assignment

### Code Organization
- Strict separation of concerns between layers
- Controllers orchestrate, services implement logic
- Models define data structures only
- Configuration in `src/config/`
- Utilities in `src/utils/`

### Integration Points
- **Moonraker API**: HTTP/WebSocket communication with printers
- **G-code Commands**: Direct printer control
- **Log Analysis**: Klippy log processing for diagnostics
- **WebSocket**: Real-time browser communication

### Testing Strategy
The project uses pytest with Docker-based test execution. Tests cover:
- Controller endpoints
- Service integrations
- WebSocket functionality
- Docker container health

### Docker Configuration
- Multi-stage builds for optimization
- Non-root user execution for security
- Resource limits and health checks
- Volume mounting for development

## Important Files and Patterns

### Configuration Files
- `requirements.txt`: Python dependencies
- `docker-compose.yml`: Service orchestration
- `printers.json`: Printer fleet configuration
- `.github/copilot-instructions.md`: AI development guidelines

### Key Service Patterns
The application follows async/await patterns with proper cleanup:
- Startup initialization in FastAPI lifespan
- Graceful shutdown with resource cleanup
- WebSocket connection management
- Background monitoring tasks

### Front-end Integration
Single Page Application (SPA) architecture:
- Jinja2 templates with modular includes
- WebSocket-based real-time updates
- RESTful API consumption
- Static asset serving

This architecture enables scalable 3D printer fleet management with AI-powered features while maintaining clean separation of concerns and extensibility for new printer types and analysis algorithms.