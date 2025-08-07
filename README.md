# KyberCore

🚀 [Ver Demo Interactiva (GitHub Pages)](https://elisaul77.github.io/kybercore/)  


[![CI/CD Pipeline](https://github.com/elisaul77/kybercore/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/elisaul77/kybercore/actions/workflows/ci-cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

Orquestador local de múltiples impresoras 3D con **Inteligencia Artificial integrada**, desarrollado 100% en Python y diseñado para ejecutarse en entornos Docker.

## ✨ Características principales

- 🤖 **IA como diferenciador**: Análisis inteligente, recomendaciones automáticas y optimización
- 🖨️ **Gestión de flota**: Control centralizado de múltiples impresoras 3D
- 🔄 **Tiempo real**: Monitoreo y actualizaciones en vivo via WebSocket
- 🐳 **Containerizado**: Despliegue simple con Docker
- 🏗️ **Arquitectura modular**: Fácil extensión y mantenimiento
- 📊 **Análisis de fallos**: Diagnóstico automático y sugerencias de solución

## Despliegue rápido con Docker

1. Construye la imagen:
   ```sh
   docker build -t kybercore .
   ```
2. O usa docker-compose:
   ```sh
   docker-compose up --build
   ```
3. Accede a la API o interfaz en el puerto 8000 (ajusta según configuración).

## Estructura del Proyecto
- `src/` : Código fuente principal (API, controladores, modelos, servicios, etc.)
- `prototype/` : Prototipos y pruebas de UI/UX
- `docs/` : Documentación estratégica y técnica
- `infografia/` : Material visual y justificación del proyecto
- `tests/` : Pruebas automatizadas

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor lee [CONTRIBUTING.md](CONTRIBUTING.md) para más detalles sobre nuestro proceso de contribución.

## 📋 Roadmap

Consulta la hoja de ruta completa en [`docs/investigacion.md`](docs/investigacion.md) sección 4.3.

## 📚 Documentación

- [Instrucciones de desarrollo](INSTRUCCIONES.md)
- [Documentación técnica](docs/)
- [Material visual](infografia/)

## 🐛 Reportar problemas

Usa el [sistema de issues](https://github.com/elisaul77/kybercore/issues) de GitHub para reportar bugs o sugerir mejoras.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.

Copyright (c) 2025

Se concede permiso, de forma gratuita, a cualquier persona que obtenga una copia de este software y los archivos de documentación asociados (el "Software"), para utilizar el Software sin restricción, incluyendo sin limitación los derechos a usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar y/o vender copias del Software, y permitir a las personas a quienes se les proporcione el Software a hacer lo mismo, sujeto a las siguientes condiciones:

El aviso de copyright anterior y este aviso de permiso se incluirán en todas las copias o partes sustanciales del Software.

EL SOFTWARE SE PROPORCIONA "TAL CUAL", SIN GARANTÍA DE NINGÚN TIPO, EXPRESA O IMPLÍCITA, INCLUYENDO PERO NO LIMITADO A LAS GARANTÍAS DE COMERCIALIZACIÓN, IDONEIDAD PARA UN PROPÓSITO PARTICULAR Y NO INFRACCIÓN. EN NINGÚN CASO LOS AUTORES O TITULARES DEL COPYRIGHT SERÁN RESPONSABLES POR NINGUNA RECLAMACIÓN, DAÑO U OTRA RESPONSABILIDAD, YA SEA EN UNA ACCIÓN DE CONTRATO, AGRAVIO O CUALQUIER OTRA FORMA, DERIVADA DE O EN CONEXIÓN CON EL SOFTWARE O EL USO U OTRO TIPO DE ACCIONES EN EL SOFTWARE.
