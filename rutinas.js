window.GYMRutinas = [
  { id: "r1", titulo: "Pecho, bíceps y abdominales", imagen: "img/rutina1.jpg" },
  { id: "r2", titulo: "Espalda y tríceps", imagen: "img/rutina2.jpg" },
  { id: "r3", titulo: "Hombros, trapecio y piernas", imagen: "img/rutina3.jpg" },
  { id: "r4", titulo: "Pecho y bíceps", imagen: "img/rutina4.jpg" },
  { id: "r5", titulo: "Espalda y tríceps 2", imagen: "img/rutina5.jpg" },
  { id: "r6", titulo: "Rodillas", imagen: "img/rutina6.jpg" } // se puede ocultar sin romper nada
];

// ========================================================================
// LISTA DE IMÁGENES DE FONDO DISPONIBLES
// ========================================================================
window.GYMImagenes = [
  "img/rutina1.jpg", "img/rutina2.jpg", "img/rutina3.jpg",
  "img/rutina4.jpg", "img/rutina5.jpg", "img/rutina6.jpg",
];

// ========================================================================
// AUTO-DESCUBRIMIENTO DE IMÁGENES (MAGIA)
// ========================================================================
// Esta función intenta leer el contenido de la carpeta 'img/' y busca
// automáticamente archivos que empiecen por "rutina" o "maquina" y terminen en ".jpg",
// y expone una promesa (window.GYMImagenes_promise) para saber cuándo ha terminado.
window.GYMImagenes_promise = (async function autoDiscoverImages() {
  try {
    const response = await fetch('img/');
    if (response.ok) {
      const text = await response.text();
      // Buscamos patrones de texto que parezcan nombres de archivo (rutina...jpg o maquina...jpg)
      // \w incluye letras, números y guion bajo. Añadimos guion medio también.
      const matches = text.match(/(rutina|maquina)[\w-]*\.jpg/gi);
      
      if (matches) {
        matches.forEach(filename => {
          const fullPath = `img/${filename}`;
          // Añadimos a la lista si no estaba ya
          if (!window.GYMImagenes.includes(fullPath)) {
            window.GYMImagenes.push(fullPath);
          }
        });
        // Eliminamos posibles duplicados
        window.GYMImagenes = [...new Set(window.GYMImagenes)];
      }
    }
  } catch (e) {
    console.warn("No se pudo auto-detectar imágenes (requiere listado de directorio habilitado).");
  }
})();
