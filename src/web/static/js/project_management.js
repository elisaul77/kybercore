// --- Configuración de proyectos de ejemplo ---
const ganttProjects = [
  {
    name: 'AlphaCAM',
    color: 'indigo',
    durationHours: 12, // duración total en horas
    startHour: 2, // hora de inicio (0-23)
    progress: 8 // horas completadas
  },
  {
    name: 'SensorHub',
    color: 'amber',
    durationHours: 10,
    startHour: 6,
    progress: 5
  },
  {
    name: 'BetaRig',
    color: 'emerald',
    durationHours: 6,
    startHour: 12,
    progress: 2
  }
];

function renderGanttTimeline(scale) {
  const labelsContainer = document.getElementById('gantt-timeline-labels');
  if (!labelsContainer) return;
  labelsContainer.innerHTML = '';
  if (scale === 'hours') {
    for (let h = 0; h < 24; h++) {
      const div = document.createElement('div');
      div.textContent = h + ':00';
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

function initProjectManagement() {
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

const observer = new MutationObserver(function(mutations) {
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
observer.observe(document.body, { childList: true, subtree: true });
