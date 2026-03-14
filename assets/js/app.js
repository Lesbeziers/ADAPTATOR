// ============================================================
// APP.JS — Punto de entrada. Inicializa y conecta todo.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  Formats.init();
  Layers.init();
  Canvas.init();
  UI.init();
  console.log('Editor de Adaptaciones M+ — listo.');
});
