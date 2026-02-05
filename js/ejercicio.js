import { checkAuth } from './auth.js';
import * as ui from './ui.js';
import * as store from './firestore-service.js';

checkAuth(initializeApp);

async function initializeApp(user) {
  const userId = user.uid;

  const params = new URLSearchParams(window.location.search);
  const fecha = params.get('fecha');
  const rutinaId = params.get('rutinaId');
  const ejercicioId = params.get('ejercicioId');

  const userRoutines = await store.getUserConfig(userId);
  const rutina = userRoutines.find(r => r.id === rutinaId);
  const ejercicio = rutina ? rutina.ejercicios.find(e => e.id === ejercicioId) : null;

  if (!rutina || !ejercicio) {
    document.body.innerHTML = "<h1>Error: Ejercicio no encontrado</h1>";
    return;
  }

  const thead = document.getElementById('thead');
  thead.innerHTML = `<tr>
    <th data-sort="fecha">Fecha<span id="ver-mas" class="control-vista-tabla" title="Mostrar 10 más">+</span><span id="ver-menos" class="control-vista-tabla" title="Mostrar solo los 3 últimos" style="display: none;">x</span><span class="sort-icon"></span></th>
    <th data-sort="peso">Peso (kg)<span class="sort-icon"></span></th>
    <th data-sort="reps">Repeticiones<span class="sort-icon"></span></th>
    <th>Acciones</th></tr>`;

  // Tiempo en esta página
  const entryTime = Date.now();

  // Estado de la aplicación
  let registros = [];
  let sortState = { column: 'fecha', direction: 'desc' }; // Cambiado a descendente por defecto
  let numRegistrosMostrados = 3;
  let vistaGrafica = '2m';
  let graficaInstance = null;

  // Cargar datos iniciales
  const data = await store.getAllRegistros(userId);
  let tiempoEjercicio = 0;
  for (const f in data) {
    const ejer = data[f]?.[rutinaId]?.[ejercicioId];
    if (Array.isArray(ejer)) {
      ejer.forEach((r, i) => registros.push({ fecha: f, peso: r.peso, reps: r.reps, index: i, timestamp: r.timestamp }));
    }
    // Recuperamos el tiempo del ejercicio si existe para la fecha actual
    if (f === fecha) {
      tiempoEjercicio = data[f]?.[rutinaId]?.[`${ejercicioId}_tiempo`] || 0;
    }
  }

  ui.inicializarPagina(rutina, ejercicio, fecha, tiempoEjercicio);

  // --- Lógica del Temporizador Global ---
  const timerDisplay = document.getElementById('global-workout-time');
  const initTimerBtn = document.getElementById('btn-init-timer');
  
  function updateGlobalTimer() {
    const startTime = localStorage.getItem('workoutStartTime');
    const workoutDate = localStorage.getItem('workoutDate');
    
    if (startTime && workoutDate === fecha) {
      const elapsed = Date.now() - parseInt(startTime);
      const totalSeconds = Math.floor(elapsed / 1000);
      const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const s = String(totalSeconds % 60).padStart(2, '0');
      if(timerDisplay) timerDisplay.textContent = `${h}:${m}:${s}`;
    } else {
      if(timerDisplay) timerDisplay.textContent = "00:00:00";
    }
  }

  if(initTimerBtn) {
    initTimerBtn.addEventListener('click', () => {
      if (confirm("¿Iniciar o reiniciar el cronómetro de la sesión?")) {
        localStorage.setItem('workoutStartTime', Date.now());
        localStorage.setItem('workoutDate', fecha);
        updateGlobalTimer();
      }
    });
  }
  setInterval(updateGlobalTimer, 1000);
  updateGlobalTimer(); // Ejecutar inmediatamente

  sortRegistros();
  repintarUI();

  function sortRegistros() {
    registros.sort((a, b) => {
      const dir = sortState.direction === 'asc' ? 1 : -1;
      // Orden principal por columna
      if (a[sortState.column] > b[sortState.column]) return 1 * dir;
      if (a[sortState.column] < b[sortState.column]) return -1 * dir;
      // Desempate: Si la fecha es la misma, usamos el índice (orden de inserción)
      // Si es DESC, queremos el índice mayor primero. Si es ASC, el menor primero.
      return (a.index - b.index) * dir;
    });
  }

  function repintarUI() {
    ui.actualizarTabla(registros, sortState, numRegistrosMostrados, handleEdit, handleDelete);
    graficaInstance = ui.generarGrafica(registros, vistaGrafica);
  }

  // --- Handlers de eventos ---
  async function handleSave() {
    const peso = parseFloat(document.getElementById('peso').value) || 0;
    const reps = parseInt(document.getElementById('reps').value) || 0;

    // Alerta de olvido: si hay datos pero no hay cronómetro
    const workoutDate = localStorage.getItem('workoutDate');
    const startTime = localStorage.getItem('workoutStartTime');
    if ((!startTime || workoutDate !== fecha) && (peso > 0 || reps > 0)) {
      if (confirm("⚠️ El cronómetro no está iniciado.\n\n¿Quieres iniciarlo ahora?")) {
        localStorage.setItem('workoutStartTime', Date.now());
        localStorage.setItem('workoutDate', fecha);
        updateGlobalTimer();
      }
    }

    const nuevoIndex = await store.guardarRegistro(userId, fecha, rutinaId, ejercicioId, peso, reps);
    registros.push({ fecha, peso, reps, index: nuevoIndex, timestamp: Date.now() });
    
    sortRegistros();
    repintarUI();

    // Resaltar visualmente la fila recién creada
    const filaNueva = document.querySelector(`tr[data-fecha="${fecha}"][data-idx="${nuevoIndex}"]`);
    if (filaNueva) {
      filaNueva.classList.add('highlight-new');
      setTimeout(() => filaNueva.classList.remove('highlight-new'), 2000);
    }

    ui.mostrarToast("✅ Datos guardados");
    document.getElementById('peso').value = '';
    document.getElementById('reps').value = '';
  }

  async function handleDelete(fecha, index) {
    if (!confirm("¿Eliminar este registro?")) return;
    
    await store.eliminarRegistro(userId, fecha, rutinaId, ejercicioId, index);
    
    const registroIndex = registros.findIndex(r => r.fecha === fecha && r.index === index);
    if (registroIndex > -1) {
      registros.splice(registroIndex, 1);
      repintarUI();
    }
  }

  async function handleEdit(button) {
    const fila = button.closest('tr');
    const oldData = {
      fecha: fila.dataset.fecha,
      index: parseInt(fila.dataset.idx)
    };
    const newData = {
      fecha: fila.querySelector('.edit-fecha').textContent.split('-').reverse().join('-'),
      peso: parseFloat(fila.querySelector('.edit-peso').textContent),
      reps: parseInt(fila.querySelector('.edit-reps').textContent)
    };

    const nuevoIndex = await store.editarRegistro(userId, rutinaId, ejercicioId, oldData, newData);

    // Actualizar array local
    const registroIndexViejo = registros.findIndex(r => r.fecha === oldData.fecha && r.index === oldData.index);
    if (registroIndexViejo > -1 && nuevoIndex !== undefined) {
      registros[registroIndexViejo] = { ...newData, index: nuevoIndex };
    }

    sortRegistros();
    repintarUI();
    ui.mostrarToast("✏️ Cambios guardados");
  }

  // --- Asignación de Event Listeners ---
  const guardarBtn = document.getElementById('guardar');
  
  // Usamos una función manejadora para evitar doble ejecución en caso de añadir más eventos
  const handleSaveEvent = (event) => {
      event.preventDefault(); // Previene comportamientos por defecto (como enviar un formulario)
      handleSave();
  };
  guardarBtn.addEventListener('click', handleSaveEvent);
  guardarBtn.addEventListener('touchend', handleSaveEvent); // Añadido para máxima compatibilidad en iOS

  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.sort;
      if (sortState.column === column) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
      } else {
        sortState.column = column;
        sortState.direction = (column === 'fecha') ? 'asc' : 'desc';
      }
      sortRegistros();
      repintarUI();
    });
  });

  document.getElementById('ver-mas').addEventListener('click', () => {
    numRegistrosMostrados += 10;
    if (numRegistrosMostrados > registros.length) numRegistrosMostrados = registros.length;
    repintarUI();
  });

  document.getElementById('ver-menos').addEventListener('click', () => {
    numRegistrosMostrados = 3;
    repintarUI();
  });

  document.getElementById('toggleVista').addEventListener('click', () => {
    vistaGrafica = vistaGrafica === '2m' ? 'all' : '2m';
    document.getElementById('toggleVista').textContent = vistaGrafica === '2m' ? '📈 Histórico' : '📅 Dos últimos meses';
    repintarUI();
  });

  document.getElementById('grafica-leyenda').addEventListener('click', (e) => {
    const item = e.target.closest('.leyenda-item');
    if (!item || !graficaInstance) return;
    const datasetIndex = parseInt(item.dataset.datasetIndex);
    graficaInstance.setDatasetVisibility(datasetIndex, !graficaInstance.isDatasetVisible(datasetIndex));
    graficaInstance.update();
  });

  // Guardar el tiempo en la página al salir
  window.addEventListener('pagehide', () => {
    const durationSeconds = Math.round((Date.now() - entryTime) / 1000);
    if (durationSeconds > 2) { // Solo guardar si ha estado más de 2 segundos
      store.guardarTiempoEjercicio(userId, fecha, rutinaId, ejercicioId, durationSeconds);
    }
  });
}