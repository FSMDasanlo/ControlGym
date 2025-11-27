let grafica = null;

export function inicializarPagina(rutina, ejercicio, fecha) {
  document.getElementById('fecha').textContent = fecha.split('-').reverse().join('-');
  document.getElementById('tituloPrincipal').textContent = rutina.titulo;
  document.getElementById('tituloEjercicio').textContent = ejercicio.nombre;
  document.getElementById('volverEjercicios').href = `ejercicios.html?fecha=${fecha}&rutinaId=${rutina.id}`;
  document.getElementById('volverRutinas').href = `rutinas.html?fecha=${fecha}`;

  const videoUrl = ejercicio.video;
  if (videoUrl) {
    let embedHtml = '';
    if (videoUrl.includes('youtube.com/watch')) {
      const videoId = new URL(videoUrl).searchParams.get('v');
      embedHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    } else if (videoUrl.includes('youtube.com/shorts/')) {
      const videoId = videoUrl.split('/shorts/')[1];
      embedHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    } else {
      embedHtml = `<a href="${videoUrl}" target="_blank">▶ Ver vídeo del ejercicio</a>`;
    }
    document.getElementById('videoEjercicio').innerHTML = embedHtml;
  }
}

export function actualizarTabla(registros, sortState, numRegistrosMostrados, onEdit, onDelete) {
  const tbody = document.getElementById('tbody');
  const tfoot = document.getElementById('tfoot');

  if (!registros.length) {
    tbody.innerHTML = `<tr><td colspan="4">No hay datos guardados aún</td></tr>`;
    tfoot.innerHTML = '';
    document.getElementById('ver-mas').style.display = 'none';
    document.getElementById('ver-menos').style.display = 'none';
    return;
  }

  document.getElementById('ver-mas').style.display = (numRegistrosMostrados >= registros.length) ? 'none' : 'inline-block';
  document.getElementById('ver-menos').style.display = (numRegistrosMostrados > 3) ? 'inline-block' : 'none';

  const maxPeso = Math.max(...registros.map(r => r.peso));
  const maxReps = Math.max(...registros.map(r => r.reps));

  const registrosVisibles = (sortState.column === 'fecha' && sortState.direction === 'asc') ? registros.slice(-numRegistrosMostrados) : registros.slice(0, numRegistrosMostrados);

  tbody.innerHTML = registrosVisibles.map(r => `
    <tr data-fecha="${r.fecha}" data-idx="${r.index}">
      <td contenteditable="true" class="edit-fecha">${r.fecha.split('-').reverse().join('-')}</td>
      <td contenteditable="true" class="edit-peso ${r.peso === maxPeso ? 'max-valor' : ''}"><span>${r.peso}</span></td>
      <td contenteditable="true" class="edit-reps ${r.reps === maxReps ? 'max-valor' : ''}"><span>${r.reps}</span></td>
      <td>
        <div class="action-buttons-container">
          <button class="boton-accion edit" data-fecha="${r.fecha}" data-idx="${r.index}" title="Editar registro">✏️</button>
          <button class="boton-accion delete" data-fecha="${r.fecha}" data-idx="${r.index}" title="Eliminar registro">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Añadir event listeners a los nuevos botones
  tbody.querySelectorAll('.boton-accion.edit').forEach(btn => btn.onclick = () => onEdit(btn));
  tbody.querySelectorAll('.boton-accion.delete').forEach(btn => btn.onclick = () => onDelete(btn.dataset.fecha, parseInt(btn.dataset.idx)));

  actualizarResumen(registros);
}

function actualizarResumen(registros) {
  if (!registros.length) return;
  const dias = registros.length;
  const mediaPeso = (registros.reduce((a, b) => a + b.peso, 0) / dias).toFixed(2);
  const mediaReps = (registros.reduce((a, b) => a + b.reps, 0) / dias).toFixed(2);
  document.getElementById('tfoot').innerHTML = `<tr><td>${dias} Series</td><td>${mediaPeso}</td><td>${mediaReps}</td><td></td></tr>`;
}

export function generarGrafica(registros, vistaActual) {
  const ctx = document.getElementById('graficaProgreso');
  if (!ctx || !registros.length) return;

  let registrosFiltrados = [...registros];
  if (vistaActual === '2m') {
    const haceDosMeses = new Date();
    haceDosMeses.setMonth(haceDosMeses.getMonth() - 2);
    registrosFiltrados = registros.filter(r => new Date(r.fecha) >= haceDosMeses);
  }

  const etiquetas = registrosFiltrados.map(r => r.fecha.split('-').reverse().join('-'));
  const pesos = registrosFiltrados.map(r => r.peso);
  const reps = registrosFiltrados.map(r => r.reps);

  if (grafica) grafica.destroy();

  grafica = new Chart(ctx, {
    type: 'line',
    data: {
      labels: etiquetas,
      datasets: [
        { label: 'Peso (kg)', data: pesos, borderColor: 'blue', tension: 0.2, fill: false },
        { label: 'Repeticiones', data: reps, borderColor: 'orange', tension: 0.2, fill: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { color: 'white', maxTicksLimit: 5 }, grid: { color: 'rgba(255,255,255,0.1)' } },
        x: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } }
      }
    }
  });
  return grafica; // Devolvemos la instancia para poder interactuar con ella
}

export function mostrarToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.className = "show";
  setTimeout(() => toast.className = toast.className.replace("show", ""), 2000);
}