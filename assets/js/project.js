// ============================================================
// PROJECT.JS — Guardar y abrir proyecto
// ============================================================

const Project = (() => {

  const VERSION = 2;

  // ── BOTONES ───────────────────────────────────────────────

  function init() {
    document.getElementById('btn-save-project')
      ?.addEventListener('click', _showSaveModal);
    document.getElementById('btn-open-project')
      ?.addEventListener('click', open);
  }

  // ── MODAL DE GUARDADO ─────────────────────────────────────

  function _showSaveModal() {
    document.getElementById('project-save-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'project-save-modal';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.75);
      z-index:99000;display:flex;align-items:center;justify-content:center;
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.style.cssText = `
      background:#161616;border:1px solid #2e2e2e;border-radius:4px;
      width:360px;padding:0;overflow:hidden;
      box-shadow:0 16px 48px rgba(0,0,0,0.7);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding:14px 16px;background:#111;border-bottom:1px solid #2e2e2e;
      font-family:var(--font);font-size:13px;font-weight:700;
      letter-spacing:0.12em;text-transform:uppercase;color:var(--col-yellow);
    `;
    header.textContent = 'GUARDAR PROYECTO';

    const body = document.createElement('div');
    body.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:8px;';

    const desc = document.createElement('p');
    desc.style.cssText = `
      font-family:var(--font);font-size:11px;color:#777;
      margin:0 0 8px;line-height:1.5;
    `;
    desc.textContent = 'Elige cómo quieres guardar el proyecto:';

    const btnZip = _makeModalBtn(
      'Guardar todo el proyecto',
      'ZIP con imágenes + configuración',
      () => { overlay.remove(); _saveZip(); }
    );
    const btnJson = _makeModalBtn(
      'Guardar configuración',
      'Solo el JSON (mismas imágenes, distinta config)',
      () => { overlay.remove(); _saveJson(); }
    );
    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'CANCELAR';
    btnCancel.style.cssText = `
      margin-top:4px;height:26px;padding:0 16px;border-radius:2px;
      font-family:var(--font);font-size:10px;font-weight:700;
      letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;
      background:transparent;border:1px solid #444;color:#777;
      transition:color 0.15s,border-color 0.15s;align-self:flex-end;
    `;
    btnCancel.addEventListener('mouseenter', () => { btnCancel.style.color='#ccc'; btnCancel.style.borderColor='#666'; });
    btnCancel.addEventListener('mouseleave', () => { btnCancel.style.color='#777'; btnCancel.style.borderColor='#444'; });
    btnCancel.addEventListener('click', () => overlay.remove());

    body.appendChild(desc);
    body.appendChild(btnZip);
    body.appendChild(btnJson);
    body.appendChild(btnCancel);
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function _makeModalBtn(title, subtitle, onClick) {
    const btn = document.createElement('div');
    btn.style.cssText = `
      padding:12px 14px;background:#1e1e1e;border:1px solid #2e2e2e;
      border-radius:3px;cursor:pointer;transition:border-color 0.12s,background 0.12s;
    `;
    const t = document.createElement('div');
    t.style.cssText = 'font-family:var(--font);font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ccc;';
    t.textContent = title;
    const s = document.createElement('div');
    s.style.cssText = 'font-family:var(--font);font-size:10px;color:#555;margin-top:3px;';
    s.textContent = subtitle;
    btn.appendChild(t);
    btn.appendChild(s);
    btn.addEventListener('mouseenter', () => { btn.style.background='#252525'; btn.style.borderColor='#444'; });
    btn.addEventListener('mouseleave', () => { btn.style.background='#1e1e1e'; btn.style.borderColor='#2e2e2e'; });
    btn.addEventListener('click', onClick);
    return btn;
  }

  // ── SERIALIZAR ESTADO ─────────────────────────────────────

  function _serializeState(includeImages) {
    const compLayer = State.layers.find(l => l.isComposicion);
    const composicionParams = compLayer ? _extractCompParams(compLayer.id) : null;

    // Preservar orden exacto, excluir composicion
    const layers = State.layers
      .filter(l => !l.isComposicion)
      .map(layer => {
        const l = { ...layer, params: { ...layer.params } };
        if (!l.src) return l;

        // Logos: guardar solo la ruta, no el dataURL
        if (l.isLogo) {
          l.srcType = 'path';
          l.src     = l.logoPath;
          return l;
        }

        // Capas sin dataURL: solo guardar referencia
        if (!l.src.startsWith('data:')) {
          l.srcType = 'path';
          return l;
        }

        // Imágenes importadas (dataURL)
        l.srcType = 'data';
        // Usar nombre original del archivo
        l.srcFilename = l.originalFilename || (_sanitizeFilename(l.name) + '.' + _mimeToExt(l.originalMimeType));

        if (!includeImages) delete l.src;

        return l;
      });

    return {
      version:           VERSION,
      projectName:       State.projectName || 'Sin título',
      activeModality:    State.activeModality,
      activeFormat:      State.activeFormat,
      formatOk:          State.formatOk     || {},
      formatParams:      State.formatParams || {},
      composicionParams,
      composicionId:     compLayer?.id || null,
      pastilla:          typeof Pastilla !== 'undefined' ? Pastilla.serialize() : null,
      layers,
    };
  }

  function _extractCompParams(compId) {
    const result = {};
    Object.entries(State.formatParams || {}).forEach(([fid, params]) => {
      if (params[compId]) result[fid] = { ...params[compId] };
    });
    return result;
  }

  function _mimeToExt(mime) {
    const map = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
    return map[mime] || 'png';
  }

  // ── GUARDAR ZIP ───────────────────────────────────────────

  async function _saveZip() {
    if (typeof JSZip === 'undefined') {
      alert('JSZip no está cargado. Asegúrate de incluir assets/js/jszip.min.js');
      return;
    }

    const zip       = new JSZip();
    const data      = _serializeState(true);
    const imgFolder = zip.folder('imagenes');
    const projectName = State.projectName || 'proyecto';

    for (const layer of data.layers) {
      if (layer.srcType === 'data' && layer.src && layer.srcFilename) {
        const parts    = layer.src.split(',');
        const mime     = layer.originalMimeType || 'image/png';
        const base64   = parts[1];
        imgFolder.file(layer.srcFilename, base64, { base64: true });
      }
    }

    // JSON con el nombre del proyecto
    zip.file(projectName + '.json', JSON.stringify(data, null, 2));

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    _download(blob, projectName + '.adaptator.zip', 'application/zip');
  }

  // ── GUARDAR JSON ──────────────────────────────────────────

  function _saveJson() {
    const data = _serializeState(true); // siempre incluir dataURLs
    const projectName = State.projectName || 'proyecto';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    _download(blob, projectName + '.adaptator.json', 'application/json');
  }

  // ── ABRIR PROYECTO ────────────────────────────────────────

  function open() {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.zip,.json,.adaptator.json,.adaptator.zip';
    input.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.name.endsWith('.zip')) {
        await _loadZip(file);
      } else {
        await _loadJson(file);
      }
    });
    input.click();
  }

  // ── CARGAR ZIP ────────────────────────────────────────────

  async function _loadZip(file) {
    if (typeof JSZip === 'undefined') {
      alert('JSZip no está cargado.');
      return;
    }
    const zip  = await JSZip.loadAsync(file);
    const jsonFile = zip.file('proyecto.json');
    if (!jsonFile) { alert('ZIP inválido: no contiene proyecto.json'); return; }

    const data = JSON.parse(await jsonFile.async('string'));

    // Restaurar imágenes desde el ZIP
    for (const layer of data.layers) {
      if (layer.srcType === 'data' && layer.srcFilename) {
        const imgFile = zip.file('imagenes/' + layer.srcFilename);
        if (imgFile) {
          const b64 = await imgFile.async('base64');
          layer.src = 'data:image/png;base64,' + b64;
        }
      }
      // Logos (srcType === 'path'): layer.src ya está como ruta relativa
    }

    _applyState(data);
  }

  // ── CARGAR JSON ───────────────────────────────────────────

  async function _loadJson(file) {
    const data = JSON.parse(await file.text());
    _applyState(data);
  }

  // ── APLICAR ESTADO ────────────────────────────────────────

  function _applyState(data) {
    State.projectName    = data.projectName    ?? 'Sin título';
    State.activeModality = data.activeModality ?? null;
    State.activeFormat   = data.activeFormat   ?? null;
    State.formatOk       = data.formatOk       ?? {};
    State.formatParams   = data.formatParams   ?? {};
    State.dirty          = false;

    // Restaurar pastilla
    if (typeof Pastilla !== 'undefined') Pastilla.restore(data.pastilla);

    // Cargar capas en orden exacto guardado, sin composicion
    State.layers = (data.layers ?? []).filter(l => !l.isComposicion);

    // Logos: reconvertir a dataURL para que el tint (mask-image) funcione
    const logoPromises = State.layers.filter(l => l.isLogo && l.logoPath).map(layer => {
      return new Promise(res => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const cv = document.createElement('canvas');
          cv.width  = img.naturalWidth  || 200;
          cv.height = img.naturalHeight || 200;
          cv.getContext('2d').drawImage(img, 0, 0);
          try { layer.src = cv.toDataURL('image/png'); } catch(e) { layer.src = layer.logoPath; }
          res();
        };
        img.onerror = () => { layer.src = layer.logoPath; res(); };
        img.src = layer.logoPath;
      });
    });
    Promise.all(logoPromises).then(() => {
      if (typeof Canvas !== 'undefined') Canvas.render();
    });

    // Restaurar visual del selector de modalidad
    if (State.activeModality) {
      const optionsEl = document.getElementById('modality-options');
      const valueEl   = document.getElementById('modality-value');
      if (optionsEl && valueEl) {
        const opt = optionsEl.querySelector(`[data-id="${State.activeModality}"]`);
        if (opt) {
          optionsEl.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          valueEl.textContent = opt.textContent;
        }
      }
    }

    if (typeof Formats !== 'undefined') Formats.setActiveFormat(State.activeFormat);
    if (typeof Layers  !== 'undefined') Layers.render();
    if (typeof Canvas  !== 'undefined') Canvas.render();
    if (typeof UI      !== 'undefined') UI.updateSliders();

    // Pre-insertar composición con el ID y params guardados
    // así generate() la encuentra ya existente y no resetea sus params
    if (data.composicionParams && data.composicionId) {
      const comp = {
        id:            data.composicionId,
        name:          'COMPOSICIÓN TÍTULO',
        isComposicion: true,
        visible:       true,
        naturalWidth:  0,
        naturalHeight: 0,
        params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0 },
      };
      State.layers.unshift(comp);
      // Restaurar sus formatParams con el ID guardado
      Object.entries(data.composicionParams).forEach(([fid, p]) => {
        if (!State.formatParams[fid]) State.formatParams[fid] = {};
        State.formatParams[fid][comp.id] = { ...p };
      });
    }

    if (typeof Composicion !== 'undefined') Composicion.generate();
  }

  // ── HELPERS ───────────────────────────────────────────────

  function _sanitizeFilename(name) {
    return (name || 'imagen').replace(/[^a-zA-Z0-9_\-áéíóúüñÁÉÍÓÚÜÑ]/g, '_').slice(0, 40);
  }

  function _download(blob, filename, type) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }

  return { init, save: _showSaveModal, open };
})();
