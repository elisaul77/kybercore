# Contribuyendo a KyberCore

¡Gracias por tu interés en contribuir a KyberCore! Este proyecto es un orquestador local para múltiples impresoras 3D que aprovecha la Inteligencia Artificial como aspecto fundamental y diferenciador.

## 🚀 Cómo contribuir

### 1. Reportar bugs
- Usa la sección de Issues de GitHub
- Describe el problema con detalle
- Incluye pasos para reproducir el error
- Añade logs relevantes si es posible

### 2. Sugerir mejoras
- Abre un Issue con la etiqueta "enhancement"
- Explica claramente la funcionalidad propuesta
- Describe cómo encaja con la visión del proyecto

### 3. Enviar código

#### Configuración del entorno de desarrollo
```bash
# Clona el repositorio
git clone https://github.com/tu_usuario/kybercore.git
cd kybercore

# Instala dependencias
pip install -r requirements.txt

# Ejecuta en modo desarrollo
python src/api/main.py

# O usa Docker
docker-compose up --build
```

#### Flujo de trabajo para Pull Requests
1. Haz fork del repositorio
2. Crea una nueva rama: `git checkout -b feature/mi-nueva-funcionalidad`
3. Realiza tus cambios siguiendo las convenciones del proyecto
4. Asegúrate de que los tests pasen
5. Commit con mensajes descriptivos
6. Push a tu fork: `git push origin feature/mi-nueva-funcionalidad`
7. Abre un Pull Request

## 📋 Estándares de código

### Arquitectura
- **Toda la aplicación se desarrolla en Python**
- Arquitectura modular: `api/`, `controllers/`, `models/`, `services/`, `printers/`, `jobs/`
- Separación estricta de responsabilidades
- **Enfoque en IA**: Todas las nuevas funcionalidades deben considerar cómo la IA puede aportar valor

### Convenciones de código
- Sigue PEP 8 para Python
- Usa docstrings para funciones y clases
- Nombres descriptivos para variables y funciones
- Comentarios en español cuando sea necesario

### Estructura de commits
```
tipo(ámbito): descripción breve

Descripción más detallada si es necesaria

- Cambio específico 1
- Cambio específico 2
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🧪 Pruebas

- Ejecuta las pruebas antes de enviar tu PR
- Añade pruebas para nueva funcionalidad
- Asegúrate de que la cobertura no disminuya

```bash
# Ejecutar pruebas (cuando estén implementadas)
python -m pytest tests/
```

## 📚 Documentación

- Actualiza la documentación si tu cambio afecta la funcionalidad
- Añade comentarios en el código para lógica compleja
- Actualiza el README.md si es necesario
- Considera actualizar los diagramas en `infografia/` si cambias la arquitectura

## 🏗️ Áreas de contribución prioritarias

1. **Análisis de fallos con IA** - Migrar lógica del prototipo al backend
2. **Recomendador de perfiles** - Algoritmos de optimización multi-objetivo
3. **Integración con más impresoras** - Soporte para nuevas marcas/modelos
4. **Análisis automático de logs** - Procesamiento inteligente de `klippy.log`
5. **Interfaz de usuario** - Migración del prototipo a interfaz real
6. **Pruebas automatizadas** - Cobertura completa del sistema

## 💡 Filosofía del proyecto

- **IA como diferenciador**: Cada nueva funcionalidad debe considerar cómo la IA puede mejorar la experiencia
- **Modularidad**: Diseño extensible para nuevos tipos de impresoras y algoritmos
- **Documentación clara**: Código auto-documentado y guías comprensibles
- **Calidad sobre cantidad**: Preferimos contribuciones bien pensadas y testeadas

## 📞 Contacto

- Abre un Issue para discusiones técnicas
- Revisa la documentación en `docs/investigacion.md` para contexto estratégico

¡Esperamos tu contribución! 🎯
