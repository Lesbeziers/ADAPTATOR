// ============================================================
// LAYERS.JS — Gestión del panel de capas
// Añadir, eliminar, reordenar, visibilidad
// ============================================================

const Layers = (() => {

  function addImageLayer() {
    // TODO: abrir selector de archivo y crear capa imagen
  }

  function removeLayer(id) {
    // TODO: eliminar capa por id
  }

  function toggleVisibility(id) {
    // TODO: alternar visible/oculto de una capa
  }

  function selectLayer(id) {
    State.selectedLayerId = id;
    UI.updateSliders();
    // TODO: resaltar en panel y canvas
  }

  function renderPanel() {
    // TODO: dibujar lista de capas en el panel izquierdo
  }

  return { addImageLayer, removeLayer, toggleVisibility, selectLayer, renderPanel };
})();
