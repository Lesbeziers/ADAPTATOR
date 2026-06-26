// ============================================================
// EXPORT.JS — Exportar imágenes en ZIP (render offscreen por formato)
// ============================================================

const Export = (() => {

  // ── CONFIGURACIÓN DE FORMATOS ─────────────────────────────

  const FORMAT_CONFIG = {
    '199 PUBLI':          { suffix: '199_PUBLI',                    type: 'jpg', maxMB: 4     },
    'AD PAUSE':           { suffix: 'AD_PAUSE',                     type: 'jpg', maxMB: 0.1   },
    'APPLE TV':           { suffix: 'APPLETV',                      type: 'jpg', maxMB: 1     },
    'FANART DEST.':       { suffix: 'FANART_DESTACADO',             type: 'jpg', maxMB: 1.5   },
    'IPLUS PUBLI':        { suffix: 'IPLUS_PUBLI',                  type: 'jpg', maxMB: 0.15  },
    'MOD DEST 1':         { suffix: 'MOD_DESTACADO1',               type: 'jpg', maxMB: 1     },
    'MOD DEST 1 SIL':     { suffix: 'MOD_DESTACADO1_SIL',           type: 'png', maxMB: 1     },
    'MOD DEST 2':         { suffix: 'MOD_DESTACADOS2',              type: 'jpg', maxMB: 1     },
    'MOD DEST 2 SIL':     { suffix: 'MOD_DESTACADOS2_SIL',          type: 'png', maxMB: 1     },
    'MOD DEST 3':         { suffix: 'MOD_DESTACADO3',               type: 'jpg', maxMB: 1     },
    'MOD DEST 3 SIL':     { suffix: 'MOD_DESTACADO3_SIL',           type: 'png', maxMB: 1     },
    'MUX4 FONDO':         { suffix: 'MUX4_FONDO_PUBLI',             type: 'jpg', maxMB: 1.5   },
    'MUX4 TXT':           { suffix: 'MUX4_TXT_PUBLI',               type: 'png', maxMB: 0.6   },
    'MOVIL MUX FONDO':    { suffix: 'SMARTPHONE_MUX_FONDO_PUBLI',   type: 'jpg', maxMB: 1.5   },
    'MOVIL TXT':          { suffix: 'SMARTPHONE_MUX_TXT_PUBLI',     type: 'png', maxMB: 0.6   },
    'TEXTO HORIZONTAL':   { suffix: 'TEXTO_HORIZONTAL',             type: 'png', maxMB: 0.6   },
    'TEXTO VERTICAL':     { suffix: 'TEXTO_VERTICAL',               type: 'png', maxMB: 0.6   },
    'WEB PUBLI':          { suffix: 'WEB_PUBLI',                    type: 'jpg', maxMB: 1     },
    'WOW PUBLI':          { suffix: 'WOW_PUBLI',                    type: 'jpg', maxMB: 0.25  },
    'TÍTULO FICHA':       { suffix: 'TITULO_FICHA',                 type: 'png', maxMB: 0.6   },
    'CARÁTULA H':         { suffix: 'CARATULA_H',                   type: 'jpg', maxMB: 100   },
    'CARÁTULA V':         { suffix: 'CARATULA_V',                   type: 'jpg', maxMB: 100   },
    'CARTEL COM. H':      { suffix: 'CC_H',                         type: 'jpg', maxMB: 100,   dpi: 300 },
    'CARTEL COM. V':      { suffix: 'CC_V',                         type: 'jpg', maxMB: 100,   dpi: 300 },
    'FANART':             { suffix: 'FANART',                       type: 'jpg', maxMB: 3     },
    'FANART MÓVIL':       { suffix: 'FANART_MOVIL',                 type: 'jpg', maxMB: 3     },
    'DEST. DOBLE 1':      { suffix: 'MOD_DESTACADO_DOBLE1',         type: 'jpg', maxMB: 0.6   },
    'DEST. DOBLE 1 SIL':  { suffix: 'MOD_DESTACADO_DOBLE1_SIL',     type: 'png', maxMB: 1     },
    'DEST. DOBLE 2':      { suffix: 'MOD_DESTACADO_DOBLE2',         type: 'jpg', maxMB: 1     },
    'DEST. DOBLE 2 SIL':  { suffix: 'MOD_DESTACADO_DOBLE2_SIL',     type: 'png', maxMB: 1     },
    'DEST. DOBLE 4':      { suffix: 'MOD_DESTACADO_DOBLE4',         type: 'jpg', maxMB: 1     },
    'DEST. DOBLE 4 SIL':  { suffix: 'MOD_DESTACADO_DOBLE4_SIL',     type: 'png', maxMB: 1     },
    'MOD N':              { suffix: 'MODULO_N',                     type: 'jpg', maxMB: 0.6   },
    'FANART MOD N':       { suffix: 'FANART_COLECCION',             type: 'jpg', maxMB: 10    },
    'MOD N SIL':          { suffix: 'MOD_N_SIL',                    type: 'png', maxMB: 0.6   },
    'AMAZON BG':          { suffix: 'AMAZON_BG',                    type: 'jpg', maxMB: 0.45  },
    'AMAZON LOGO':        { suffix: 'AMAZON_LOGO',                  type: 'png', maxMB: 0.45  },
    'PERFIL':             { suffix: 'PERFIL',                       type: 'png', maxMB: 10    },
    'SONY':               { suffix: 'SONY',                         type: 'png', maxMB: 10    },
    'XIAOMI BANNER':      { suffix: 'XIAOMI_BANNER_MES',            type: 'jpg', maxMB: 10    },
  };

  // Formatos con capa de sistema 'mockup' real (no zona de seguridad).
  // Habilitan el botón "GENERAR MOCKUP" en el viewport.
  const MOCKUP_FORMATS = [
    'FANART DEST.',
    'MUX4 FONDO',
    'MOVIL MUX FONDO',
    'WEB PUBLI',
    'FANART MÓVIL',
    'AMAZON BG',
  ];

  function isMockupFormat(formatName) {
    return MOCKUP_FORMATS.includes(formatName);
  }

  // ── INIT ──────────────────────────────────────────────────

  function init() {
    document.getElementById('btn-exportar')
      ?.addEventListener('click', _showExportModal);
  }

  // ── MODAL ─────────────────────────────────────────────────

  function _showExportModal() {
    const okFormats = Object.keys(State.formatOk || {}).filter(f => State.formatOk[f]);
    if (okFormats.length === 0) {
      alert('No hay formatos marcados como OK para exportar.');
      return;
    }

    document.getElementById('export-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'export-modal';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.75);
      z-index:99000;display:flex;align-items:center;justify-content:center;
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.style.cssText = `
      background:#161616;border:1px solid #2e2e2e;border-radius:4px;
      width:380px;padding:0;overflow:hidden;
      box-shadow:0 16px 48px rgba(0,0,0,0.7);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding:14px 16px;background:#111;border-bottom:1px solid #2e2e2e;
      font-family:var(--font);font-size:13px;font-weight:700;
      letter-spacing:0.12em;text-transform:uppercase;color:var(--col-yellow);
    `;
    header.textContent = 'EXPORTAR IMÁGENES';

    const body = document.createElement('div');
    body.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;';

    const desc = document.createElement('p');
    desc.style.cssText = 'font-family:var(--font);font-size:11px;color:#777;margin:0;line-height:1.6;';
    desc.textContent = `Se exportarán ${okFormats.length} formato${okFormats.length > 1 ? 's' : ''} en un ZIP. Introduce el nombre del contenido:`;

    const inputWrap = document.createElement('div');
    inputWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

    const label = document.createElement('label');
    label.style.cssText = 'font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#555;';
    label.textContent = 'Nombre del contenido';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'ej: TRIGGER_POINT_V1';
    input.value = State.projectName || '';
    input.style.cssText = `
      height:32px;padding:0 10px;background:#0e0e0e;border:1px solid #333;
      border-radius:2px;font-family:var(--font);font-size:12px;color:#ddd;
      outline:none;transition:border-color 0.15s;
    `;
    input.addEventListener('focus', () => input.style.borderColor = 'var(--col-yellow)');
    input.addEventListener('blur',  () => input.style.borderColor = '#333');

    inputWrap.appendChild(label);
    inputWrap.appendChild(input);

    // Lista de formatos
    const formatList = document.createElement('div');
    formatList.style.cssText = `
      background:#0e0e0e;border:1px solid #222;border-radius:2px;
      padding:8px 10px;max-height:140px;overflow-y:auto;
      display:flex;flex-direction:column;gap:3px;
    `;
    okFormats.forEach(f => {
      const cfg = FORMAT_CONFIG[f];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
      const nameEl = document.createElement('span');
      nameEl.style.cssText = 'font-family:var(--font);font-size:10px;color:#888;';
      nameEl.textContent = f;
      const metaEl = document.createElement('span');
      metaEl.style.cssText = 'font-family:var(--font);font-size:10px;color:#444;';
      metaEl.textContent = cfg ? `${cfg.type.toUpperCase()} · ${cfg.maxMB}MB` : 'sin config';
      row.appendChild(nameEl);
      row.appendChild(metaEl);
      formatList.appendChild(row);
    });

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:4px;';

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'CANCELAR';
    btnCancel.style.cssText = `
      height:28px;padding:0 16px;border-radius:2px;
      font-family:var(--font);font-size:10px;font-weight:700;
      letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;
      background:transparent;border:1px solid #444;color:#777;
      transition:color 0.15s,border-color 0.15s;
    `;
    btnCancel.addEventListener('mouseenter', () => { btnCancel.style.color='#ccc'; btnCancel.style.borderColor='#666'; });
    btnCancel.addEventListener('mouseleave', () => { btnCancel.style.color='#777'; btnCancel.style.borderColor='#444'; });
    btnCancel.addEventListener('click', () => overlay.remove());

    const btnOk = document.createElement('button');
    btnOk.textContent = 'EXPORTAR';
    btnOk.style.cssText = `
      height:28px;padding:0 20px;border-radius:2px;
      font-family:var(--font);font-size:10px;font-weight:700;
      letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;
      background:var(--col-yellow);border:1px solid var(--col-yellow);color:#000;
      transition:opacity 0.15s;
    `;
    btnOk.addEventListener('mouseenter', () => btnOk.style.opacity = '0.85');
    btnOk.addEventListener('mouseleave', () => btnOk.style.opacity = '1');
    btnOk.addEventListener('click', () => {
      const nombre = (input.value.trim().replace(/[^a-zA-Z0-9_\-áéíóúüñÁÉÍÓÚÜÑ ]/g, '_').replace(/\s+/g, '_')) || 'EXPORT';
      overlay.remove();
      _exportZip(nombre, okFormats);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') btnOk.click();
      if (e.key === 'Escape') overlay.remove();
    });

    btnRow.appendChild(btnCancel);
    btnRow.appendChild(btnOk);
    body.appendChild(desc);
    body.appendChild(inputWrap);
    body.appendChild(formatList);
    body.appendChild(btnRow);
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => { input.focus(); input.select(); }, 50);
  }

  // ── EXPORTAR ZIP ──────────────────────────────────────────

  async function _exportZip(nombre, okFormats) {
    if (typeof JSZip === 'undefined') {
      alert('JSZip no está cargado.');
      return;
    }

    const progress = _showProgress(okFormats.length);
    const zip = new JSZip();
    const warnings = [];
    let exportedCount = 0;

    // Cache de Image() compartida por todos los formatos del export. Un fanart
    // 4K que aparezca en 40 formatos se decodifica una sola vez.
    _imgCache = new Map();

    try {
      for (let i = 0; i < okFormats.length; i++) {
        const formatName = okFormats[i];
        progress.update(i + 1, formatName);

        const cfg = FORMAT_CONFIG[formatName];
        if (!cfg) {
          warnings.push(`${formatName}: sin configuración, omitido.`);
          continue;
        }

        let blob;
        try {
          blob = await _renderFormat(formatName, cfg);
        } catch (err) {
          console.error(`[Export] Error al renderizar ${formatName}:`, err);
          warnings.push(`❌ ${formatName}: error al renderizar — no incluido en el ZIP. (${err?.message || err})`);
          continue;
        }

        if (!blob) {
          // _renderFormat devolvió null: o falta el size en formatSizes, o
          // toBlob/JPG quality search no produjeron salida (canvas tainted, OOM, etc.)
          warnings.push(`❌ ${formatName}: no se pudo generar la imagen (canvas vacío o demasiado grande). No incluido en el ZIP.`);
          continue;
        }

        const sizeMB = blob.size / (1024 * 1024);
        const filename = `${_buildBaseName(nombre, formatName)}_${cfg.suffix}.${cfg.type}`;

        if (cfg.type === 'png' && sizeMB > cfg.maxMB) {
          warnings.push(`⚠️ ${formatName}: ${sizeMB.toFixed(2)}MB supera el límite de ${cfg.maxMB}MB (exportado igualmente)`);
        }

        const arrayBuf = await blob.arrayBuffer();
        zip.file(filename, arrayBuf);
        exportedCount++;
      }

      progress.close();

      if (exportedCount === 0) {
        alert('No se ha podido generar ningún formato.\n\n' + warnings.join('\n'));
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(zipBlob);
      const a   = Object.assign(document.createElement('a'), { href: url, download: `${nombre}_EXPORT.zip` });
      a.click();
      URL.revokeObjectURL(url);

      if (warnings.length > 0) {
        const resumen = `Export completado: ${exportedCount} de ${okFormats.length} formatos.`;
        setTimeout(() => alert(resumen + '\n\n' + warnings.join('\n')), 300);
      }
    } catch (err) {
      progress.close();
      console.error('[Export] Error global durante export:', err);
      alert('Error durante la exportación.\n\n' + (err?.message || err) + (warnings.length ? '\n\nAvisos previos:\n' + warnings.join('\n') : ''));
    } finally {
      _imgCache = null;
    }
  }

  // ── RENDER DE UN FORMATO ──────────────────────────────────

  // Factor de supersampling para mejorar nitidez de texto, degradados e imágenes.
  // Se renderiza a SS× y se reduce al tamaño final con interpolación high quality.
  const SS = 2;

  // Renderiza el diseño del formato a un canvas nativo (W×H) con ruido aplicado,
  // sin encoding. Reutilizable por export normal y por export de mockup.
  async function _renderFormatCanvas(formatName) {
    const size = State.formatSizes[formatName];
    if (!size) return null;

    const W = size.w;
    const H = size.h;
    // Canvas supersampled: dibujamos en coordenadas lógicas (W,H) gracias a ctx.scale(SS,SS)
    const cv  = document.createElement('canvas');
    cv.width  = W * SS;
    cv.height = H * SS;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(SS, SS);
    ctx.clearRect(0, 0, W, H);

    // Fondo verde "chivato": revela huecos cuando la imagen de fondo no cubre
    // todo el formato. No se aplica a PNG porque rompería la transparencia.
    if (FORMAT_CONFIG[formatName]?.type !== 'png') {
      ctx.fillStyle = '#00ff12';
      ctx.fillRect(0, 0, W, H);
    }

    await document.fonts.ready;

    const layers = [...State.layers].reverse();
    for (const layer of layers) {
      if (layer.isMarcaIplus) continue;
      if (layer.isMolduraFanart) continue; // se dibuja al final, por encima de todo
      if (!_isLayerVisible(layer, formatName)) continue;
      await _drawLayerMaybeMasked(ctx, layer, formatName, W, H);
    }

    if (typeof Pastilla !== 'undefined' && Pastilla.hasFormat(formatName) && Pastilla.isVisible(formatName)) {
      const pos = Pastilla.getPosition(formatName);
      const src = Pastilla.getSrc(formatName);
      await new Promise(res => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const sw = img.naturalWidth  * pos.scale;
          const sh = img.naturalHeight * pos.scale;
          const px = W / 2 + pos.x - sw / 2;
          const py = H / 2 + pos.y - sh / 2;
          ctx.drawImage(img, px, py, sw, sh);
          res();
        };
        img.onerror = () => res();
        img.src = src;
      });
    }

    // Pastilla Freemium (solo en MUX4 TXT y MOVIL TXT cuando versión es Freemium)
    if (typeof Layout !== 'undefined' && Layout.isFreemium(formatName) &&
        typeof Pastilla !== 'undefined' &&
        (formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT' || formatName === 'TEXTO HORIZONTAL' || formatName === 'TEXTO VERTICAL')) {
      const src = Pastilla.getFreemiumSrc();
      const _presetPF = typeof Layout !== 'undefined' && Layout.getPreset && Layout.getPreset(formatName);
      const posY = (_presetPF && _presetPF['PASTILLA_FREEMIUM']?.y) ?? 95;
      await new Promise(res => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const targetH = (_presetPF && _presetPF['PASTILLA_FREEMIUM']?.pastillaH) ?? 61;
          const sh = targetH;
          const sw = (img.naturalWidth || 705) / (img.naturalHeight || 61) * targetH;
          const px = W / 2 - sw / 2;
          const py = H / 2 + posY - sh / 2;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, px, py, sw, sh);
          ctx.imageSmoothingEnabled = true;
          res();
        };
        img.onerror = () => res();
        img.src = src;
      });
    }

    const marca = State.layers.find(l => l.isMarcaIplus);
    if (marca && formatName === 'IPLUS PUBLI') {
      await _drawLayer(ctx, marca, formatName, W, H);
    }
    const marcaSony = State.layers.find(l => l.isMarcaSony);
    if (marcaSony && formatName === 'SONY') {
      await _drawLayer(ctx, marcaSony, formatName, W, H);
    }
    // MOLDURA FANART MOD N — siempre por encima de todo
    const moldura = State.layers.find(l => l.isMolduraFanart);
    if (moldura && formatName === 'FANART MOD N' && _isLayerVisible(moldura, formatName)) {
      await _drawLayer(ctx, moldura, formatName, W, H);
    }

    // ── DOWNSAMPLE al tamaño nativo ───────────────────────
    // Crear lienzo final a resolución nativa y reducir el supersampled con interpolación high quality.
    const finalCv = document.createElement('canvas');
    finalCv.width  = W;
    finalCv.height = H;
    const finalCtx = finalCv.getContext('2d');
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, W, H);

    // El ruido se aplica por capa dentro de _drawLayer (mismo comportamiento
    // que el editor). Ya no se aplica un ruido global sobre toda la composición.

    // El canvas supersampled ya no se usa: liberar su buffer GPU antes de
    // que el siguiente formato lo presione contra el de los demás formatos.
    cv.width = 0; cv.height = 0;

    return finalCv;
  }

  async function _renderFormat(formatName, cfg) {
    const finalCv = await _renderFormatCanvas(formatName);
    if (!finalCv) return null;

    let blob;
    if (cfg.type === 'png') {
      blob = await new Promise(res => finalCv.toBlob(res, 'image/png'));
      if (cfg.dpi && blob) blob = await _setPngDpi(blob, cfg.dpi);
    } else {
      blob = await _jpgWithMaxSize(finalCv, cfg.maxMB);
      if (cfg.dpi && blob) blob = await _setJpegDpi(blob, cfg.dpi);
    }
    // Liberar canvas final antes de devolver el blob — así el siguiente
    // formato arranca con memoria limpia.
    finalCv.width = 0; finalCv.height = 0;
    return blob;
  }

  // ── MOCKUP: diseño + capas de sistema visibles (sin zona de seguridad) ──
  async function _renderMockupCanvas(formatName) {
    const size = State.formatSizes[formatName];
    if (!size) return null;

    // Render del diseño al tamaño nativo del formato
    const designCv = await _renderFormatCanvas(formatName);
    if (!designCv) return null;

    // Componer COMPOSICIÓN TÍTULO / COMPOSICIÓN MOVIL TEXTO en sus formatos de fondo
    // (en el export normal no van; aquí se añaden para reflejar lo que ve el usuario en pantalla).
    await _drawCompositionOverlay(designCv, formatName);

    const dc = size.displayContext;
    const W = dc ? dc.w : size.w;
    const H = dc ? dc.h : size.h;
    const contentX = dc ? dc.contentX : 0;
    const contentY = dc ? dc.contentY : 0;
    const contentW = dc ? (dc.contentW || size.w) : size.w;
    const contentH = dc ? (dc.contentH || size.h) : size.h;

    // Canvas supersampled al tamaño del display
    const cv = document.createElement('canvas');
    cv.width  = W * SS;
    cv.height = H * SS;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(SS, SS);
    ctx.clearRect(0, 0, W, H);

    const sysLayers = State.systemLayers[formatName] || [];
    const isVisible = (l) =>
      (typeof SystemLayers !== 'undefined')
        ? SystemLayers.getVisible(formatName, l.key)
        : (l.defaultVisible !== false);
    const include = (l) => isVisible(l) && l.label !== 'ZONA DE SEGURIDAD';

    // Capas zBase debajo del diseño
    for (const layer of sysLayers.filter(l => l.zBase && include(l))) {
      await _drawSystemMockupLayer(ctx, layer, W, H, dc);
    }

    // Diseño en su content area (o full si no hay displayContext)
    ctx.drawImage(designCv, 0, 0, designCv.width, designCv.height,
                  contentX, contentY, contentW, contentH);

    // Capas zBottom (encima del diseño base pero todavía por debajo de overlays "top")
    for (const layer of sysLayers.filter(l => l.zBottom && !l.zBase && include(l))) {
      await _drawSystemMockupLayer(ctx, layer, W, H, dc);
    }

    // Capas top (encima de todo): el mockup principal va aquí
    for (const layer of sysLayers.filter(l => !l.zBase && !l.zBottom && include(l))) {
      await _drawSystemMockupLayer(ctx, layer, W, H, dc);
    }

    // Downsample a resolución nativa
    const finalCv = document.createElement('canvas');
    finalCv.width  = W;
    finalCv.height = H;
    const finalCtx = finalCv.getContext('2d');
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, W, H);

    return finalCv;
  }

  // Pinta sobre el canvas del diseño (a tamaño nativo del formato) la composición
  // que normalmente se ve en pantalla pero no se incluye en el export estándar.
  //  - MUX4 FONDO       → COMPOSICIÓN TÍTULO  (posición depende del overlay 'foco')
  //  - MOVIL MUX FONDO  → COMPOSICIÓN MOVIL TEXTO
  async function _drawCompositionOverlay(designCv, formatName) {
    if (formatName !== 'MUX4 FONDO' && formatName !== 'MOVIL MUX FONDO') return;
    const ctx = designCv.getContext('2d');

    if (formatName === 'MUX4 FONDO') {
      const comp = State.layers.find(l => l.isComposicion);
      if (!comp || !(comp.srcFondo || comp.src)) return;
      const focoVisible = (typeof SystemLayers !== 'undefined')
        ? SystemLayers.getVisible('MUX4 FONDO', 'foco')
        : false;
      const posX = 106;
      const posY = focoVisible ? 457 : 185;
      const nw   = comp.naturalWidth  || 784;
      const nh   = comp.naturalHeight || 318;
      const src  = comp.srcFondo || comp.src;
      await _drawImage(ctx, src, posX, posY, nw, nh);
      return;
    }

    if (formatName === 'MOVIL MUX FONDO') {
      const comp = State.layers.find(l => l.isComposicionMovil);
      if (!comp || !(comp.srcMovilFondo || comp.src)) return;
      const posX = 0;
      const posY = 1217;
      const nw   = comp.naturalWidth  || 1440;
      const nh   = comp.naturalHeight || 466;
      const src  = comp.srcMovilFondo || comp.src;
      await _drawImage(ctx, src, posX, posY, nw, nh);
    }
  }

  async function _drawSystemMockupLayer(ctx, layer, W, H, dc) {
    if (!layer?.src) return;
    const _layerSrc = layer.srcOriginal || layer.src;
    let dx = 0, dy = 0, dw = W, dh = H;
    if (dc && layer.contentArea) {
      dx = dc.contentX;
      dy = dc.contentY;
      dw = dc.contentW || dc.w;
      dh = dc.contentH || dc.h;
    } else if (dc && layer.contextPos) {
      // Tamaño natural en la posición indicada por contextPos
      await new Promise(res => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, layer.contextPos.x, layer.contextPos.y, img.naturalWidth, img.naturalHeight);
          res();
        };
        img.onerror = () => res();
        img.src = _layerSrc;
      });
      return;
    }
    await _drawImage(ctx, _layerSrc, dx, dy, dw, dh);
  }

  // ── JPG QUALITY BINARY SEARCH ─────────────────────────────

  // ── METADATA DPI ──────────────────────────────────────────
  // Reescribe el chunk JFIF (APP0) de un JPEG para marcar el DPI deseado.
  // Solo afecta al metadato: la imagen sigue siendo los mismos píxeles.
  async function _setJpegDpi(blob, dpi) {
    try {
      const buf = new Uint8Array(await blob.arrayBuffer());
      // SOI = FF D8. Buscar APP0 (FF E0) justo después.
      if (buf[0] !== 0xFF || buf[1] !== 0xD8) return blob;
      if (buf[2] === 0xFF && buf[3] === 0xE0 &&
          buf[6] === 0x4A && buf[7] === 0x46 && buf[8] === 0x49 && buf[9] === 0x46 && buf[10] === 0x00) {
        // APP0 JFIF presente — sobrescribimos los campos de densidad
        // Offsets dentro del segmento: 13 units, 14-15 Xdensity, 16-17 Ydensity
        buf[13] = 1; // unidades = pixels per inch
        buf[14] = (dpi >> 8) & 0xFF; // Xdensity high
        buf[15] = dpi & 0xFF;        // Xdensity low
        buf[16] = (dpi >> 8) & 0xFF; // Ydensity high
        buf[17] = dpi & 0xFF;        // Ydensity low
        return new Blob([buf], { type: 'image/jpeg' });
      }
      // Si no hay APP0 JFIF, insertamos uno completo después del SOI
      const jfif = new Uint8Array([
        0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00,
        0x01, 0x02,                     // versión 1.02
        0x01,                            // unidades = ppi
        (dpi >> 8) & 0xFF, dpi & 0xFF,   // Xdensity
        (dpi >> 8) & 0xFF, dpi & 0xFF,   // Ydensity
        0x00, 0x00,                      // sin thumbnail
      ]);
      const out = new Uint8Array(buf.length + jfif.length);
      out.set(buf.subarray(0, 2), 0);
      out.set(jfif, 2);
      out.set(buf.subarray(2), 2 + jfif.length);
      return new Blob([out], { type: 'image/jpeg' });
    } catch (e) {
      console.warn('[Export] No se pudo escribir DPI en JPEG:', e);
      return blob;
    }
  }

  // Reescribe (o inserta) el chunk pHYs de un PNG para marcar el DPI deseado.
  async function _setPngDpi(blob, dpi) {
    try {
      const buf = new Uint8Array(await blob.arrayBuffer());
      // Firma PNG (8 bytes) + IHDR (longitud variable, normalmente 25 bytes).
      // pHYs debe ir antes de IDAT. Insertamos tras IHDR.
      const ppm = Math.round(dpi * 39.3701); // pixels per meter
      // Calcular CRC32 del chunk pHYs (tipo + datos)
      const crcTable = _pngCrcTable();
      const chunkType = [0x70, 0x48, 0x59, 0x73]; // "pHYs"
      const data = [
        (ppm >>> 24) & 0xFF, (ppm >>> 16) & 0xFF, (ppm >>> 8) & 0xFF, ppm & 0xFF, // X ppm
        (ppm >>> 24) & 0xFF, (ppm >>> 16) & 0xFF, (ppm >>> 8) & 0xFF, ppm & 0xFF, // Y ppm
        1, // unidad = metros
      ];
      let crc = 0xFFFFFFFF;
      [...chunkType, ...data].forEach(b => { crc = crcTable[(crc ^ b) & 0xFF] ^ (crc >>> 8); });
      crc = (crc ^ 0xFFFFFFFF) >>> 0;
      const chunk = new Uint8Array([
        0, 0, 0, 9, // longitud = 9
        ...chunkType,
        ...data,
        (crc >>> 24) & 0xFF, (crc >>> 16) & 0xFF, (crc >>> 8) & 0xFF, crc & 0xFF,
      ]);
      // Localizar fin de IHDR: firma(8) + longitud(4) + tipo(4) + datos(IHDR.length) + crc(4)
      const ihdrLength = (buf[8] << 24) | (buf[9] << 16) | (buf[10] << 8) | buf[11];
      const ihdrEnd = 8 + 4 + 4 + ihdrLength + 4;
      const out = new Uint8Array(buf.length + chunk.length);
      out.set(buf.subarray(0, ihdrEnd), 0);
      out.set(chunk, ihdrEnd);
      out.set(buf.subarray(ihdrEnd), ihdrEnd + chunk.length);
      return new Blob([out], { type: 'image/png' });
    } catch (e) {
      console.warn('[Export] No se pudo escribir DPI en PNG:', e);
      return blob;
    }
  }

  // Tabla CRC32 para PNG (se cachea tras el primer uso)
  let _crcCache = null;
  function _pngCrcTable() {
    if (_crcCache) return _crcCache;
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return (_crcCache = t);
  }

  async function _jpgWithMaxSize(cv, maxMB) {
    const maxBytes = maxMB * 1024 * 1024;

    // Probar calidad máxima primero — si cabe, perfecto
    let blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 1));
    if (blob && blob.size <= maxBytes) return blob;

    // Búsqueda binaria ascendente: la calidad MÁS ALTA que cabe
    let lo = 0.1, hi = 1, best = null;
    const minBlob = await new Promise(res => cv.toBlob(res, 'image/jpeg', lo));
    if (minBlob && minBlob.size > maxBytes) return minBlob; // ni a mínima calidad cabe

    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      const b   = await new Promise(res => cv.toBlob(res, 'image/jpeg', mid));
      if (!b) break;
      if (b.size <= maxBytes) { best = b; lo = mid; }
      else                    { hi = mid; }
      if (hi - lo < 0.01) break;
    }
    return best || minBlob;
  }

  // ── PROGRESO ──────────────────────────────────────────────

  function _showProgress(total) {
    document.getElementById('export-progress')?.remove();
    const el = document.createElement('div');
    el.id = 'export-progress';
    el.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:99999;
      background:#161616;border:1px solid #2e2e2e;border-radius:4px;
      padding:12px 16px;min-width:260px;
      box-shadow:0 8px 24px rgba(0,0,0,0.6);
      font-family:var(--font);font-size:11px;color:#888;
    `;
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--col-yellow);margin-bottom:6px;font-size:10px;';
    title.textContent = 'Exportando…';
    const info = document.createElement('div');
    info.id = 'export-progress-info';
    info.textContent = `0 / ${total}`;
    const bar = document.createElement('div');
    bar.style.cssText = 'height:2px;background:#222;border-radius:1px;margin-top:8px;overflow:hidden;';
    const fill = document.createElement('div');
    fill.id = 'export-progress-fill';
    fill.style.cssText = 'height:100%;background:var(--col-yellow);width:0%;transition:width 0.2s;';
    bar.appendChild(fill);
    el.appendChild(title);
    el.appendChild(info);
    el.appendChild(bar);
    document.body.appendChild(el);
    return {
      update: (n, name) => {
        const infoEl = document.getElementById('export-progress-info');
        const fillEl = document.getElementById('export-progress-fill');
        if (infoEl) infoEl.textContent = `${n} / ${total} — ${(typeof Formats !== 'undefined' && Formats.displayLabel) ? Formats.displayLabel(name) : name}`;
        if (fillEl) fillEl.style.width = `${(n / total) * 100}%`;
      },
      close: () => setTimeout(() => document.getElementById('export-progress')?.remove(), 800),
    };
  }

  // ── VISIBILIDAD ───────────────────────────────────────────

  function _isLayerVisible(layer, formatName) {
    // Las capas-máscara NO se renderean nunca en el output final.
    if (layer.isMask) return false;
    // Rol FANART: el fanart solo en formatos FANART; subject/fondo ocultos en FANART si hay fanart
    if (typeof Formats !== 'undefined' && Formats.fanartRoleVisibility &&
        Formats.fanartRoleVisibility(layer.id, formatName) === false) return false;
    if (layer.isTitleLayer) {
      const _v = (typeof Formats !== 'undefined' && Formats.getTextVariant) ? Formats.getTextVariant(formatName) : null;
      const inTextFormat = (formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT' || formatName === 'TEXTO HORIZONTAL' || formatName === 'TEXTO VERTICAL' || formatName === 'AMAZON LOGO' || formatName === 'TÍTULO FICHA')
                       || _v === 'TITLE_H' || _v === 'TITLE_V';
      if (!inTextFormat) return false;
      if (typeof Formats !== 'undefined' && Formats.isActiveTitleForFormat &&
          !Formats.isActiveTitleForFormat(layer, formatName)) return false;
      const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
      return fmtVisible !== false;
    }
    // Composiciones H/V: según la variante del formato
    if (layer.isComposicionTextoH || layer.isComposicionTextoV) {
      const _v = (typeof Formats !== 'undefined' && Formats.getTextVariant) ? Formats.getTextVariant(formatName) : null;
      const _match = (layer.isComposicionTextoH && _v === 'H') || (layer.isComposicionTextoV && _v === 'V');
      if (!_match) return false;
      const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
      return fmtVisible !== undefined ? fmtVisible : true;
    }
    if (layer.isComposicion) {
      // Composición MUX4: SOLO en formatos cuya variante de texto sea 'MUX4'.
      // En MUX4 FONDO NO se exporta — es referencia visual en el editor pero
      // no debe aparecer en la imagen final (mismo criterio que la composición
      // MOVIL en MOVIL MUX FONDO). El mockup la añade aparte vía
      // _drawCompositionOverlay si hace falta.
      const _mv = (typeof Formats !== 'undefined' && Formats.getTextVariant) ? Formats.getTextVariant(formatName) : null;
      if (_mv !== 'MUX4') return false;
      const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
      return fmtVisible !== undefined ? fmtVisible : true;
    }
    if (layer.isComposicionMovil) {
      // Composición MOVIL: en los formatos que la elijan ('MOVIL'); el mockup usa _drawCompositionOverlay
      const _mv = (typeof Formats !== 'undefined' && Formats.getTextVariant) ? Formats.getTextVariant(formatName) : null;
      if (_mv !== 'MOVIL') return false;
      const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
      return fmtVisible !== undefined ? fmtVisible : true;
    }
    if (layer.isComposicionAmazon) return false;
    if (layer.isMarcaSony) return formatName === 'SONY';
    if (layer.isMarcaIplus) return formatName === 'IPLUS PUBLI';
    if (layer.isMolduraFanart) {
      if (formatName !== 'FANART MOD N') return false;
      const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
      return fmtVisible !== undefined ? fmtVisible : true;
    }
    if (layer.isMascaraBlur) {
      if (formatName !== 'FANART MOD N') return false;
      const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
      return fmtVisible !== undefined ? fmtVisible : true;
    }
    if (layer.exclusiveFormat) return layer.exclusiveFormat === formatName;
    if ((formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT' || formatName === 'TÍTULO FICHA' || formatName === 'AMAZON LOGO' || formatName === 'TEXTO HORIZONTAL' || formatName === 'TEXTO VERTICAL') && !layer._layoutGenerated) return false;
    const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
    return fmtVisible !== undefined ? fmtVisible : layer.visible !== false;
  }

  // ── DIBUJAR CAPA ──────────────────────────────────────────


  // ── RUIDO — usa el mismo SVG filter del DOM que el editor ──
  async function _applyNoiseSVG(cv, noiseLevel) {
    if (!noiseLevel || noiseLevel <= 0) return;
    const filterId  = `mp-noise-${Math.round(noiseLevel)}`;
    const svgEl     = document.getElementById('mp-noise-svg');
    if (!svgEl) return;
    const filterDef = svgEl.querySelector(`#${filterId}`)?.outerHTML;
    if (!filterDef) return;

    const W = cv.width, H = cv.height;
    const dataURL = cv.toDataURL('image/png');
    const svgStr  = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${filterDef}</defs><image href="${dataURL}" width="${W}" height="${H}" filter="url(#${filterId})"/></svg>`;
    const url     = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));

    await new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        cv.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        res();
      };
      img.onerror = () => { URL.revokeObjectURL(url); res(); };
      img.src = url;
    });
  }

  // ── MÁSCARA BLUR (Canvas 2D backdrop-blur emulado) ───────
  // Snapshot del canvas actual → blur en tmp → mascara alfa via destination-in → volcar.
  async function _drawMascaraBlur(ctx, layer, formatName, W, H) {
    if (!layer.src) return;
    // En export usamos siempre la imagen original (4K) si existe; en edición
    // se trabaja con un proxy bajado almacenado en layer.src.
    const _layerSrc = layer.srcOriginal || layer.src;
    const cv = ctx.canvas;
    const physW = cv.width;
    const physH = cv.height;
    const physScale = physW / W; // factor de supersampling (1 ó 2)

    // tmp1: lo dibujado hasta ahora
    const tmp1 = document.createElement('canvas');
    tmp1.width  = physW;
    tmp1.height = physH;
    tmp1.getContext('2d').drawImage(cv, 0, 0);

    // tmp2: copia con blur aplicado. 14px @ 3840 → escala con physW
    const tmp2 = document.createElement('canvas');
    tmp2.width  = physW;
    tmp2.height = physH;
    const t2 = tmp2.getContext('2d');
    const blurPx = 14 * (physW / 3840);
    t2.filter = `blur(${blurPx}px)`;
    t2.drawImage(tmp1, 0, 0);
    t2.filter = 'none';

    // Cargar máscara y aplicar destination-in para recortar el blur a la zona alfa
    const p = State.formatParams?.[formatName]?.[layer.id] || {};
    const sx = (p.scaleX ?? 100) / 100;
    const sy = (p.scaleY ?? 100) / 100;
    const iw = (layer.naturalWidth  || 200) * sx;
    const ih = (layer.naturalHeight || 200) * sy;
    const cx = W / 2 + (p.x ?? 0);
    const cy = H / 2 + (p.y ?? 0);
    const maskX = (cx - iw / 2) * physScale;
    const maskY = (cy - ih / 2) * physScale;
    const maskW = iw * physScale;
    const maskH = ih * physScale;

    await new Promise(res => {
      const maskImg = new Image();
      maskImg.onload = () => {
        t2.globalCompositeOperation = 'destination-in';
        t2.drawImage(maskImg, maskX, maskY, maskW, maskH);
        res();
      };
      maskImg.onerror = () => res();
      maskImg.src = _layerSrc;
    });

    // Volcar el resultado al canvas principal con transform identidad
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(tmp2, 0, 0);
    ctx.restore();
  }

  // ── MÁSCARA CUSTOM (sistema de máscaras Photoshop-style) ──
  //
  // Si la capa cliente tiene `maskLayerId`, su contenido se renderea en un
  // canvas offscreen y se aplica el alfa de la máscara usando
  // `globalCompositeOperation = 'destination-in'`. La máscara se renderea
  // como rect blanco con `ctx.filter = blur()` opcional para reproducir
  // el efecto de borde difuminado del editor. Si la capa tiene una máscara
  // del SISTEMA activa (SIL/PERFIL) o el usuario la ha desactivado en este
  // formato, se ignora la máscara custom.

  async function _drawLayerMaybeMasked(ctx, layer, formatName, W, H) {
    if (!layer.maskLayerId) {
      return await _drawLayer(ctx, layer, formatName, W, H);
    }
    const fmtSize = State.formatSizes[formatName];
    const maskType = State.formatMaskEnabled?.[formatName]?.[layer.id] ?? null;
    const hasSystemMask = (fmtSize?.maskRect && !fmtSize.maskCircle && !!maskType) ||
                         (fmtSize?.maskCircle && (maskType === 'circle' || maskType === 'rect'));
    const customDisabled = !!State.formatParams?.[formatName]?.[layer.id]?.customMaskDisabled;
    if (hasSystemMask || customDisabled) {
      return await _drawLayer(ctx, layer, formatName, W, H);
    }
    const maskLayer = State.layers.find(l => l.id === layer.maskLayerId);
    if (!maskLayer || !maskLayer.isMask) {
      return await _drawLayer(ctx, layer, formatName, W, H);
    }
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const offCtx = off.getContext('2d');
    await _drawLayer(offCtx, layer, formatName, W, H);
    const maskCv = _renderCustomMaskCanvas(maskLayer, formatName, W, H);
    offCtx.globalCompositeOperation = 'destination-in';
    offCtx.drawImage(maskCv, 0, 0);
    ctx.drawImage(off, 0, 0);
    off.width = 0; off.height = 0;
    maskCv.width = 0; maskCv.height = 0;
  }

  function _renderCustomMaskCanvas(maskLayer, formatName, W, H) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const mctx = c.getContext('2d');
    const p = State.formatParams?.[formatName]?.[maskLayer.id] || {};
    const sx = (p.scaleX ?? 100) / 100;
    const sy = (p.scaleY ?? 100) / 100;
    const rot = ((p.rotation ?? 0) * Math.PI) / 180;
    const nw = maskLayer.naturalWidth  || W;
    const nh = maskLayer.naturalHeight || H;
    const mw = nw * sx;
    const mh = nh * sy;
    const cx = W/2 + (p.x ?? 0);
    const cy = H/2 + (p.y ?? 0);
    const blur = maskLayer.params?.blur ?? 0;
    if (blur > 0) mctx.filter = `blur(${blur}px)`;
    mctx.save();
    mctx.translate(cx, cy);
    mctx.rotate(rot);
    mctx.fillStyle = 'white';
    const radius = (maskLayer.type === 'solid' && maskLayer.solidParams?.radius) || 0;
    if (radius > 0) {
      _roundRect(mctx, -mw/2, -mh/2, mw, mh, radius * Math.max(sx, sy));
      mctx.fill();
    } else {
      mctx.fillRect(-mw/2, -mh/2, mw, mh);
    }
    mctx.restore();
    return c;
  }

  async function _drawLayer(ctx, layer, formatName, W, H) {
    // Capa MÁSCARA BLUR: snapshot + blur + mask alfa (backdrop-filter equivalente)
    if (layer.isMascaraBlur) {
      return await _drawMascaraBlur(ctx, layer, formatName, W, H);
    }

    // En export usamos la imagen original (4K) si existe. La edición usa un
    // proxy bajado guardado en layer.src; el original vive en layer.srcOriginal.
    const _layerSrc = layer.srcOriginal || layer.src;

    const p   = State.formatParams?.[formatName]?.[layer.id] || {};
    const sx  = (p.scaleX  ?? 100) / 100;
    const sy  = (p.scaleY  ?? 100) / 100;
    const rot = ((p.rotation ?? 0) * Math.PI) / 180;
    const op  = (layer.params?.opacity ?? 100) / 100;
    // Blend mode: 'normal' en CSS = 'source-over' en canvas
    const blend = (!layer.blendMode || layer.blendMode === 'normal') ? 'source-over' : layer.blendMode;

    // ── MÁSCARA SIL ───────────────────────────────────────
    const fmtSize    = State.formatSizes[formatName];
    const maskRect   = fmtSize?.maskRect;
    const maskCircle = fmtSize?.maskCircle;
    const maskType   = State.formatMaskEnabled?.[formatName]?.[layer.id] ?? null;
    const isSIL          = maskRect && !maskCircle;
    const isMaskedSIL    = isSIL && !!maskType;
    const isMaskedCircle = maskCircle && maskType === 'circle';
    const isMaskedRect   = maskCircle && maskType === 'rect';
    const isMasked = isMaskedSIL || isMaskedCircle || isMaskedRect;
    if (isMaskedSIL) {
      ctx.save();
      _clipMaskRect(ctx, maskRect, W, H);
    } else if (isMaskedCircle) {
      ctx.save();
      _clipMaskCircle(ctx, maskCircle, W, H);
    } else if (isMaskedRect) {
      ctx.save();
      _clipMaskRect(ctx, maskRect, W, H);
    }

    if (layer.isComposicion && layer.src) {
      const nw = layer.naturalWidth  || W;
      const nh = layer.naturalHeight || H;
      const drawW = nw * sx;
      const drawH = nh * sy;
      let posX, posY;
      if (formatName === 'MUX4 FONDO') { posX = 106; posY = 185; }
      else { posX = W / 2 + (p.x ?? 0) - drawW / 2; posY = H / 2 + (p.y ?? 0) - drawH / 2; }
      const compSrc = (formatName === 'MUX4 FONDO' && layer.srcFondo) ? layer.srcFondo : layer.src;
      ctx.save();
      ctx.globalAlpha = op;
      ctx.globalCompositeOperation = blend;
      await _drawImage(ctx, compSrc, posX, posY, drawW, drawH);
      ctx.restore();
      return;
    }

    let cx = W / 2 + (p.x ?? 0);
    let cy = H / 2 + (p.y ?? 0);
    // Para texto: forzar coordenadas enteras y evitar subpixel positioning blur
    if (layer.type === 'text') { cx = Math.round(cx); cy = Math.round(cy); }
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, op));
    ctx.globalCompositeOperation = blend;

    const filters = [];
    const g = layer.params || {};
    if (g.blur       > 0)   filters.push(`blur(${g.blur}px)`);
    // El ruido se aplica POR CAPA con el mismo filtro SVG que usa el editor
    // (canvas.js:_injectNoiseFilter). Reemplaza al antiguo render global de
    // _applyNoiseSVG sobre todo el canvas, que pintaba grano por toda la
    // composición aunque solo una capa lo tuviera activado.
    if (g.noise      > 0)   filters.push(`url(#mp-noise-${Math.round(g.noise)})`);
    if (g.brightness !== 0) filters.push(`brightness(${100 + g.brightness}%)`);
    if (g.contrast   !== 0) filters.push(`contrast(${100 + g.contrast}%)`);
    if (g.saturation !== 0) filters.push(`saturate(${100 + g.saturation}%)`);
    if (filters.length) ctx.filter = filters.join(' ');

    ctx.translate(cx, cy);
    ctx.rotate(rot);

    if (layer.type === 'solid' && layer.solidParams) {
      const sw = layer.solidParams.width  * sx;
      const sh = layer.solidParams.height * sy;
      const r  = layer.solidParams.radius || 0;
      ctx.fillStyle = layer.solidParams.color;
      if (r > 0) { _roundRect(ctx, -sw/2, -sh/2, sw, sh, r); ctx.fill(); }
      else        { ctx.fillRect(-sw/2, -sh/2, sw, sh); }

    } else if (layer.type === 'gradient' && layer.gradientParams) {
      const gp = layer.gradientParams;
      const gw = (layer.naturalWidth  || W) * sx;
      const gh = (layer.naturalHeight || H) * sy;
      const c1 = _rgba(gp.color1, gp.alpha1);
      const c2 = _rgba(gp.color2, gp.alpha2);
      let grad;
      let s1 = 0, s2 = 100;
      if (gp.type === 'radial') {
        const offX = ((gp.cx ?? 50) - 50) / 100 * gw;
        const offY = ((gp.cy ?? 50) - 50) / 100 * gh;
        const rPx  = (gp.radius ?? 100) / 100 * Math.max(gw, gh);
        grad = ctx.createRadialGradient(offX, offY, 0, offX, offY, rPx);
      } else {
        const ang = ((gp.angle - 90) * Math.PI) / 180;
        const dx  = Math.cos(ang) * gw / 2;
        const dy  = Math.sin(ang) * gh / 2;
        grad = ctx.createLinearGradient(-dx, -dy, dx, dy);
        if (typeof Canvas !== 'undefined' && Canvas.calcGradientStops) {
          const stops = Canvas.calcGradientStops(gp, layer.naturalWidth || W, layer.naturalHeight || H);
          s1 = stops.s1;
          s2 = stops.s2;
        }
      }
      grad.addColorStop(Math.max(0, Math.min(1, s1/100)), c1);
      grad.addColorStop(Math.max(0, Math.min(1, s2/100)), c2);
      ctx.fillStyle = grad;
      ctx.fillRect(-gw/2, -gh/2, gw, gh);

    } else if (layer.type === 'text' && layer.textParams) {
      if (typeof TextLayers !== 'undefined') TextLayers.migrate(layer);
      const tp       = layer.textParams;
      const sz       = tp.size || 48;
      const align    = tp.align  || 'left';
      const lineH    = sz * (tp.leading  ?? 120) / 100;
      const tracking = (tp.tracking ?? 0) * 0.001;
      const runs     = tp.runs || [];
      const lineRuns = (typeof TextLayers !== 'undefined') ? TextLayers.buildLineRuns(runs) : [runs];
      const N        = lineRuns.length;
      ctx.save();
      // Para texto: evitar subpixel positioning que produce desenfoque/aliasing.
      // Reset rotación intermedia y forzar coordenadas enteras.
      ctx.scale(sx, sy);
      ctx.textBaseline  = 'middle';
      ctx.letterSpacing = tracking + 'em';
      // En navegadores que lo soporten, mejora la nitidez del texto
      if ('textRendering' in ctx) ctx.textRendering = 'geometricPrecision';
      // Calcular lineH por línea (tamaño mayor de cada línea * leading)
      const lineHeights = lineRuns.map(lr => {
        const maxSz = lr.length > 0 ? Math.max(...lr.map(r => r.size || sz)) : sz;
        return maxSz * (tp.leading ?? 120) / 100;
      });

      const lineWidths = lineRuns.map(lr => {
        let w = 0;
        for (const r of lr) {
          const rsz = r.size || sz;
          ctx.font = `${r.style||'normal'} ${r.weight||'400'} ${rsz}px '${r.family||'Apercu Movistar'}', Arial, sans-serif`;
          w += ctx.measureText(r.text || '').width;
        }
        return w;
      });
      const textW    = Math.max(...lineWidths, 0);
      const totalH   = lineHeights.reduce((a, b) => a + b, 0);
      let   currentY = -totalH / 2;

      lineRuns.forEach((lr, i) => {
        const lh   = lineHeights[i];
        const lineY = Math.round(currentY + lh / 2);
        currentY += lh;
        const lw     = lineWidths[i];
        // xStart: ajustar según alineación para coincidir con viewport
        // En viewport: left→borde izq, center→centro, right→borde der
        let   xStart = align === 'center' ? -lw / 2
                      : align === 'right'  ? -lw
                      : 0;
        xStart = Math.round(xStart);
        for (const r of lr) {
          const rsz = r.size || sz;
          ctx.font      = `${r.style||'normal'} ${r.weight||'400'} ${rsz}px '${r.family||'Apercu Movistar'}', Arial, sans-serif`;
          ctx.fillStyle = r.color || '#ffffff';
          ctx.fillText(r.text || '', xStart, lineY);
          xStart += ctx.measureText(r.text || '').width;
        }
      });
      ctx.restore();
    } else if (layer.src) {
      const iw = (layer.naturalWidth  || 200) * sx;
      const ih = (layer.naturalHeight || 200) * sy;
      if (layer.params?.tintAmount > 0) {
        const tmp = document.createElement('canvas');
        tmp.width  = W; tmp.height = H;
        const tctx = tmp.getContext('2d');
        tctx.save();
        tctx.translate(W / 2 + (p.x ?? 0), H / 2 + (p.y ?? 0));
        tctx.rotate(((p.rotation ?? 0) * Math.PI) / 180);
        await _drawImage(tctx, _layerSrc, -iw/2, -ih/2, iw, ih);
        tctx.globalCompositeOperation = 'source-atop';
        tctx.globalAlpha = layer.params.tintAmount / 100;
        tctx.fillStyle   = layer.params.tintColor || '#000000';
        tctx.fillRect(-iw/2, -ih/2, iw, ih);
        tctx.restore();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = op;
        ctx.globalCompositeOperation = blend;
        if (filters.length) ctx.filter = filters.join(' ');
        ctx.drawImage(tmp, 0, 0, W, H, 0, 0, W, H);
      } else {
        await _drawImage(ctx, _layerSrc, -iw/2, -ih/2, iw, ih);
      }
    }

    ctx.restore();
    if (isMasked) ctx.restore(); // cerrar el clip de máscara SIL
  }

  // ── HELPERS ───────────────────────────────────────────────

  function _clipMaskRect(ctx, m, W, H) {
    const ax = W / 2 + m.x - m.w / 2;
    const ay = H / 2 + m.y - m.h / 2;
    const r  = m.r || 0;
    ctx.beginPath();
    ctx.moveTo(ax + r, ay);
    ctx.lineTo(ax + m.w - r, ay);
    ctx.arcTo(ax + m.w, ay,       ax + m.w, ay + r,       r);
    ctx.lineTo(ax + m.w, ay + m.h);
    ctx.lineTo(ax,       ay + m.h);
    ctx.lineTo(ax,       ay + r);
    ctx.arcTo(ax,        ay,       ax + r,   ay,           r);
    ctx.closePath();
    ctx.clip();
  }

  function _clipMaskCircle(ctx, m, W, H) {
    const cx = W / 2 + m.cx;
    const cy = H / 2 + m.cy;
    ctx.beginPath();
    ctx.arc(cx, cy, m.r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  // Cache de Image() por src. Activa solo durante un export (_exportZip /
  // _exportMockupBlob). Evita decodificar el mismo bitmap 40 veces cuando un
  // fanart 4K aparece en muchos formatos. Reset entre exports para no retener
  // memoria indefinidamente.
  let _imgCache = null;

  function _loadImage(src) {
    if (_imgCache && _imgCache.has(src)) return _imgCache.get(src);
    const p = new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });
    if (_imgCache) _imgCache.set(src, p);
    return p;
  }

  async function _drawImage(ctx, src, x, y, w, h) {
    const img = await _loadImage(src);
    if (!img) return;
    const prevSmoothing = ctx.imageSmoothingEnabled;
    // Si se dibuja a tamaño natural o mayor, desactivar smoothing para máxima nitidez
    if (w >= img.naturalWidth && h >= img.naturalHeight) {
      ctx.imageSmoothingEnabled = false;
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    ctx.drawImage(img, x, y, w, h);
    ctx.imageSmoothingEnabled = prevSmoothing;
  }

  function _rgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${((alpha ?? 100) / 100).toFixed(2)})`;
  }

  function _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);     ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);     ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x, y + r);         ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
  }

  // Construye el "base name" del fichero para cada formato.
  // Caso especial: MOD N y FANART MOD N intercalan fecha (MES3+AA, ej. ENE26) entre nombre y suffix.
  function _buildBaseName(nombre, formatName) {
    if (formatName === 'FANART MOD N' || formatName === 'MOD N') {
      const meses = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
      const now = new Date();
      const tag = meses[now.getMonth()] + String(now.getFullYear()).slice(-2);
      return `${nombre}_${tag}`;
    }
    return nombre;
  }

  // ── MODAL GENERAR MOCKUP ──────────────────────────────────

  function _showMockupModal(formatName) {
    if (!isMockupFormat(formatName)) return;

    document.getElementById('mockup-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'mockup-modal';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.75);
      z-index:99000;display:flex;align-items:center;justify-content:center;
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.style.cssText = `
      background:#161616;border:1px solid #2e2e2e;border-radius:4px;
      width:380px;padding:0;overflow:hidden;
      box-shadow:0 16px 48px rgba(0,0,0,0.7);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding:14px 16px;background:#111;border-bottom:1px solid #2e2e2e;
      font-family:var(--font);font-size:13px;font-weight:700;
      letter-spacing:0.12em;text-transform:uppercase;color:var(--col-yellow);
    `;
    header.textContent = 'GENERAR MOCKUP';

    const body = document.createElement('div');
    body.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px;';

    const desc = document.createElement('p');
    desc.style.cssText = 'font-family:var(--font);font-size:11px;color:#777;margin:0;line-height:1.6;';
    desc.textContent = `Formato: ${(typeof Formats !== 'undefined' && Formats.displayLabel) ? Formats.displayLabel(formatName) : formatName}. Introduce el nombre del archivo:`;

    const inputWrap = document.createElement('div');
    inputWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

    const label = document.createElement('label');
    label.style.cssText = 'font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#555;';
    label.textContent = 'Nombre del contenido';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'ej: TRIGGER_POINT';
    input.value = State.projectName || '';
    input.style.cssText = `
      height:32px;padding:0 10px;background:#0e0e0e;border:1px solid #333;
      border-radius:2px;font-family:var(--font);font-size:12px;color:#ddd;
      outline:none;transition:border-color 0.15s;
    `;
    input.addEventListener('focus', () => input.style.borderColor = 'var(--col-yellow)');
    input.addEventListener('blur',  () => input.style.borderColor = '#333');

    inputWrap.appendChild(label);
    inputWrap.appendChild(input);

    const cfg = FORMAT_CONFIG[formatName];
    const previewName = document.createElement('div');
    previewName.style.cssText = 'font-family:var(--font);font-size:10px;color:#444;background:#0e0e0e;border:1px solid #222;border-radius:2px;padding:8px 10px;';
    const updatePreview = () => {
      const raw = (input.value.trim().replace(/[^a-zA-Z0-9_\-áéíóúüñÁÉÍÓÚÜÑ ]/g, '_').replace(/\s+/g, '_')) || 'EXPORT';
      previewName.textContent = `${raw}_${cfg?.suffix || formatName}_MOCKUP.jpg`;
    };
    input.addEventListener('input', updatePreview);
    updatePreview();

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:4px;';

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'CANCELAR';
    btnCancel.style.cssText = `
      height:28px;padding:0 16px;border-radius:2px;
      font-family:var(--font);font-size:10px;font-weight:700;
      letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;
      background:transparent;border:1px solid #444;color:#777;
      transition:color 0.15s,border-color 0.15s;
    `;
    btnCancel.addEventListener('mouseenter', () => { btnCancel.style.color='#ccc'; btnCancel.style.borderColor='#666'; });
    btnCancel.addEventListener('mouseleave', () => { btnCancel.style.color='#777'; btnCancel.style.borderColor='#444'; });
    btnCancel.addEventListener('click', () => overlay.remove());

    const btnOk = document.createElement('button');
    btnOk.textContent = 'GENERAR';
    btnOk.style.cssText = `
      height:28px;padding:0 20px;border-radius:2px;
      font-family:var(--font);font-size:10px;font-weight:700;
      letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;
      background:var(--col-yellow);border:1px solid var(--col-yellow);color:#000;
      transition:opacity 0.15s;
    `;
    btnOk.addEventListener('mouseenter', () => btnOk.style.opacity = '0.85');
    btnOk.addEventListener('mouseleave', () => btnOk.style.opacity = '1');
    btnOk.addEventListener('click', () => {
      const nombre = (input.value.trim().replace(/[^a-zA-Z0-9_\-áéíóúüñÁÉÍÓÚÜÑ ]/g, '_').replace(/\s+/g, '_')) || 'EXPORT';
      overlay.remove();
      _exportMockupBlob(formatName, nombre);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') btnOk.click();
      if (e.key === 'Escape') overlay.remove();
    });

    btnRow.appendChild(btnCancel);
    btnRow.appendChild(btnOk);
    body.appendChild(desc);
    body.appendChild(inputWrap);
    body.appendChild(previewName);
    body.appendChild(btnRow);
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => { input.focus(); input.select(); }, 50);
  }

  async function _exportMockupBlob(formatName, baseName) {
    const progress = _showProgress(1);
    progress.update(1, formatName);

    _imgCache = new Map();
    try {
      const cv = await _renderMockupCanvas(formatName);
      if (!cv) { progress.close(); alert('No se pudo generar el mockup.'); return; }

      // JPG hasta 5MB (mockups son sólo visualización, no entrega final)
      const blob = await _jpgWithMaxSize(cv, 5);
      progress.close();
      if (!blob) { alert('No se pudo codificar el JPG del mockup.'); return; }

      const cfg = FORMAT_CONFIG[formatName] || { suffix: formatName.replace(/\s+/g, '_') };
      const filename = `${baseName}_${cfg.suffix}_MOCKUP.jpg`;
      const url = URL.createObjectURL(blob);
      const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      progress.close();
      console.error('[Export] Error generando mockup:', err);
      alert('Error generando mockup: ' + (err?.message || err));
    } finally {
      _imgCache = null;
    }
  }

  return {
    init,
    exportAll: _showExportModal,
    isMockupFormat,
    isPngFormat: (name) => FORMAT_CONFIG[name]?.type === 'png',
    generateMockup: _showMockupModal,
  };
})();
