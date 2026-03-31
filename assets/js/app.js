// ============================================================
// APP.JS — Punto de entrada. Inicializa y conecta todo.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  Formats.init();
  Layers.init();
  Canvas.init();
  UI.init();
  SolidLayers.init();
  GradientLayers.init();
  Silhouette.init();
  TextLayers.init();
  Logos.init();
  Pastilla.init();
  Project.init();
  History.init();
  Export.init();

  // Bind botones de alineación
  document.querySelectorAll('.btn-align').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof Canvas !== 'undefined') Canvas.align(btn.dataset.align);
    });
  });

  console.log('Editor de Adaptaciones M+ — listo.');
});
