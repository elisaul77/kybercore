// --- Configuración de proyectos reales ---
window.ganttProjects = window.ganttProjects || [
  {
    name: 'ATX Power Supply',
    color: 'indigo',
    durationHours: 18, // duración estimada en horas
    startHour: 2, // hora de inicio (0-23)
    progress: 0, // horas completadas
    id: 1,
    category: 'Electrónico',
    author: 'AlwaysBlue',
    files: 9,
    status: 'listo'
  },
  {
    name: 'Aquarium Guard Tower',
    color: 'amber',
    durationHours: 6,
    startHour: 6,
    progress: 0,
    id: 2,
    category: 'Decorativo', 
    author: 'J_Tonkin',
    files: 4,
    status: 'listo'
  },
  {
    name: 'Flexi Dog',
    color: 'emerald',
    durationHours: 4,
    startHour: 12,
    progress: 0,
    id: 3,
    category: 'Juguete',
    author: 'CapybaraLover',
    files: 1,
    status: 'listo'
  }
];

// Función para cargar proyectos desde la API
async function loadProjectsFromAPI() {
  try {
    const response = await fetch('/api/gallery/projects');
    if (response.ok) {
      const data = await response.json();
      // Convertir formato de API a formato de Gantt
      ganttProjects = data.projects.map(project => {
        const categoria = project.categoria || project.tipo || project.category || '';
        const analisis = (project.analisis_ia || project.aiAnalysis || {});
        const progreso = project.progreso || {};
        const archivos = Array.isArray(project.archivos) ? project.archivos : (Array.isArray(project.files) ? project.files : []);

        return {
          name: project.nombre || project.name || 'Proyecto',
          color: getProjectColor(categoria),
          durationHours: parseTimeEstimate(analisis.tiempo_estimado || analisis.estimatedTime || '8h'),
          startHour: 2, // Por defecto
          progress: progreso.piezas_completadas || progreso.completadas || 0,
          id: project.id,
          category: categoria,
          author: project.autor || project.author || 'Usuario',
          files: archivos.length,
          status: project.estado || project.status || 'listo'
        };
      });
      console.log('📋 Proyectos cargados desde API:', ganttProjects.length);
    }
  } catch (error) {
    console.warn('⚠️ Error cargando proyectos desde API, usando datos por defecto:', error);
  }
}

// Función auxiliar para mapear categorías a colores
function getProjectColor(categoria) {
  const colorMap = {
    'funcional': 'indigo',
    'decorativo': 'amber', 
    'juguete': 'emerald',
    'electronico': 'blue',
    'mecanico': 'green'
  };
  if (!categoria || typeof categoria !== 'string') return 'gray';
  return colorMap[categoria.toLowerCase()] || 'gray';
}

// Función auxiliar para parsear tiempo estimado
function parseTimeEstimate(timeStr) {
  // Parsear formato "18h 30m" a horas decimales
  const match = timeStr.match(/(\d+)h\s*(\d+)?m?/);
  if (match) {
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    return hours + (minutes / 60);
  }
  return 8; // Por defecto
}

function renderGanttTimeline(scale) {
  const labelsContainer = document.getElementById('gantt-timeline-labels');
  if (!labelsContainer) return;
  labelsContainer.innerHTML = '';
  if (scale === 'hours') {
    for (let h = 0; h < 24; h++) {
      const div = document.createElement('div');
      div.textContent = h; // Solo la hora, sin minutos
      div.className = 'px-1';
      labelsContainer.appendChild(div);
    }
    labelsContainer.style.gridTemplateColumns = 'repeat(24, minmax(0, 1fr))';
  } else {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    for (let d = 0; d < 7; d++) {
      const div = document.createElement('div');
      div.textContent = days[d];
      div.className = 'px-1';
      labelsContainer.appendChild(div);
    }
    labelsContainer.style.gridTemplateColumns = 'repeat(7, minmax(0, 1fr))';
  }
}

