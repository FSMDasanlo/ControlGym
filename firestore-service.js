import { db } from '../firebase-config.js';
import { doc, getDoc, setDoc, getDocs, collection, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

export async function getUserConfig(userId) {
  const userConfigRef = doc(db, "users", userId, "config", "routines");
  const docSnap = await getDoc(userConfigRef);
  return docSnap.exists() ? docSnap.data().routines : [];
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
    registrosEjercicio.push({ peso, reps });
    await updateDoc(docRef, { [`${rutinaId}.${ejercicioId}`]: registrosEjercicio });
    return registrosEjercicio.length - 1; // Devuelve el nuevo índice
  } else {
    const nuevoDato = { [rutinaId]: { [ejercicioId]: [{ peso, reps }] } };
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

  const updateData = {};
  if (registrosEjercicio.length === 0) {
    updateData[`${rutinaId}.${ejercicioId}`] = deleteField();
  } else {
    updateData[`${rutinaId}.${ejercicioId}`] = registrosEjercicio;
  }
  await updateDoc(docRef, updateData);
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
        registrosEjercicio[oldData.index] = { peso: newData.peso, reps: newData.reps };
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
    registrosNuevos.push({ peso: newData.peso, reps: newData.reps });
    await setDoc(docRefNuevo, { ...datosNuevos, [rutinaId]: { ...datosNuevos[rutinaId], [ejercicioId]: registrosNuevos } }, { merge: true });
    return registrosNuevos.length - 1; // Devolvemos el nuevo índice
  }
  return oldData.index; // Si no se movió, el índice no cambia
}