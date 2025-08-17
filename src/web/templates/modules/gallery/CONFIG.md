# Gallery Module Configuration

## Archivos de Templates
- `/src/web/templates/modules/gallery_dynamic.html` - Template principal de la galería
- `/src/web/templates/modules/gallery/project_modal.html` - Componente HTML del modal

## Archivos JavaScript (Static)
- `/src/web/static/js/modules/gallery/project_modal.js` - Clase ProjectModal y funcionalidad
- `/src/web/static/js/modules/gallery/gallery_functions.js` - Funciones principales de galería

## Integración en Templates

```html
<!-- En gallery_dynamic.html -->
{% include 'modules/gallery/project_modal.html' %}

<!-- Scripts -->
<script src="/static/js/modules/gallery/project_modal.js"></script>
<script src="/static/js/modules/gallery/gallery_functions.js"></script>
```

## Estructura Final
```
src/web/
├── templates/modules/gallery/
│   ├── README.md
│   └── project_modal.html
└── static/js/modules/gallery/
    ├── project_modal.js
    └── gallery_functions.js
```
