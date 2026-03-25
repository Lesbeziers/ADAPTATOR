// ============================================================
// EXPORT.JS — Exportar imágenes en ZIP (render offscreen por formato)
// ============================================================

const Export = (() => {

  // ── CONFIGURACIÓN DE FORMATOS ─────────────────────────────

  const FORMAT_CONFIG = {
    '199 PUBLI':       { suffix: '199_PUBLI',                  type: 'jpg', maxMB: 4    },
    'AD PAUSE':        { suffix: 'AD_PAUSE',                   type: 'jpg', maxMB: 0.1  },
    'APPLE TV':        { suffix: 'APPLETV',                    type: 'jpg', maxMB: 1    },
    'FANART DEST':     { suffix: 'FANART_DESTACADO',           type: 'jpg', maxMB: 1.5  },
    'IPLUS PUBLI':     { suffix: 'IPLUS_PUBLI',                type: 'jpg', maxMB: 0.15 },
    'MOD DEST 1':      { suffix: 'MOD_DESTACADO1',             type: 'jpg', maxMB: 1    },
    'MOD DEST 1 SIL':  { suffix: 'MOD_DESTACADO1_SIL',         type: 'png', maxMB: 1    },
    'MOD DEST 2':      { suffix: 'MOD_DESTACADOS2',            type: 'jpg', maxMB: 1    },
    'MOD DEST 2 SIL':  { suffix: 'MOD_DESTACADOS2_SIL',        type: 'png', maxMB: 1    },
    'MOD DEST 3':      { suffix: 'MOD_DESTACADO3',             type: 'jpg', maxMB: 1    },
    'MOD DEST 3 SIL':  { suffix: 'MOD_DESTACADO3_SIL',         type: 'png', maxMB: 1    },
    'MUX4 FONDO':      { suffix: 'MUX4_FONDO_PUBLI',           type: 'jpg', maxMB: 1.5  },
    'MUX4 TXT':        { suffix: 'MUX4_TXT_PUBLI',             type: 'png', maxMB: 0.6  },
    'MOVIL MUX FONDO': { suffix: 'SMARTPHONE_MUX_FONDO_PUBLI', type: 'jpg', maxMB: 1.5  },
    'MOVIL TXT':       { suffix: 'SMARTPHONE_MUX_TXT_PUBLI',   type: 'png', maxMB: 0.6  },
    'WEB PUBLI':       { suffix: 'WEB_PUBLI',                  type: 'jpg', maxMB: 1    },
    'WOW PUBLI':       { suffix: 'WOW_PUBLI',                  type: 'jpg', maxMB: 0.25 },
  };

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
      const nombre = input.value.trim().replace(/[^a-zA-Z0-9_\-áéíóúüñÁÉÍÓÚÜÑ ]/g, '_') || 'EXPORT';
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

    for (let i = 0; i < okFormats.length; i++) {
      const formatName = okFormats[i];
      progress.update(i + 1, formatName);

      const cfg = FORMAT_CONFIG[formatName];
      if (!cfg) {
        warnings.push(`${formatName}: sin configuración, omitido.`);
        continue;
      }

      const blob = await _renderFormat(formatName, cfg);
      if (!blob) continue;

      const sizeMB = blob.size / (1024 * 1024);
      const filename = `${nombre}_${cfg.suffix}.${cfg.type}`;

      if (cfg.type === 'png' && sizeMB > cfg.maxMB) {
        warnings.push(`⚠️ ${formatName}: ${sizeMB.toFixed(2)}MB supera el límite de ${cfg.maxMB}MB (exportado igualmente)`);
      }

      const arrayBuf = await blob.arrayBuffer();
      zip.file(filename, arrayBuf);
    }

    progress.close();

    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(zipBlob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: `${nombre}_EXPORT.zip` });
    a.click();
    URL.revokeObjectURL(url);

    if (warnings.length > 0) {
      setTimeout(() => alert('Export completado con avisos:\n\n' + warnings.join('\n')), 300);
    }
  }

  // ── RENDER DE UN FORMATO ──────────────────────────────────

  async function _renderFormat(formatName, cfg) {
    const size = State.formatSizes[formatName];
    if (!size) return null;

    const W = size.w;
    const H = size.h;
    const cv  = document.createElement('canvas');
    cv.width  = W;
    cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    await document.fonts.ready;

    const layers = [...State.layers].reverse();
    for (const layer of layers) {
      if (layer.isMarcaIplus) continue;
      if (!_isLayerVisible(layer, formatName)) continue;
      await _drawLayer(ctx, layer, formatName, W, H);
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

    const marca = State.layers.find(l => l.isMarcaIplus);
    if (marca && formatName === 'IPLUS PUBLI') {
      await _drawLayer(ctx, marca, formatName, W, H);
    }

    if (cfg.type === 'png') {
      return await new Promise(res => cv.toBlob(res, 'image/png'));
    }

    return await _jpgWithMaxSize(cv, cfg.maxMB);
  }

  // ── JPG QUALITY BINARY SEARCH ─────────────────────────────

  async function _jpgWithMaxSize(cv, maxMB) {
    const maxBytes = maxMB * 1024 * 1024;
    let blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.92));
    if (blob && blob.size <= maxBytes) return blob;
    let lo = 0.1, hi = 0.92, best = blob;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      const b   = await new Promise(res => cv.toBlob(res, 'image/jpeg', mid));
      if (!b) break;
      if (b.size <= maxBytes) { best = b; lo = mid; }
      else                    { hi = mid; }
    }
    return best;
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
        if (infoEl) infoEl.textContent = `${n} / ${total} — ${name}`;
        if (fillEl) fillEl.style.width = `${(n / total) * 100}%`;
      },
      close: () => setTimeout(() => document.getElementById('export-progress')?.remove(), 800),
    };
  }

  // ── VISIBILIDAD ───────────────────────────────────────────

  function _isLayerVisible(layer, formatName) {
    if (layer.isTitleLayer) {
      return formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT';
    }
    if (layer.isComposicion) {
      if (formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT' || formatName === 'MUX4 FONDO' || formatName === 'MOVIL MUX FONDO') return false;
      const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
      return fmtVisible !== undefined ? fmtVisible : true;
    }
    if (layer.isComposicionMovil) return false;
    if (layer.isMarcaIplus) return formatName === 'IPLUS PUBLI';
    if (layer.exclusiveFormat) return layer.exclusiveFormat === formatName;
    if (formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT') return false;
    const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
    return fmtVisible !== undefined ? fmtVisible : layer.visible !== false;
  }

  // ── DIBUJAR CAPA ──────────────────────────────────────────

  async function _drawLayer(ctx, layer, formatName, W, H) {
    const p   = State.formatParams?.[formatName]?.[layer.id] || {};
    const sx  = (p.scaleX  ?? 100) / 100;
    const sy  = (p.scaleY  ?? 100) / 100;
    const rot = ((p.rotation ?? 0) * Math.PI) / 180;
    const op  = (layer.params?.opacity ?? 100) / 100;

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
      await _drawImage(ctx, compSrc, posX, posY, drawW, drawH);
      ctx.restore();
      return;
    }

    const cx = W / 2 + (p.x ?? 0);
    const cy = H / 2 + (p.y ?? 0);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, op));

    const filters = [];
    const g = layer.params || {};
    if (g.blur       > 0)   filters.push(`blur(${g.blur}px)`);
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
      if (gp.type === 'radial') {
        grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(gw, gh) / 2);
      } else {
        const ang = ((gp.angle - 90) * Math.PI) / 180;
        const dx  = Math.cos(ang) * gw / 2;
        const dy  = Math.sin(ang) * gh / 2;
        grad = ctx.createLinearGradient(-dx, -dy, dx, dy);
      }
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.fillRect(-gw/2, -gh/2, gw, gh);

    } else if (layer.type === 'text' && layer.textParams) {
      const tp    = layer.textParams;
      const sz    = tp.size || 48;
      const wt    = String(tp.weight || '400').replace('italic', '').trim();
      const st    = String(tp.weight || '').includes('italic') || tp.style === 'italic' ? 'italic' : 'normal';
      const fam   = tp.family || 'Apercu Movistar';
      const align = tp.align  || 'left';
      const lineH = sz * 1.2;
      const lines = (tp.content || '').split('\n');
      const N     = lines.length;
      ctx.scale(sx, sy);
      ctx.font         = `${st} ${wt} ${sz}px '${fam}', Arial, sans-serif`;
      ctx.fillStyle    = tp.color || '#ffffff';
      ctx.textBaseline = 'middle';
      const lineWidths = lines.map(l => ctx.measureText(l).width);
      const textW      = Math.max(...lineWidths);
      lines.forEach((line, i) => {
        const lineY   = (i - (N - 1) / 2) * lineH + sz * 0.06;
        const lw      = lineWidths[i];
        const xOffset = align === 'center' ? -lw / 2 : align === 'right' ? textW / 2 - lw : -textW / 2;
        ctx.fillText(line, xOffset, lineY);
      });

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
        await _drawImage(tctx, layer.src, -iw/2, -ih/2, iw, ih);
        tctx.globalCompositeOperation = 'source-atop';
        tctx.globalAlpha = layer.params.tintAmount / 100;
        tctx.fillStyle   = layer.params.tintColor || '#000000';
        tctx.fillRect(-iw/2, -ih/2, iw, ih);
        tctx.restore();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = op;
        if (filters.length) ctx.filter = filters.join(' ');
        ctx.drawImage(tmp, 0, 0, W, H, 0, 0, W, H);
      } else {
        await _drawImage(ctx, layer.src, -iw/2, -ih/2, iw, ih);
      }
    }

    ctx.restore();
  }

  // ── HELPERS ───────────────────────────────────────────────

  function _drawImage(ctx, src, x, y, w, h) {
    return new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => { ctx.drawImage(img, x, y, w, h); res(); };
      img.onerror = () => res();
      img.src = src;
    });
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

  return { init };
})();
