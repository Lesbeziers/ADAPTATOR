// ============================================================
// EXPORT.JS — Exportar imágenes (render offscreen por formato)
// ============================================================

const Export = (() => {

  function exportAll() {
    const okFormats = State.formats.filter(f => f.ok);
    if (okFormats.length === 0) {
      alert('No hay formatos marcados como OK para exportar.');
      return;
    }
    okFormats.forEach(fmt => _exportFormat(fmt));
  }

  function _exportFormat(fmt) {
    // TODO: render offscreen en canvas con las dimensiones del formato
    // TODO: aplicar params de cada capa para ese formato
    // TODO: descargar como PNG con nombre del formato
    console.log('Exportando:', fmt.id);
  }

  return { exportAll };
})();
