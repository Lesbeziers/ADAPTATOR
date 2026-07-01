// ============================================================
// FOCAL-FRAMES.JS — Encuadre focal del sujeto por banda de proporción
// ============================================================
//
// El usuario define UNA vez por banda de proporción (4 bandas) qué región de
// la imagen-sujeto es la importante, reutilizando el viewport y los gestos de
// mover/escalar. Se guarda como un rectángulo focal normalizado (0–1) sobre la
// imagen origen, en State.focalFrames[layerId][band]. Cada formato deriva su
// colocación inicial por cover-fit del rect de su banda (ver auto-layout.js
// _applySubjectFocal). Feature aditiva: sin rect → colocación genérica.
//
// PERFIL queda EXCLUIDO (se autocoloca con MediaPipe, se trabajará aparte).

const FocalFrames = (() => {

  // ── BANDAS ────────────────────────────────────────────────
  // Orden de pestañas en la UI. SQUARE no existe como banda editable: su único
  // formato (PERFIL) se trabaja aparte, así que cae a fallback genérico.
  const BANDS = ['VERTICAL', '16:9', 'PANO', 'ULTRA'];

  // Proporción de referencia (w/h) del marco que el usuario encuadra por banda.
  // Es el AR representativo de la banda; cada formato concreto re-deriva su
  // colocación por cover-fit, así que un AR de formato algo distinto se absorbe.
  const BAND_REP_AR = {
    'VERTICAL': 9 / 16,   // 0.5625
    '16:9':     16 / 9,   // 1.7778
    'PANO':     3 / 1,    // 3.0
    'ULTRA':    5 / 1,    // 5.0
  };

  // Etiqueta visible por banda
  const BAND_LABEL = {
    'VERTICAL': 'VERTICAL · 9:16',
    '16:9':     'HORIZONTAL · 16:9',
    'PANO':     'PANORÁMICO · 3:1',
    'ULTRA':    'TIRA ULTRA · 5:1',
  };

  // Alto de trabajo del marco fantasma en px (el ancho sale del AR de la banda)
  const FRAME_H = 900;

  // ── CLASIFICACIÓN: FORMATO → BANDA ────────────────────────
  // Usa la proporción del área VISIBLE real (maskRect / safeArea /
  // displayContext.contentW-H), no el lienzo bruto. Devuelve null cuando el
  // formato no entra en ninguna banda editable (square / PERFIL) → el motor
  // hace fallback a la colocación genérica.
  function bandForFormat(fid) {
    const s = State.formatSizes?.[fid];
    if (!s) return null;

    let w, h;
    if (s.maskCircle) {
      return null;                                  // PERFIL → fuera de esta feature
    } else if (s.maskRect) {
      w = s.maskRect.w; h = s.maskRect.h;           // SIL → ventana visible
    } else if (s.safeArea) {
      w = s.safeArea.w; h = s.safeArea.h;           // IPLUS → zona de seguridad
    } else if (s.displayContext) {
      const dc = s.displayContext;                  // WEB / AMAZON / AD PAUSE
      w = dc.contentW || s.w;
      h = dc.contentH || s.h;
    } else {
      w = s.w; h = s.h;
    }
    if (!(w > 0) || !(h > 0)) return null;

    const ar = w / h;
    if (ar < 0.85) return 'VERTICAL';
    if (ar < 1.2)  return null;                     // square → fallback genérico
    if (ar < 2.2)  return '16:9';
    if (ar < 3.9)  return 'PANO';
    return 'ULTRA';
  }

  // ── ACCESO A FRAMES ───────────────────────────────────────
  function getFrame(layerId, band) {
    return State.focalFrames?.[layerId]?.[band] || null;
  }
  function hasAnyFrame(layerId) {
    const m = State.focalFrames?.[layerId];
    return !!m && BANDS.some(b => m[b]);
  }
  function setFrame(layerId, band, fr) {
    if (!State.focalFrames) State.focalFrames = {};
    if (!State.focalFrames[layerId]) State.focalFrames[layerId] = {};
    State.focalFrames[layerId][band] = fr;
    State.dirty = true;
  }

  // ── CONVERSIÓN VIEWPORT ↔ RECTÁNGULO FOCAL ────────────────
  const _clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Params del marco fantasma {x,y,scaleX=scaleY=s%} → rect focal normalizado.
  // El marco FW×FH es la "cámara": lo que asoma por él es el rect focal,
  // expresado en coords normalizadas de la imagen (nw×nh natural).
  function paramsToRect(nw, nh, FW, FH, x, y, s) {
    const drawW = nw * s / 100;
    const drawH = nh * s / 100;
    if (!(drawW > 0) || !(drawH > 0)) return { x: 0, y: 0, w: 1, h: 1 };
    const imgLeft = (FW / 2 + x) - drawW / 2;
    const imgTop  = (FH / 2 + y) - drawH / 2;
    let rx = (0 - imgLeft) / drawW;
    let ry = (0 - imgTop)  / drawH;
    let rw = FW / drawW;
    let rh = FH / drawH;
    rx = _clamp(rx, 0, 1);
    ry = _clamp(ry, 0, 1);
    rw = _clamp(rw, 0.01, 1 - rx);
    rh = _clamp(rh, 0.01, 1 - ry);
    return { x: rx, y: ry, w: rw, h: rh };
  }

  // Rect focal → params del marco fantasma (cover: el rect llena el marco).
  // Inverso de paramsToRect; usado para sembrar el viewport con un rect guardado.
  function rectToParams(nw, nh, FW, FH, fr) {
    const sCover = Math.max(FW / (nw * fr.w), FH / (nh * fr.h));
    const s = sCover * 100;
    const drawW = nw * sCover;
    const drawH = nh * sCover;
    const x = drawW / 2 - (fr.x + fr.w / 2) * drawW;
    const y = drawH / 2 - (fr.y + fr.h / 2) * drawH;
    return { x: Math.round(x), y: Math.round(y), scaleX: Math.round(s * 10) / 10, scaleY: Math.round(s * 10) / 10, rotation: 0 };
  }

  // Tamaño en px del marco fantasma para una banda
  function frameSize(band) {
    const ar = BAND_REP_AR[band] || 1;
    return { w: Math.round(FRAME_H * ar), h: FRAME_H };
  }

  // ── SESIÓN DE ENCUADRE (viewport fantasma) ────────────────
  const SYNTH = '__FOCAL__';
  let _active     = false;
  let _layerId    = null;
  let _onDone     = null;
  let _currentBand = BANDS[0];
  let _prev = null;           // contexto a restaurar al cerrar
  let _bar  = null;           // overlay DOM
  let _tabBtns = {};
  let _doneBtn = null;
  let _hintEl  = null;
  let _visited = new Set();   // bandas que el usuario ya ha visitado (= cortes definidos)
  let _backdrop = null;       // velo semitransparente que bloquea el resto de la UI
  let _savedLienzoZ = '';     // z-index previo del lienzo (para restaurar)

  function isActive() { return _active; }

  // Entra en una banda: dimensiona el marco fantasma, siembra los params del
  // sujeto (cover-fit del rect guardado o de la imagen entera) y renderiza.
  function _enterBand(band) {
    const layer = State.layers.find(l => l.id === _layerId);
    if (!layer) return;
    const nw = layer.naturalWidth  || 200;
    const nh = layer.naturalHeight || 200;
    const fs = frameSize(band);

    State.formatSizes[SYNTH] = { w: fs.w, h: fs.h };
    State.activeFormat = SYNTH;

    const rect = getFrame(_layerId, band) || { x: 0, y: 0, w: 1, h: 1 };
    const p = rectToParams(nw, nh, fs.w, fs.h, rect);
    if (!State.formatParams[SYNTH]) State.formatParams[SYNTH] = {};
    State.formatParams[SYNTH][_layerId] = { ...p };

    State.selectedLayerId  = _layerId;
    State.selectedLayerIds = [_layerId];

    _visited.add(band);
    _refreshTabs();
    _refreshDone();
    if (typeof Canvas !== 'undefined') Canvas.render();
  }

  // Confirma la banda actual: lee los params del marco y guarda el rect focal.
  function _commitBand(band) {
    const layer = State.layers.find(l => l.id === _layerId);
    const p = State.formatParams?.[SYNTH]?.[_layerId];
    if (!layer || !p) return;
    const nw = layer.naturalWidth  || 200;
    const nh = layer.naturalHeight || 200;
    const fs = frameSize(band);
    const fr = paramsToRect(nw, nh, fs.w, fs.h, p.x ?? 0, p.y ?? 0, p.scaleX ?? 100);
    setFrame(_layerId, band, fr);
  }

  function setBand(band) {
    if (!_active || band === _currentBand || !BANDS.includes(band)) return;
    _commitBand(_currentBand);
    _currentBand = band;
    _enterBand(band);
  }

  // ── UI: barra de pestañas ─────────────────────────────────
  function _buildOverlay() {
    const bar = document.createElement('div');
    bar.id = 'focal-overlay';
    bar.style.cssText = [
      'position:fixed', 'top:14px', 'left:50%', 'transform:translateX(-50%)',
      'z-index:99999', 'display:flex', 'flex-direction:column', 'gap:10px',
      'align-items:stretch', 'background:#1a1a1a', 'border:1px solid #333',
      'border-radius:12px', 'padding:12px 16px', 'box-shadow:0 10px 36px rgba(0,0,0,.55)',
      'font-family:inherit', 'color:#eee', 'min-width:520px',
    ].join(';');

    const title = document.createElement('div');
    title.style.cssText = 'display:flex;align-items:baseline;gap:10px;justify-content:space-between;';
    const h = document.createElement('div');
    h.textContent = 'Encuadre del sujeto';
    h.style.cssText = 'font-weight:700;font-size:14px;letter-spacing:.02em;';
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:#9a9a9a;';
    title.appendChild(h); title.appendChild(hint);
    _hintEl = hint;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const tabs = document.createElement('div');
    tabs.style.cssText = 'display:flex;gap:6px;flex:1;';
    _tabBtns = {};
    BANDS.forEach(band => {
      const b = document.createElement('button');
      b.textContent = BAND_LABEL[band] || band;
      b.dataset.band = band;
      b.style.cssText = [
        'flex:1', 'padding:8px 10px', 'border-radius:7px', 'cursor:pointer',
        'border:1px solid #3a3a3a', 'background:#262626', 'color:#ddd',
        'font-size:11px', 'font-weight:600', 'letter-spacing:.03em', 'white-space:nowrap',
      ].join(';');
      b.addEventListener('click', () => setBand(band));
      tabs.appendChild(b);
      _tabBtns[band] = b;
    });

    const done = document.createElement('button');
    done.textContent = 'Hecho ✓';
    done.style.cssText = [
      'padding:8px 16px', 'border-radius:7px', 'border:none',
      'font-weight:800', 'font-size:12px', 'letter-spacing:.03em',
    ].join(';');
    // Solo cierra si los 4 cortes están definidos (guard además del estado visual).
    done.addEventListener('click', () => {
      if (_visited.size < BANDS.length) return;
      close();
    });
    _doneBtn = done;

    row.appendChild(tabs);
    row.appendChild(done);
    bar.appendChild(title);
    bar.appendChild(row);
    document.body.appendChild(bar);
    _bar = bar;
  }

  function _refreshTabs() {
    BANDS.forEach(band => {
      const b = _tabBtns[band];
      if (!b) return;
      const on   = band === _currentBand;
      const seen = _visited.has(band);
      const base = BAND_LABEL[band] || band;
      // ✓ en las visitadas (no activas) para ver de un vistazo qué falta.
      b.textContent = (seen && !on) ? base + ' ✓' : base;
      // El AMARILLO se reserva EXCLUSIVAMENTE al botón "Hecho". El tab activo
      // usa un gris destacado, distinto del resto, para no competir con él.
      if (on) {
        b.style.background  = '#565656';   // activo: gris claro destacado
        b.style.color       = '#ffffff';
        b.style.borderColor = '#767676';
      } else if (seen) {
        b.style.background  = '#2b2b2b';   // visitada
        b.style.color       = '#dddddd';
        b.style.borderColor = '#4a4a4a';
      } else {
        b.style.background  = '#262626';   // pendiente
        b.style.color       = '#888888';
        b.style.borderColor = '#333333';
      }
    });
  }

  // ── VELO DE BLOQUEO ───────────────────────────────────────
  // Mientras se encuadra, un velo semitransparente cubre toda la app y captura
  // los clicks (impide añadir capas, cambiar modalidad, marcar OK…). Solo el
  // #lienzo se eleva por encima del velo para seguir siendo interactivo, ya que
  // es donde viven la capa-sujeto y los manejadores de escala. El resto del
  // #canvas-area (reglas, botones OK/mockup) queda bajo el velo → bloqueado.
  function _showBackdrop() {
    if (_backdrop) return;
    const bd = document.createElement('div');
    bd.id = 'focal-backdrop';
    bd.style.cssText = 'position:fixed;inset:0;background:rgba(8,8,8,0.58);z-index:90000;';
    document.body.appendChild(bd);
    _backdrop = bd;
    const lz = document.getElementById('lienzo');
    if (lz) { _savedLienzoZ = lz.style.zIndex; lz.style.zIndex = '90001'; }
  }
  function _hideBackdrop() {
    if (_backdrop && _backdrop.parentNode) _backdrop.parentNode.removeChild(_backdrop);
    _backdrop = null;
    const lz = document.getElementById('lienzo');
    if (lz) lz.style.zIndex = _savedLienzoZ || '';
  }

  // Habilita "Hecho" solo cuando las 4 bandas han sido definidas (visitadas).
  function _refreshDone() {
    const total = BANDS.length;
    const n = _visited.size;
    const ready = n >= total;
    if (_hintEl) {
      _hintEl.textContent = ready
        ? 'Listo: 4/4 proporciones definidas.'
        : `Pasa por las ${total} proporciones para terminar (${n}/${total}).`;
    }
    if (!_doneBtn) return;
    _doneBtn.style.background    = ready ? '#f0a500' : '#3a3a3a';
    _doneBtn.style.color         = ready ? '#1a1a1a' : '#777';
    _doneBtn.style.cursor        = ready ? 'pointer' : 'not-allowed';
    _doneBtn.style.pointerEvents = ready ? 'auto' : 'none';
    _doneBtn.style.opacity       = ready ? '1' : '0.55';
    _doneBtn.textContent         = ready ? 'Hecho ✓' : `Hecho (${n}/${total})`;
  }

  // ── ABRIR / CERRAR ────────────────────────────────────────
  // open(layerId, onDone): abre el encuadre del sujeto. Al pulsar "Hecho"
  // ejecuta onDone() (típicamente la maquetación a todos los formatos).
  function open(layerId, onDone) {
    const layer = State.layers.find(l => l.id === layerId);
    // Sin dimensiones naturales (p. ej. SVG sin medir) no podemos encuadrar.
    if (!layer || !(layer.naturalWidth > 0) || !(layer.naturalHeight > 0)) {
      if (typeof onDone === 'function') onDone();
      return;
    }

    _active   = true;
    _layerId  = layerId;
    _onDone   = onDone;
    _currentBand = BANDS[0];
    _visited  = new Set();
    _prev = {
      activeFormat:     State.activeFormat,
      selectedLayerId:  State.selectedLayerId,
      selectedLayerIds: [...(State.selectedLayerIds || [])],
    };

    if (typeof History !== 'undefined') { History.push(); History.suspend(); }
    if (typeof Canvas !== 'undefined') Canvas.setFraming(true, layerId);

    _showBackdrop();   // bloquear el resto de la UI mientras se encuadra
    _buildOverlay();
    _enterBand(_currentBand);
  }

  function close() {
    if (!_active) return;
    _commitBand(_currentBand);

    // Quitar overlay y velo de bloqueo
    if (_bar && _bar.parentNode) _bar.parentNode.removeChild(_bar);
    _bar = null; _tabBtns = {};
    _hideBackdrop();

    // Limpiar formato fantasma (no debe persistir ni renderizar)
    delete State.formatSizes[SYNTH];
    if (State.formatParams[SYNTH]) delete State.formatParams[SYNTH];

    if (typeof Canvas !== 'undefined') Canvas.setFraming(false);

    // Restaurar contexto previo
    State.activeFormat     = _prev?.activeFormat ?? null;
    State.selectedLayerId  = _prev?.selectedLayerId ?? null;
    State.selectedLayerIds = _prev?.selectedLayerIds ?? [];

    if (typeof History !== 'undefined') History.resume();

    _active = false;
    const cb = _onDone; _onDone = null; _layerId = null; _prev = null;
    if (typeof cb === 'function') cb();
  }

  // ── API PÚBLICA ───────────────────────────────────────────
  return {
    BANDS, BAND_REP_AR, BAND_LABEL, FRAME_H,
    bandForFormat, getFrame, hasAnyFrame, setFrame,
    paramsToRect, rectToParams, frameSize,
    open, close, setBand, isActive,
  };
})();