function renderGanttRows(scale) {
  document.querySelectorAll('.gantt-row').forEach(row => {
    const projectName = row.getAttribute('data-project');
    const project = ganttProjects.find(p => p.name === projectName);
    row.innerHTML = '';
    if (!project) return;
    if (scale === 'hours') {
      row.style.gridTemplateColumns = 'repeat(24, minmax(0, 1fr))';
      for (let h = 0; h < 24; h++) {
        const cell = document.createElement('div');
        if (h >= project.startHour && h < project.startHour + project.durationHours) {
          // Progreso
          if (h < project.startHour + project.progress) {
            cell.className = `bg-${project.color}-500 rounded-lg flex items-center justify-center`;
            if (h === project.startHour + project.progress - 1) {
              cell.innerHTML = '<div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>';
            }
          } else {
            cell.className = `bg-${project.color}-200 rounded-lg`;
          }
        } else {
          cell.className = 'bg-gray-200 rounded-lg';
        }
        row.appendChild(cell);
      }
    } else {
      // Vista por días (simulación: cada proyecto ocupa 2-3 días)
      row.style.gridTemplateColumns = 'repeat(7, minmax(0, 1fr))';
      for (let d = 0; d < 7; d++) {
        const cell = document.createElement('div');
        if (d < Math.ceil(project.durationHours / 8)) {
          cell.className = `bg-${project.color}-${d === 0 ? '500' : d === 1 ? '400' : '300'} rounded-lg flex items-center justify-center`;
          if (d === Math.floor(project.progress / 8)) {
            cell.innerHTML = '<div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>';
          }
        } else {
          cell.className = 'bg-gray-200 rounded-lg';
        }
        row.appendChild(cell);
      }
    }
  });
}

async function initProjectManagement() {
    // Cargar proyectos desde la API al inicializar
    await loadProjectsFromAPI();
    
    const detailViewBtn = document.getElementById('detail-view-btn');
    const ganttViewBtn = document.getElementById('gantt-view-btn');
    const detailView = document.getElementById('detail-view');
    const ganttView = document.getElementById('gantt-view');
    const ganttScale = document.getElementById('gantt-scale');

    if (detailViewBtn && ganttViewBtn && detailView && ganttView) {
        detailViewBtn.addEventListener('click', () => {
            detailView.classList.remove('hidden');
            ganttView.classList.add('hidden');
            detailViewBtn.classList.add('bg-white', 'text-indigo-600');
            detailViewBtn.classList.remove('bg-white/20', 'border', 'border-white/30');
            ganttViewBtn.classList.add('bg-white/20', 'border', 'border-white/30');
            ganttViewBtn.classList.remove('bg-white', 'text-indigo-600');
        });

        ganttViewBtn.addEventListener('click', () => {
            ganttView.classList.remove('hidden');
            detailView.classList.add('hidden');
            ganttViewBtn.classList.add('bg-white', 'text-indigo-600');
            ganttViewBtn.classList.remove('bg-white/20', 'border', 'border-white/30');
            detailViewBtn.classList.add('bg-white/20', 'border', 'border-white/30');
            detailViewBtn.classList.remove('bg-white', 'text-indigo-600');
            // Renderizar Gantt al mostrarlo
            const scale = ganttScale ? ganttScale.value : 'hours';
            renderGanttTimeline(scale);
            renderGanttRows(scale);
        });
    }

    if (ganttScale) {
      ganttScale.addEventListener('change', function() {
        const scale = ganttScale.value;
        renderGanttTimeline(scale);
        renderGanttRows(scale);
      });
      // Render inicial
      renderGanttTimeline(ganttScale.value);
      renderGanttRows(ganttScale.value);
    }
}

document.addEventListener('DOMContentLoaded', initProjectManagement);
window.initProjectManagement = initProjectManagement;

if (!window._projectManagementObserver) {
  window._projectManagementObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasProjectManagement = addedNodes.some(node => {
          return node.nodeType === Node.ELEMENT_NODE && 
               (node.querySelector && (node.querySelector('#detail-view-btn') || node.querySelector('#gantt-view-btn')));
        });
        if (hasProjectManagement) {
          setTimeout(initProjectManagement, 100);
        }
      }
    });
  });
  window._projectManagementObserver.observe(document.body, { childList: true, subtree: true });
}
