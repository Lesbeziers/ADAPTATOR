// ============================================================
// DEV-COORDS.JS — Chivato TEMPORAL de posición y escala
// ============================================================
// Caja flotante y arrastrable que muestra, en vivo, los valores de la capa
// seleccionada en el formato activo: escala, X, Y y tamaño natural.
//
// PARA QUÉ: sacar a mano los valores de colocación de la imagen máster en cada
// formato, para luego hardcodearlos en la automaquetación del rol nuevo.
//
// ─────────────────────────────────────────────────────────────
// ESTO ES CÓDIGO DE TALLER, NO DE PRODUCCIÓN.
// Para quitarlo: borra este fichero y su <script> en index.html. Nada más.
// No toca ui.js, canvas.js ni formats.js: se entera de los cambios sondeando
// el State cada 150 ms, precisamente para no dejar residuos en el código bueno.
// ─────────────────────────────────────────────────────────────
//
// Atajo: Ctrl + Shift + C  → muestra / oculta la caja.

const DevCoords = (() => {

  const POLL_MS = 150;
  let _box = null, _timer = null, _last = '';

  function init() {
    _injectStyles();
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        toggle();
      }
    });
    show(); // arranca visible: es una build de taller
  }

  // Los estilos los inyecta este mismo fichero en vez de vivir en panel.css,
  // para que borrar el fichero se lleve TODO por delante y no quede CSS huérfano.
  function _injectStyles() {
    if (document.getElementById('dev-coords-styles')) return;
    const s = document.createElement('style');
    s.id = 'dev-coords-styles';
    s.textContent = `
      #dev-coords {
        /* Por encima de TODO. La app tiene overlays a 99990 (velo del
           siluetado, inset:0), 99998, 99999 (el encuadre focal, a pantalla
           completa) y 999999 (menú de variante). A 99800 la caja quedaba
           tapada justo cuando más falta hace: al terminar de importar. */
        position: fixed; top: 64px; right: 18px; z-index: 2000000;
        width: 212px; background: #141414; border: 1px solid #3a3a3a;
        border-radius: 5px; box-shadow: 0 10px 30px rgba(0,0,0,.6);
        font-family: var(--font, sans-serif); color: #ccc; user-select: none;
      }
      #dev-coords-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 7px 9px; background: #1e1e1e; border-bottom: 1px solid #333;
        border-radius: 4px 4px 0 0; cursor: move;
        font-size: 9px; font-weight: 700; letter-spacing: .09em; color: var(--col-yellow, #f0a500);
      }
      #dev-coords-close {
        background: none; border: none; color: #777; font-size: 15px;
        line-height: 1; cursor: pointer; padding: 0;
      }
      #dev-coords-close:hover { color: #fff; }
      #dev-coords-body { padding: 8px 9px; }
      .dev-coords-row {
        display: flex; justify-content: space-between; align-items: baseline;
        gap: 8px; font-size: 10px; padding: 1px 0;
      }
      .dev-coords-row span { color: #6e6e6e; }
      .dev-coords-row b {
        color: #ccc; font-weight: 700; text-align: right;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 124px;
      }
      .dev-coords-row.big { font-size: 12px; padding: 2px 0; }
      .dev-coords-row.big b { color: var(--col-yellow, #f0a500); font-size: 13px; }
      .dev-coords-sep { height: 1px; background: #2e2e2e; margin: 7px 0; }
      .dev-coords-note { margin-top: 8px; font-size: 8px; line-height: 1.35; color: #5a5a5a; }
      .dev-coords-err { font-size: 10px; color: #6e6e6e; padding: 10px 0; text-align: center; }
      #dev-coords-copy {
        width: calc(100% - 18px); margin: 0 9px 9px; height: 24px;
        background: #242424; border: 1px solid var(--col-yellow, #f0a500);
        border-radius: 2px; color: var(--col-yellow, #f0a500);
        font-family: var(--font, sans-serif); font-size: 9px; font-weight: 700;
        letter-spacing: .08em; cursor: pointer;
      }
      #dev-coords-copy:hover { background: var(--col-yellow, #f0a500); color: #000; }
    `;
    document.head.appendChild(s);
  }

  function toggle() { _box ? hide() : show(); }

  function hide() {
    if (_timer) { clearInterval(_timer); _timer = null; }
    if (_box && _box.parentNode) _box.parentNode.removeChild(_box);
    _box = null;
  }

  function show() {
    if (_box) return;

    _box = document.createElement('div');
    _box.id = 'dev-coords';
    _box.innerHTML =
      '<div id="dev-coords-head">' +
        '<span>COORDENADAS <span style="opacity:.5">· taller</span></span>' +
        '<button id="dev-coords-close" title="Cerrar (Ctrl+Shift+C)">&times;</button>' +
      '</div>' +
      '<div id="dev-coords-body"></div>' +
      '<button id="dev-coords-copy">COPIAR LÍNEA</button>';

    document.body.appendChild(_box);
    _box.querySelector('#dev-coords-close').addEventListener('click', hide);
    _box.querySelector('#dev-coords-copy').addEventListener('click', _copy);
    _makeDraggable(_box, _box.querySelector('#dev-coords-head'));

    _refresh();
    _timer = setInterval(_refresh, POLL_MS);
  }

  // ── LECTURA DEL ESTADO ────────────────────────────────────

  function _read() {
    const fmt = State.activeFormat;
    const id  = State.selectedLayerId;
    if (!fmt) return { error: 'Sin formato activo' };
    if (!id)  return { error: 'Sin capa seleccionada', fmt };

    const layer = State.layers.find(l => l.id === id);
    if (!layer) return { error: 'Capa no encontrada', fmt };

    const p = (typeof Formats !== 'undefined' && Formats.getLayerParams)
      ? Formats.getLayerParams(fmt, id)
      : (State.formatParams?.[fmt]?.[id] || {});

    const size = State.formatSizes?.[fmt];
    return {
      fmt,
      layer:   layer.name || '(sin nombre)',
      scaleX:  Math.round((p.scaleX ?? 100) * 100) / 100,
      scaleY:  Math.round((p.scaleY ?? 100) * 100) / 100,
      x:       Math.round(p.x ?? 0),
      y:       Math.round(p.y ?? 0),
      rot:     Math.round((p.rotation ?? 0) * 100) / 100,
      natural: (layer.naturalWidth && layer.naturalHeight)
        ? layer.naturalWidth + '×' + layer.naturalHeight : '—',
      formato: size ? size.w + '×' + size.h : '—',
    };
  }

  // Línea lista para pegarme a mí en el chat.
  function _line(d) {
    const esc = (d.scaleX === d.scaleY)
      ? 'escala ' + d.scaleX + '%'
      : 'escalaX ' + d.scaleX + '% / escalaY ' + d.scaleY + '%';
    return d.fmt + ' → ' + esc + ', x ' + d.x + ', y ' + d.y +
           (d.rot ? ', giro ' + d.rot + '°' : '') +
           '   [capa "' + d.layer + '" ' + d.natural + ']';
  }

  function _refresh() {
    if (!_box) return;
    // Autocuración: si algo saca la caja del DOM (un modal que limpia, un
    // re-render), se vuelve a enganchar en el siguiente sondeo en vez de
    // desaparecer para siempre.
    if (!_box.isConnected) document.body.appendChild(_box);
    const body = _box.querySelector('#dev-coords-body');
    const d = _read();

    if (d.error) {
      body.innerHTML = '<div class="dev-coords-err">' + d.error + '</div>';
      _last = '';
      return;
    }

    const html =
      '<div class="dev-coords-row"><span>Formato</span><b>' + d.fmt + '</b></div>' +
      '<div class="dev-coords-row"><span>Lienzo</span><b>' + d.formato + '</b></div>' +
      '<div class="dev-coords-row"><span>Capa</span><b>' + d.layer + '</b></div>' +
      '<div class="dev-coords-row"><span>Natural</span><b>' + d.natural + '</b></div>' +
      '<div class="dev-coords-sep"></div>' +
      '<div class="dev-coords-row big"><span>Escala X</span><b>' + d.scaleX + '%</b></div>' +
      '<div class="dev-coords-row big"><span>Escala Y</span><b>' + d.scaleY + '%</b></div>' +
      '<div class="dev-coords-row big"><span>Pos X</span><b>' + d.x + '</b></div>' +
      '<div class="dev-coords-row big"><span>Pos Y</span><b>' + d.y + '</b></div>' +
      (d.rot ? '<div class="dev-coords-row big"><span>Giro</span><b>' + d.rot + '°</b></div>' : '') +
      '<div class="dev-coords-note">x/y = desplazamiento desde el CENTRO del formato</div>';

    if (html !== _last) { body.innerHTML = html; _last = html; }
  }

  // Devuelve la línea del estado actual (o null si no hay nada que leer).
  // Pública para poder sacarla por consola si el portapapeles falla.
  function line() {
    const d = _read();
    return d.error ? null : _line(d);
  }

  function _copy() {
    const d = _read();
    if (d.error) return;
    const txt = _line(d);
    // Siempre a consola además del portapapeles: si el navegador bloquea el
    // copiado (pestaña sin foco, permisos), el valor no se pierde.
    console.log('[Coordenadas] ' + txt);
    const btn = _box.querySelector('#dev-coords-copy');
    const ok = () => { btn.textContent = 'COPIADO ✓'; setTimeout(() => btn.textContent = 'COPIAR LÍNEA', 1200); };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).then(ok, () => _fallbackCopy(txt, ok));
    } else _fallbackCopy(txt, ok);
  }

  function _fallbackCopy(txt, ok) {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) { console.log('[DevCoords]', txt); }
    document.body.removeChild(ta);
  }

  // ── ARRASTRE ──────────────────────────────────────────────

  function _makeDraggable(el, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    handle.addEventListener('mousedown', e => {
      if (e.target.id === 'dev-coords-close') return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect();
      ox = r.left; oy = r.top;
      el.style.right = 'auto'; el.style.bottom = 'auto';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      el.style.left = Math.max(0, ox + e.clientX - sx) + 'px';
      el.style.top  = Math.max(0, oy + e.clientY - sy) + 'px';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }

  // Se arranca solo: así no hay que tocar app.js y quitarlo es borrar este
  // fichero y su <script> de index.html, nada más.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init, show, hide, toggle, line };
})();
