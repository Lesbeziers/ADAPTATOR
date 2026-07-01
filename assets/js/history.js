// ============================================================
// HISTORY.JS — Sistema de Undo / Redo (Ctrl+Z / Ctrl+Shift+Z)
// ============================================================

const History = (() => {

  const MAX_STEPS = 50;

  let _undoStack = [];
  let _redoStack = [];
  let _paused    = false;

  // ── DEEP CLONE ────────────────────────────────────────────
  // structuredClone es nativo en navegadores modernos y maneja arrays
  // anidados (colorStops, runs, lines…) sin perderlos. Fallback a JSON
  // para entornos antiguos.

  const _clone = (typeof structuredClone === 'function')
    ? (o) => structuredClone(o)
    : (o) => JSON.parse(JSON.stringify(o));

  function _cloneLayer(l) {
    // Shallow para los primitivos / strings (incluido `src` que puede ser
    // un dataURL grande — no merece la pena duplicarlo en memoria).
    const c = { ...l };
    // Subobjetos potencialmente con arrays anidados → deep clone.
    if (l.params)         c.params         = _clone(l.params);
    if (l.solidParams)    c.solidParams    = _clone(l.solidParams);
    if (l.textParams)     c.textParams     = _clone(l.textParams);
    if (l.gradientParams) c.gradientParams = _clone(l.gradientParams);
    return c;
  }

  // ── SNAPSHOT ──────────────────────────────────────────────

  function _snapshot() {
    return {
      layers:                  State.layers.map(_cloneLayer),
      formatParams:            _clone(State.formatParams || {}),
      formatOk:                { ...(State.formatOk || {}) },
      formatMaskEnabled:       _clone(State.formatMaskEnabled || {}),
      systemVisibility:        _clone(State.systemVisibility || {}),
      layerRoles:              { ...(State.layerRoles || {}) },
      focalFrames:             _clone(State.focalFrames || {}),
      overlays:                State.overlays ? { ...State.overlays } : null,
      pastillaConfig:          State.pastillaConfig         ? _clone(State.pastillaConfig)         : null,
      pastillaFreemiumConfig:  State.pastillaFreemiumConfig ? _clone(State.pastillaFreemiumConfig) : null,
      layoutConfig:            State.layoutConfig           ? _clone(State.layoutConfig)           : null,
      selectedLayerId:         State.selectedLayerId,
      selectedLayerIds:        [...(State.selectedLayerIds || [])],
    };
  }

  // ── RESTORE ───────────────────────────────────────────────

  function _restore(snap) {
    _paused = true;
    try {
      // Re-clonamos al restaurar para que mutaciones posteriores sobre
      // State no contaminen el propio snap (que sigue en el otro stack).
      State.layers           = snap.layers.map(_cloneLayer);
      State.formatParams     = _clone(snap.formatParams || {});
      State.formatOk         = { ...(snap.formatOk || {}) };
      State.formatMaskEnabled= _clone(snap.formatMaskEnabled || {});
      State.systemVisibility = _clone(snap.systemVisibility || {});
      State.layerRoles       = { ...(snap.layerRoles || {}) };
      State.focalFrames      = _clone(snap.focalFrames || {});
      if (snap.overlays) State.overlays = { ...snap.overlays };
      if (snap.pastillaConfig)         State.pastillaConfig         = _clone(snap.pastillaConfig);
      if (snap.pastillaFreemiumConfig) State.pastillaFreemiumConfig = _clone(snap.pastillaFreemiumConfig);
      if (snap.layoutConfig)           State.layoutConfig           = _clone(snap.layoutConfig);
      State.selectedLayerId  = snap.selectedLayerId;
      State.selectedLayerIds = [...(snap.selectedLayerIds || [])];
      State.dirty            = true;

      // Invalidar cachés que dependen del state restaurado
      if (typeof SystemLayers !== 'undefined' && typeof SystemLayers.invalidate === 'function') {
        SystemLayers.invalidate();
      }

      if (typeof Formats !== 'undefined') Formats.refreshGrid();
      if (typeof Layers  !== 'undefined') Layers.render();
      if (typeof Canvas  !== 'undefined') Canvas.render();
      if (typeof UI      !== 'undefined') UI.updateSliders();
    } catch (err) {
      // Si algo falla no podemos dejar _paused colgado — bloquearía el historial entero.
      console.error('[History] Error al restaurar snapshot:', err);
    } finally {
      _paused = false;
    }
  }

  // ── PUSH ──────────────────────────────────────────────────
  // Guarda snapshot del estado actual antes de una acción.

  function push() {
    if (_paused) return;
    _undoStack.push(_snapshot());
    if (_undoStack.length > MAX_STEPS) _undoStack.shift();
    _redoStack = [];
  }

  // ── SUSPEND / RESUME ──────────────────────────────────────
  // Silencia los push() durante una operación compuesta (p. ej. la sesión de
  // encuadre focal), para que el conjunto cuente como un único paso de undo.
  // El push de frontera debe hacerse ANTES de suspender.
  function suspend() { _paused = true; }
  function resume()  { _paused = false; }

  // ── UNDO / REDO ───────────────────────────────────────────

  function undo() {
    if (_undoStack.length === 0) return;
    _redoStack.push(_snapshot());
    _restore(_undoStack.pop());
  }

  function redo() {
    if (_redoStack.length === 0) return;
    _undoStack.push(_snapshot());
    _restore(_redoStack.pop());
  }

  // ── INIT ──────────────────────────────────────────────────

  function init() {
    document.addEventListener('keydown', e => {
      // Ignorar si el foco está en un input editable
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    });
  }

  return { init, push, undo, redo, suspend, resume };
})();
