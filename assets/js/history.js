// ============================================================
// HISTORY.JS — Sistema de Undo / Redo (Ctrl+Z / Ctrl+Shift+Z)
// ============================================================

const History = (() => {

  const MAX_STEPS = 50;

  let _undoStack = [];
  let _redoStack = [];
  let _paused    = false;

  // ── SNAPSHOT ──────────────────────────────────────────────

  function _snapshot() {
    return {
      layers: State.layers.map(l => {
        const c = { ...l };
        if (l.params)          c.params          = { ...l.params };
        if (l.solidParams)     c.solidParams     = { ...l.solidParams };
        if (l.textParams)      c.textParams      = { ...l.textParams };
        if (l.gradientParams)  c.gradientParams  = { ...l.gradientParams };
        return c;
      }),
      formatParams:     JSON.parse(JSON.stringify(State.formatParams)),
      formatOk:         { ...State.formatOk },
      selectedLayerId:  State.selectedLayerId,
      selectedLayerIds: [...State.selectedLayerIds],
    };
  }

  // ── RESTORE ───────────────────────────────────────────────

  function _restore(snap) {
    _paused = true;

    State.layers           = snap.layers;
    State.formatParams     = snap.formatParams;
    State.formatOk         = snap.formatOk;
    State.selectedLayerId  = snap.selectedLayerId;
    State.selectedLayerIds = [...snap.selectedLayerIds];
    State.dirty            = true;

    if (typeof Formats !== 'undefined') Formats.refreshGrid();
    if (typeof Layers  !== 'undefined') Layers.render();
    if (typeof Canvas  !== 'undefined') Canvas.render();
    if (typeof UI      !== 'undefined') UI.updateSliders();

    _paused = false;
  }

  // ── PUSH ──────────────────────────────────────────────────
  // Guarda snapshot del estado actual antes de una acción.

  function push() {
    if (_paused) return;
    _undoStack.push(_snapshot());
    if (_undoStack.length > MAX_STEPS) _undoStack.shift();
    _redoStack = [];
  }

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

  return { init, push, undo, redo };
})();
