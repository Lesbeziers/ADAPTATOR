// ============================================================
// CANVAS.JS — Motor de renderizado, drag, flechas
// ============================================================

const Canvas = (() => {

  let canvasEl = null;
  let ctx = null;

  function init(el) {
    canvasEl = el;
    ctx = canvasEl.getContext('2d');
    _bindEvents();
    render();
  }

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    // TODO: dibujar capas en orden (State.layers)
  }

  function _bindEvents() {
    // TODO: drag de capa seleccionada
    // TODO: flechas del teclado para ajuste fino
  }

  return { init, render };
})();
