# KyberCore

Orquestador local de múltiples impresoras 3D, desarrollado 100% en Python y diseñado para ejecutarse en entornos Docker.

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

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.

Copyright (c) 2025

Se concede permiso, de forma gratuita, a cualquier persona que obtenga una copia de este software y los archivos de documentación asociados (el "Software"), para utilizar el Software sin restricción, incluyendo sin limitación los derechos a usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar y/o vender copias del Software, y permitir a las personas a quienes se les proporcione el Software a hacer lo mismo, sujeto a las siguientes condiciones:

El aviso de copyright anterior y este aviso de permiso se incluirán en todas las copias o partes sustanciales del Software.

EL SOFTWARE SE PROPORCIONA "TAL CUAL", SIN GARANTÍA DE NINGÚN TIPO, EXPRESA O IMPLÍCITA, INCLUYENDO PERO NO LIMITADO A LAS GARANTÍAS DE COMERCIALIZACIÓN, IDONEIDAD PARA UN PROPÓSITO PARTICULAR Y NO INFRACCIÓN. EN NINGÚN CASO LOS AUTORES O TITULARES DEL COPYRIGHT SERÁN RESPONSABLES POR NINGUNA RECLAMACIÓN, DAÑO U OTRA RESPONSABILIDAD, YA SEA EN UNA ACCIÓN DE CONTRATO, AGRAVIO O CUALQUIER OTRA FORMA, DERIVADA DE O EN CONEXIÓN CON EL SOFTWARE O EL USO U OTRO TIPO DE ACCIONES EN EL SOFTWARE.
