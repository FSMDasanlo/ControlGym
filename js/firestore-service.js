import { db } from '../firebase-config.js';
import { doc, getDoc, setDoc, getDocs, collection, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";
import { defaultRoutines } from '../data-model.js';

export async function getUserConfig(userId) {
  const userConfigRef = doc(db, "users", userId, "config", "routines");
  const docSnap = await getDoc(userConfigRef);
  if (docSnap.exists() && docSnap.data().routines) {
    return docSnap.data().routines;
  } else {
    // Si el usuario no tiene configuración (es nuevo o antiguo), se la creamos.
    // Esto es una "migración" automática.
    await setDoc(userConfigRef, { routines: defaultRoutines });
    return defaultRoutines;
  }
}

export async function getAllRegistros(userId) {
  const querySnapshot = await getDocs(collection(db, "users", userId, "registros"));
  const data = {};
  querySnapshot.forEach(doc => {
    data[doc.id] = doc.data();
  });
  return data;
}

export async function guardarRegistro(userId, fecha, rutinaId, ejercicioId, peso, reps) {
  const docRef = doc(db, "users", userId, "registros", fecha);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const datosActuales = docSnap.data();
    const registrosEjercicio = datosActuales[rutinaId]?.[ejercicioId] || [];
    registrosEjercicio.push({ peso, reps, timestamp: Date.now() });
    await updateDoc(docRef, { [`${rutinaId}.${ejercicioId}`]: registrosEjercicio });
    return registrosEjercicio.length - 1; // Devuelve el nuevo índice
  } else {
    const nuevoDato = { [rutinaId]: { [ejercicioId]: [{ peso, reps, timestamp: Date.now() }] } };
    await setDoc(docRef, nuevoDato);
    return 0; // Devuelve el nuevo índice (0)
  }
}

export async function eliminarRegistro(userId, fecha, rutinaId, ejercicioId, index) {
  const docRef = doc(db, "users", userId, "registros", fecha);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;

  const datosActuales = docSnap.data();
  const registrosEjercicio = datosActuales[rutinaId]?.[ejercicioId] || [];
  registrosEjercicio.splice(index, 1);

  // Si ya no quedan registros para este ejercicio, eliminamos también su tiempo acumulado.
  const updateData = {};
  if (registrosEjercicio.length === 0) {
    updateData[`${rutinaId}.${ejercicioId}`] = deleteField();
    updateData[`${rutinaId}.${ejercicioId}_tiempo`] = deleteField(); // Limpiamos el tiempo
  } else {
    updateData[`${rutinaId}.${ejercicioId}`] = registrosEjercicio;
  }
  await updateDoc(docRef, updateData);
}

export async function guardarTiempoEjercicio(userId, fecha, rutinaId, ejercicioId, duracionSegundos) {
  const docRef = doc(db, "users", userId, "registros", fecha);
  const docSnap = await getDoc(docRef);
  const tiempoKey = `${rutinaId}.${ejercicioId}_tiempo`;
  
  const tiempoActual = docSnap.exists() ? (docSnap.data()[rutinaId]?.[`${ejercicioId}_tiempo`] || 0) : 0;
  const nuevoTiempo = tiempoActual + duracionSegundos;

  await setDoc(docRef, { [rutinaId]: { [`${ejercicioId}_tiempo`]: nuevoTiempo } }, { merge: true });
}

export async function editarRegistro(userId, rutinaId, ejercicioId, oldData, newData) {
  if (newData.fecha === oldData.fecha) {
    // La fecha no ha cambiado, solo actualizamos
    const docRef = doc(db, "users", userId, "registros", oldData.fecha);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const datos = docSnap.data();
      const registrosEjercicio = datos[rutinaId]?.[ejercicioId] || [];
      if (registrosEjercicio[oldData.index]) {
        // Usamos spread syntax (...) para mantener el timestamp original y otros campos si los hubiera
        registrosEjercicio[oldData.index] = { ...registrosEjercicio[oldData.index], peso: newData.peso, reps: newData.reps };
        await updateDoc(docRef, { [`${rutinaId}.${ejercicioId}`]: registrosEjercicio });
      }
    }
  } else {
    // La fecha ha cambiado, movemos el registro
    // 1. Eliminar el antiguo
    await eliminarRegistro(userId, oldData.fecha, rutinaId, ejercicioId, oldData.index);

    // 2. Guardar el nuevo
    const docRefNuevo = doc(db, "users", userId, "registros", newData.fecha);
    const docSnapNuevo = await getDoc(docRefNuevo);
    const datosNuevos = docSnapNuevo.exists() ? docSnapNuevo.data() : {};
    const registrosNuevos = datosNuevos[rutinaId]?.[ejercicioId] || [];
    // Al mover de fecha, se considera un nuevo registro en el tiempo, pero podríamos mantener el timestamp original si quisiéramos.
    // Por simplicidad y lógica de "nuevo día", creamos uno nuevo o mantenemos el actual. Vamos a crear uno nuevo para que se ordene bien en el nuevo día.
    registrosNuevos.push({ peso: newData.peso, reps: newData.reps, timestamp: Date.now() });
    await setDoc(docRefNuevo, { ...datosNuevos, [rutinaId]: { ...datosNuevos[rutinaId], [ejercicioId]: registrosNuevos } }, { merge: true });
    return registrosNuevos.length - 1; // Devolvemos el nuevo índice
  }
  return oldData.index; // Si no se movió, el índice no cambia
}

export async function guardarTiempoTotal(userId, fecha, duracionSegundos) {
  const docRef = doc(db, "users", userId, "registros", fecha);
  await setDoc(docRef, { tiempoTotal: duracionSegundos }, { merge: true });
}

export async function saveUserConfig(userId, routines) {
  const userConfigRef = doc(db, "users", userId, "config", "routines");
  await setDoc(userConfigRef, { routines: routines });
}
