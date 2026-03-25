// ============================================================
// SYSTEM-LAYERS.JS — Capas de sistema (mockups, seguridad...)
// ============================================================

const SystemLayers = (() => {

  // Inicializa la visibilidad de un formato si no existe
  function _initVisibility(formatId) {
    if (State.systemVisibility[formatId]) return;
    const layers = State.systemLayers[formatId] || [];
    State.systemVisibility[formatId] = {};
    layers.forEach(l => {
      State.systemVisibility[formatId][l.key] = l.defaultVisible !== false;
    });
  }

  function getVisible(formatId, key) {
    _initVisibility(formatId);
    return State.systemVisibility[formatId][key] ?? true;
  }

  function setVisible(formatId, key, visible) {
    _initVisibility(formatId);
    const layers = State.systemLayers[formatId] || [];
    const layer  = layers.find(l => l.key === key);

    // Si tiene grupo exclusivo, desactivar los otros del mismo grupo
    if (visible && layer?.exclusive) {
      layers.forEach(l => {
        if (l.exclusive === layer.exclusive && l.key !== key) {
          State.systemVisibility[formatId][l.key] = false;
        }
      });
    }

    State.systemVisibility[formatId][key] = visible;
  }

  // Renderiza las capas de sistema dentro del lienzo
  let _lastRenderedFormat = null;

  function render(lienzo, scale, lienzoW, lienzoH) {
    if (!lienzo) return;

    const formatId = State.activeFormat;

    // Solo destruir y recrear si cambió el formato
    if (formatId === _lastRenderedFormat) return;
    _lastRenderedFormat = formatId;

    // Limpiar capas de sistema anteriores
    lienzo.querySelectorAll('.system-layer').forEach(el => el.remove());

    if (!formatId) return;

    const layers = State.systemLayers[formatId] || [];
    _initVisibility(formatId);

    // Separar capas: zBase (debajo de todo), zBottom (encima de importadas), resto (encima de todo)
    const base   = layers.filter(l => l.zBase);
    const bottom = layers.filter(l => l.zBottom && !l.zBase);
    const top    = layers.filter(l => !l.zBottom && !l.zBase);

    const baseZ    = 5000;
    const topZ     = 8000;

    [...base, ...bottom, ...top].forEach((layerDef, i) => {
      const isBase   = layerDef.zBase;
      const isBottom = layerDef.zBottom;
      const visible  = getVisible(formatId, layerDef.key);
      const zIdx     = isBase ? 0 : (isBottom ? baseZ + i : topZ + i);

      const el = document.createElement('img');
      el.className      = 'system-layer';
      el.src            = layerDef.src;
      el.alt            = layerDef.label;
      el.dataset.key    = layerDef.key;
      el.dataset.format = formatId;

      const size = State.formatSizes[formatId];
      const dc   = size?.displayContext;

      if (dc && layerDef.contentArea) {
        const left = (dc.contentX / dc.w * 100);
        const top_ = (dc.contentY / dc.h * 100);
        const w    = ((dc.contentW || size.w) / dc.w * 100);
        const h    = ((dc.contentH || size.h) / dc.h * 100);
        el.style.cssText = `
          position: absolute;
          left: ${left}%; top: ${top_}%;
          width: ${w}%; height: ${h}%;
          object-fit: fill;
          pointer-events: none;
          z-index: ${zIdx};
          display: ${visible ? 'block' : 'none'};
        `;
      } else if (dc && layerDef.contextPos) {
        const left = (layerDef.contextPos.x / dc.w * 100);
        const top_ = (layerDef.contextPos.y / dc.h * 100);
        el.style.cssText = `
          position: absolute;
          left: ${left}%; top: ${top_}%;
          pointer-events: none;
          z-index: ${zIdx};
          display: ${visible ? 'block' : 'none'};
        `;
        el.onload = () => {
          const natW = el.naturalWidth  || 100;
          const natH = el.naturalHeight || 100;
          el.style.width  = (natW / dc.w * 100) + '%';
          el.style.height = (natH / dc.h * 100) + '%';
        };
      } else {
        el.style.cssText = `
          position: absolute;
          left: 0; top: 0;
          width: 100%; height: 100%;
          object-fit: fill;
          pointer-events: none;
          z-index: ${zIdx};
          display: ${visible ? 'block' : 'none'};
        `;
      }

      lienzo.appendChild(el);
    });
  }

  // Forzar re-render de capas de sistema (llamar cuando cambie el formato)
  function invalidate() {
    _lastRenderedFormat = null;
  }

  // Actualiza visibilidad de una capa de sistema sin rerenderizar todo
function updateVisibility(lienzo, formatId, key, visible) {
    setVisible(formatId, key, visible);

    if (!lienzo) return;

    const layers = State.systemLayers[formatId] || [];
    layers.forEach(l => {
      const el = lienzo.querySelector(`.system-layer[data-key="${l.key}"][data-format="${formatId}"]`);
      if (el) el.style.display = getVisible(formatId, l.key) ? 'block' : 'none';
    });

    // Recalcular posición de COMPOSICIÓN TÍTULO si cambia overlay en MUX4 FONDO
    if (formatId === 'MUX4 FONDO' && typeof Canvas !== 'undefined') {
      Canvas.render();
    }
  }

  // Devuelve las capas de sistema del formato activo para el panel
  function getLayersForPanel(formatId) {
    _initVisibility(formatId);
    const layers = State.systemLayers[formatId] || [];
    return layers.map(l => ({
      ...l,
      visible: getVisible(formatId, l.key),
    }));
  }

  return { render, invalidate, updateVisibility, getLayersForPanel, getVisible, setVisible };
})();
