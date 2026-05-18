// ============================================================
// PROJECT.JS — Guardar y abrir proyecto
// ============================================================

const Project = (() => {

  const VERSION = 2;

  // ── BOTONES ───────────────────────────────────────────────
  // Los listeners de los botones reales (#btn-abrir, #btn-guardar) viven
  // en ui.js y llaman a Project.open() / Project.save() vía la API expuesta.

  function init() { /* no-op: bindings reales en ui.js */ }

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

    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = `
      font-family:var(--font);font-size:10px;font-weight:700;
      letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-bottom:2px;
    `;
    nameLabel.textContent = 'Nombre del archivo';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = State.projectName || 'proyecto';
    nameInput.style.cssText = `
      width:100%;box-sizing:border-box;padding:8px 10px;margin-bottom:6px;
      background:#1e1e1e;border:1px solid #2e2e2e;border-radius:3px;
      font-family:var(--font);font-size:12px;color:#ddd;outline:none;
    `;
    nameInput.addEventListener('focus', () => { nameInput.style.borderColor = '#555'; });
    nameInput.addEventListener('blur',  () => { nameInput.style.borderColor = '#2e2e2e'; });
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); btnZip.click(); }
      if (e.key === 'Escape') { e.preventDefault(); overlay.remove(); }
    });
    setTimeout(() => { nameInput.focus(); nameInput.select(); }, 0);

    const _getName = () => _sanitizeFilename(nameInput.value.trim()) || 'proyecto';

    const btnZip = _makeModalBtn(
      'Guardar todo el proyecto',
      'ZIP con imágenes + configuración',
      () => { overlay.remove(); _saveZip(_getName()); }
    );
    const btnJson = _makeModalBtn(
      'Guardar configuración',
      'Solo el JSON (mismas imágenes, distinta config)',
      () => { overlay.remove(); _saveJson(_getName()); }
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
    body.appendChild(nameLabel);
    body.appendChild(nameInput);
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

    // Preservar orden exacto, excluir composicion, composicionMovil, marcas y MOLDURA (auto-generadas)
    const layers = State.layers
      .filter(l => !l.isComposicion && !l.isComposicionMovil && !l.isComposicionAmazon && !l.isMarcaIplus && !l.isMarcaSony && !l.isMolduraFanart && !l.isMascaraBlur)
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
      formatOk:          State.formatOk          || {},
      formatParams:      State.formatParams       || {},
      formatMaskEnabled: State.formatMaskEnabled  || {},
      systemVisibility:  State.systemVisibility   || {},
      overlays:          State.overlays           ? { ...State.overlays } : null,
      layerRoles:        State.layerRoles         ? { ...State.layerRoles } : {},
      composicionParams,
      composicionId:     compLayer?.id || null,
      pastilla:          typeof Pastilla !== 'undefined' ? Pastilla.serialize() : null,
      pastillaFreemium:  typeof Pastilla !== 'undefined' ? Pastilla.serializeFreemium() : null,
      layout:            typeof Layout   !== 'undefined' ? Layout.serialize()   : null,
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

  async function _saveZip(filename) {
    if (typeof JSZip === 'undefined') {
      alert('JSZip no está cargado. Asegúrate de incluir assets/js/jszip.min.js');
      return;
    }

    try {
      const zip       = new JSZip();
      const data      = _serializeState(true);
      const imgFolder = zip.folder('imagenes');
      const baseName  = _sanitizeFilename(filename) || _sanitizeFilename(State.projectName) || 'proyecto';

      for (const layer of data.layers) {
        if (layer.srcType === 'data' && layer.src && layer.srcFilename) {
          try {
            const blob = await (await fetch(layer.src)).blob();
            imgFolder.file(layer.srcFilename, blob);
          } catch (e) {
            console.warn('[Project] No se pudo añadir al ZIP:', layer.srcFilename, e);
          }
        }
      }

      // El JSON dentro del ZIP usa el mismo nombre que el archivo descargado.
      // La carga lo localiza por el primer .json en la raíz del ZIP.
      zip.file(baseName + '.json', JSON.stringify(data, null, 2));

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      _download(blob, baseName + '.adaptator.zip', 'application/zip');
    } catch (err) {
      console.error('[Project] Error al guardar ZIP:', err);
      alert('No se ha podido guardar el ZIP del proyecto.\n\n' + (err?.message || err));
    }
  }

  // ── GUARDAR JSON ──────────────────────────────────────────

  function _saveJson(filename) {
    try {
      const data = _serializeState(true); // siempre incluir dataURLs
      const baseName = _sanitizeFilename(filename) || _sanitizeFilename(State.projectName) || 'proyecto';
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      _download(blob, baseName + '.adaptator.json', 'application/json');
    } catch (err) {
      console.error('[Project] Error al guardar JSON:', err);
      alert('No se ha podido guardar el JSON del proyecto.\n\n' + (err?.message || err));
    }
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

    let zip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (err) {
      console.error('[Project] ZIP corrupto:', err);
      alert('No se ha podido leer el ZIP. El archivo puede estar corrupto.');
      return;
    }

    // Localizar el JSON del proyecto en la raíz del ZIP. Aceptamos tanto el
    // nombre estable 'proyecto.json' (formato actual) como cualquier .json en
    // raíz (proyectos guardados antes con ${projectName}.json).
    const rootJsonFiles = zip.file(/\.json$/i).filter(f => !f.name.includes('/'));
    const jsonFile = zip.file('proyecto.json') || rootJsonFiles[0] || null;
    if (!jsonFile) { alert('ZIP inválido: no contiene un .json de proyecto.'); return; }

    let data;
    try {
      data = JSON.parse(await jsonFile.async('string'));
    } catch (err) {
      console.error('[Project] JSON malformado:', err);
      alert('El archivo de proyecto contiene un JSON inválido.');
      return;
    }

    // Restaurar imágenes desde el ZIP usando el MIME real (no asumimos PNG)
    for (const layer of (data.layers || [])) {
      if (layer.srcType === 'data' && layer.srcFilename) {
        const imgFile = zip.file('imagenes/' + layer.srcFilename);
        if (imgFile) {
          const b64  = await imgFile.async('base64');
          const mime = layer.originalMimeType || _extToMime(layer.srcFilename);
          layer.src = `data:${mime};base64,${b64}`;
        }
      }
      // Logos (srcType === 'path'): layer.src ya está como ruta relativa
    }

    _applyState(data);
  }

  // ── CARGAR JSON ───────────────────────────────────────────

  async function _loadJson(file) {
    let text;
    try {
      text = await file.text();
    } catch (err) {
      console.error('[Project] No se pudo leer el archivo:', err);
      alert('No se ha podido leer el archivo de proyecto.');
      return;
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error('[Project] JSON malformado:', err);
      alert('El archivo no es un JSON de proyecto válido.');
      return;
    }
    _applyState(data);
  }

  function _extToMime(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
    return map[ext] || 'image/png';
  }

  // ── APLICAR ESTADO ────────────────────────────────────────

  function _applyState(data) {
    if (!data || typeof data !== 'object') {
      alert('El archivo no contiene datos de proyecto válidos.');
      return;
    }

    // Versionado: si el archivo viene con una versión superior a la que conoce
    // este editor, avisamos antes de continuar (puede faltar/sobrar info).
    const fileVersion = Number(data.version) || 1;
    if (fileVersion > VERSION) {
      const seguir = confirm(
        `Este proyecto fue guardado con una versión más reciente (v${fileVersion}) ` +
        `que el editor actual (v${VERSION}). Es posible que algunos datos no se ` +
        `restauren correctamente. ¿Quieres continuar de todos modos?`
      );
      if (!seguir) return;
    }

    // ── Estado base ──────────────────────────────────────────
    State.projectName    = data.projectName    ?? 'Sin título';
    State.activeModality = data.activeModality ?? null;
    State.activeFormat   = data.activeFormat   ?? null;
    State.formatOk       = data.formatOk       ?? {};
    State.formatParams   = data.formatParams   ?? {};
    State.formatMaskEnabled = data.formatMaskEnabled ?? {};

    // ── Reset de campos que NO deben heredarse del proyecto previo ──
    // Selección, origins de multi-drag y roles que no estén en el archivo.
    State.selectedLayerId  = null;
    State.selectedLayerIds = [];
    State._multiOrigins    = {};
    State.layerRoles       = data.layerRoles       ?? {};
    State.systemVisibility = data.systemVisibility ?? {};
    State.overlays         = data.overlays         ?? { mockup: true, txt: true, foco: false };
    State.dirty            = false;

    // Restaurar pastilla
    if (typeof Pastilla !== 'undefined') {
      Pastilla.restore(data.pastilla);
      Pastilla.restoreFreemium(data.pastillaFreemium);
    }

    // Restaurar maquetación automática
    if (typeof Layout !== 'undefined') Layout.restore(data.layout);

    // Cargar capas en orden exacto guardado, sin composicion ni capas auto-generadas
    State.layers = (data.layers ?? []).filter(l => !l.isComposicion && !l.isComposicionMovil && !l.isComposicionAmazon && !l.isMarcaIplus && !l.isMarcaSony && !l.isMolduraFanart && !l.isMascaraBlur);
    // Limpiar src corruptos guardados como string "undefined"
    State.layers.forEach(l => { if (l.src === 'undefined') l.src = null; });

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

    // Pre-cargar el resto de imágenes: así, cuando el Canvas las inserte en el
    // DOM con el mismo src, el navegador las sirve de caché y naturalWidth/Height
    // están disponibles inmediatamente. Esto sustituye al antiguo setTimeout(300)
    // que era frágil con imágenes pesadas o redes lentas.
    const otherImgPromises = State.layers
      .filter(l => !l.isLogo && l.src && typeof l.src === 'string')
      .map(layer => new Promise(res => {
        const img = new Image();
        img.onload  = () => res();
        img.onerror = () => res(); // resolvemos siempre para no bloquear la carga
        img.src = layer.src;
      }));

    Promise.all([...logoPromises, ...otherImgPromises]).then(() => {
      // Re-inicializar capas auto-generadas que no se guardan en el JSON
      if (typeof Canvas !== 'undefined') {
        Canvas.reinitAutoLayers();
        Canvas.render();
      }
      // Regenerar composiciones — ya no necesitamos setTimeout porque las
      // imágenes están todas pre-cargadas (naturalWidth/Height ya disponibles).
      const fmt = State.activeFormat;
      if (typeof Composicion !== 'undefined' && (fmt === 'MUX4 TXT' || fmt === 'MUX4 FONDO')) Composicion.generate();
      if (typeof ComposicionMovil !== 'undefined' && (fmt === 'MOVIL TXT' || fmt === 'MOVIL MUX FONDO')) ComposicionMovil.generate();
      if (typeof ComposicionAmazon !== 'undefined' && (fmt === 'AMAZON LOGO' || fmt === 'AMAZON BG')) ComposicionAmazon.generate();
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

    // Invalidar caché de capas de sistema para forzar redibujo con el proyecto nuevo
    if (typeof SystemLayers !== 'undefined' && typeof SystemLayers.invalidate === 'function') {
      SystemLayers.invalidate();
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
