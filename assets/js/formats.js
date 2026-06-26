// ============================================================
// FORMATS.JS — Gestión de modalidades, formatos y parámetros
// ============================================================

const Formats = (() => {

  function init() {
    _buildDropdown();
    _bindDropdown();
  }

  // ── DROPDOWN CUSTOM ───────────────────────────────────────

  function _buildDropdown() {
    const optionsEl = document.getElementById('modality-options');
    if (!optionsEl) return;
    optionsEl.innerHTML = '';

    State.modalities.forEach(m => {
      const opt = document.createElement('div');
      opt.className = 'custom-select-option' + (m.id === 'selecciona' ? ' placeholder' : '');
      opt.textContent = m.label;
      opt.dataset.id = m.id;
      optionsEl.appendChild(opt);
    });
  }

  function _bindDropdown() {
    const dropdown  = document.getElementById('modality-dropdown');
    const trigger   = dropdown?.querySelector('.custom-select-trigger');
    const optionsEl = document.getElementById('modality-options');
    const valueEl   = document.getElementById('modality-value');
    if (!dropdown || !trigger || !optionsEl) return;

    // Abrir/cerrar
    trigger.addEventListener('click', () => {
      dropdown.classList.toggle('open');
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    });

    // Seleccionar opción
    optionsEl.addEventListener('click', e => {
      const opt = e.target.closest('.custom-select-option');
      if (!opt || opt.classList.contains('placeholder')) return;

      const id = opt.dataset.id;
      // Actualizar visual
      optionsEl.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      valueEl.textContent = opt.textContent;
      dropdown.classList.remove('open');

      // Actualizar estado
      State.activeModality = id;
      State.activeFormat   = null;
      _renderFormatGrid();

      // Activar el primer formato de la nueva modalidad
      const modality = State.modalities.find(m => m.id === id);
      if (modality?.formats?.length > 0) {
        setActiveFormat(modality.formats[0]);
      }
    });
  }

  // ── GRID DE FORMATOS ──────────────────────────────────────

  // ── ETIQUETAS VISIBLES ────────────────────────────────────
  // Nombre que ve el usuario. La clave INTERNA del formato no cambia (evita romper refs).
  const DISPLAY_LABELS = { 'MOVIL TXT': 'Smartphone TEXT', 'MUX4 TXT': 'MUX4 TEXT' };
  function displayLabel(name) { return DISPLAY_LABELS[name] || name; }

  function _renderFormatGrid() {
    const grid = document.getElementById('formats-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!State.activeModality) return;

    const modality = State.modalities.find(m => m.id === State.activeModality);
    if (!modality) return;

    // Los 4 maestros de texto se muestran anchos (2 por fila → rejilla 2×2 en "Textos")
    const WIDE_FORMATS = ['TEXTO HORIZONTAL', 'TEXTO VERTICAL', 'MUX4 TXT', 'MOVIL TXT'];

    modality.formats.forEach(formatName => {
      const btn = document.createElement('button');
      btn.className = 'btn-format';
      if (WIDE_FORMATS.includes(formatName)) btn.classList.add('btn-format--wide');
      btn.textContent = displayLabel(formatName);
      btn.dataset.format = formatName;
      if (State.activeFormat === formatName) btn.classList.add('active');
      if (State.formatOk[formatName])        btn.classList.add('done');
      btn.addEventListener('click', () => setActiveFormat(formatName));
      grid.appendChild(btn);
    });
  }

  // ── FORMATO ACTIVO ────────────────────────────────────────

  function setActiveFormat(formatName) {
    const previous = State.activeFormat;
    State.activeFormat = formatName;

    // Sincronizar modalidad — buscar a qué modalidad pertenece el formato
    const targetModality = State.modalities.find(m => m.formats?.includes(formatName));
    if (targetModality && targetModality.id !== State.activeModality && targetModality.id !== 'selecciona') {
      State.activeModality = targetModality.id;
      // Actualizar el selector de modalidad en el panel
      const valueEl   = document.getElementById('modality-value');
      const optionsEl = document.getElementById('modality-options');
      if (valueEl) valueEl.textContent = targetModality.label;
      if (optionsEl) {
        // Usar la clase real que crea _buildDropdown — antes apuntaba a una
        // clase inexistente (.modality-option) y el highlight nunca cambiaba.
        optionsEl.querySelectorAll('.custom-select-option').forEach(opt => {
          opt.classList.toggle('selected', opt.dataset.id === targetModality.id);
        });
      }
    }

    if (typeof GradientLayers !== 'undefined') GradientLayers.stopPickMode();
    if (typeof SystemLayers   !== 'undefined') SystemLayers.invalidate();
    if (typeof Layout         !== 'undefined') Layout.onFormatActivated(formatName);

    _renderFormatGrid();

    // Al salir de MUX4 TXT, generar la composición título
    if (previous === 'MUX4 TXT' && formatName !== 'MUX4 TXT') {
      if (typeof Composicion !== 'undefined') Composicion.generate();
    }

    // Al salir de MOVIL TXT, generar la composición móvil
    if (previous === 'MOVIL TXT' && formatName !== 'MOVIL TXT') {
      if (typeof ComposicionMovil !== 'undefined') ComposicionMovil.generate();
    }

    // Al salir de AMAZON LOGO, generar la composición Amazon
    if (previous === 'AMAZON LOGO' && formatName !== 'AMAZON LOGO') {
      if (typeof ComposicionAmazon !== 'undefined') ComposicionAmazon.generate();
    }

    // Al salir de TEXTO HORIZONTAL, generar su composición y reposicionarla en los formatos H
    if (previous === 'TEXTO HORIZONTAL' && formatName !== 'TEXTO HORIZONTAL') {
      if (typeof ComposicionTexto !== 'undefined') {
        ComposicionTexto.generate('TEXTO HORIZONTAL', 'COMPOSICIÓN TEXTO HORIZONTAL', 'isComposicionTextoH').then(() => {
          const comp = State.layers.find(l => l.isComposicionTextoH);
          if (comp && typeof AutoLayout !== 'undefined') AutoLayout.repositionTextComp(comp, 'H');
          if (typeof Canvas !== 'undefined') Canvas.render();
        });
      }
    }

    // Al salir de TEXTO VERTICAL, generar su composición y reposicionarla en los formatos V
    if (previous === 'TEXTO VERTICAL' && formatName !== 'TEXTO VERTICAL') {
      if (typeof ComposicionTexto !== 'undefined') {
        ComposicionTexto.generate('TEXTO VERTICAL', 'COMPOSICIÓN TEXTO VERTICAL', 'isComposicionTextoV').then(() => {
          const comp = State.layers.find(l => l.isComposicionTextoV);
          if (comp && typeof AutoLayout !== 'undefined') AutoLayout.repositionTextComp(comp, 'V');
          if (typeof Canvas !== 'undefined') Canvas.render();
        });
      }
    }

    if (typeof Canvas !== 'undefined') Canvas.render();
    if (typeof Layers !== 'undefined') Layers.render();
  }

  function toggleOk(formatName) {
    if (typeof History !== 'undefined') History.push();
    State.formatOk[formatName] = !State.formatOk[formatName];
    _renderFormatGrid();
  }

  // ── PARÁMETROS POR CAPA/FORMATO ───────────────────────────

  function getLayerParams(formatId, layerId) {
    return State.formatParams?.[formatId]?.[layerId] ?? _defaultParams();
  }

  function setLayerParam(formatId, layerId, key, value) {
    if (!State.formatParams[formatId]) State.formatParams[formatId] = {};
    if (!State.formatParams[formatId][layerId]) State.formatParams[formatId][layerId] = _defaultParams();

    // Calcular delta antes de aplicar (para propagación a capas enlazadas)
    const prevValue = State.formatParams[formatId][layerId][key] ?? _defaultParams()[key] ?? 0;
    const delta = value - prevValue;

    State.formatParams[formatId][layerId][key] = value;
    State.dirty = true;

    // Propagación para capas de título
    const layer = State.layers.find(l => l.id === layerId);
    if (layer?.isTitleLayer) {
      _propagateTitleParam(formatId, layerId, key, value);
    }

    // Propagación para capas enlazadas (solo x, y, scaleX, scaleY, rotation)
    if (layer?.linkGroupId && ['x', 'y', 'scaleX', 'scaleY', 'rotation'].includes(key) && delta !== 0) {
      _propagateLinkGroup(formatId, layerId, layer.linkGroupId, key, delta);
    }

    // Propagación para máscaras: una capa-máscara representa un efecto gráfico
    // global, por eso sus params se replican en todos los formatos. Si en algún
    // formato se quiere una máscara distinta, el usuario marca la capa como
    // exclusiva de ese formato (`exclusiveFormat`) y la edita ahí.
    if (layer?.isMask) {
      _propagateMaskParam(formatId, layerId, key, value);
    }

    // Si la capa modificada es la CLIENTE PRINCIPAL de alguna máscara
    // (primera capa con maskLayerId === maskId), re-sincronizar esa máscara.
    // Sin esto, mover/escalar la cliente desactualiza la relación máscara↔cliente
    // que usa la propagación cliente-relativa en otros formatos.
    if (!layer?.isMask && ['x','y','scaleX','scaleY'].includes(key)) {
      State.layers.forEach(maskCandidate => {
        if (!maskCandidate.isMask) return;
        const primaryClient = State.layers.find(l => l.maskLayerId === maskCandidate.id);
        if (primaryClient?.id !== layerId) return;
        if (!State.formatParams[formatId]?.[maskCandidate.id]) return;
        _propagateMaskParam(formatId, maskCandidate.id, '', 0);
      });
    }
  }

  // Pública: sincroniza los params de una máscara desde `sourceFormat` a todos
  // los demás formatos (con ajuste de ratio). Llamado al convertir una capa
  // en máscara y al asignarle el primer cliente, para que el efecto quede
  // consistente en todos los formatos desde el primer momento.
  function syncMaskAcrossFormats(layerId, sourceFormat) {
    _propagateMaskParam(sourceFormat, layerId, '', 0);
  }

  // Pública: recalcula los params de UNA máscara en UN formato concreto,
  // tomando como referencia la relación máscara↔cliente de cualquier OTRO
  // formato donde existan params completos. Útil cuando auto-layout modifica
  // las capas en un formato y la máscara queda obsoleta (la cliente cambió
  // de posición/escala y la máscara debe seguir su nueva posición).
  function recomputeMaskForFormat(maskLayerId, targetFormat) {
    const maskLayer = State.layers.find(l => l.id === maskLayerId);
    if (!maskLayer?.isMask) return;
    const primaryClient = State.layers.find(l => l.maskLayerId === maskLayerId);
    if (!primaryClient) return;
    const clientT = State.formatParams[targetFormat]?.[primaryClient.id];
    if (!clientT) return;
    // Buscar un formato fuente distinto al target con params completos en
    // ambas capas (máscara y cliente principal).
    const allFormats = Object.keys(State.formatSizes || {});
    const sourceFormat = allFormats.find(f => {
      if (f === targetFormat) return false;
      const mp = State.formatParams[f]?.[maskLayerId];
      const cp = State.formatParams[f]?.[primaryClient.id];
      return mp && typeof mp.x === 'number' && cp && typeof cp.x === 'number';
    });
    if (!sourceFormat) return;
    const maskS = State.formatParams[sourceFormat][maskLayerId];
    const clientS = State.formatParams[sourceFormat][primaryClient.id];
    const cxS = clientS.x ?? 0, cyS = clientS.y ?? 0;
    const csxS = clientS.scaleX ?? 100, csyS = clientS.scaleY ?? 100;
    const mxS = maskS.x ?? 0, myS = maskS.y ?? 0;
    const msxS = maskS.scaleX ?? 100, msyS = maskS.scaleY ?? 100;
    const dx = mxS - cxS, dy = myS - cyS;
    const cxT = clientT.x ?? 0, cyT = clientT.y ?? 0;
    const csxT = clientT.scaleX ?? 100, csyT = clientT.scaleY ?? 100;
    const xRatio = csxS !== 0 ? csxT / csxS : 1;
    const yRatio = csyS !== 0 ? csyT / csyS : 1;
    if (!State.formatParams[targetFormat][maskLayerId]) State.formatParams[targetFormat][maskLayerId] = _defaultParams();
    const target = State.formatParams[targetFormat][maskLayerId];
    target.x = cxT + dx * xRatio;
    target.y = cyT + dy * yRatio;
    target.scaleX = msxS * xRatio;
    target.scaleY = msyS * yRatio;
    Object.keys(maskS).forEach(k => {
      if (['x','y','scaleX','scaleY'].includes(k)) return;
      target[k] = maskS[k];
    });
  }

  function _propagateMaskParam(sourceFormat, layerId, _key, _value) {
    // Propaga los params de la máscara a todos los formatos.
    //
    // Hay DOS modos:
    //
    // 1) "Cliente-relativo" (preferido): si la máscara tiene clientes
    //    asignadas, usamos la PRIMERA cliente (orden Z, top del panel) como
    //    referencia. La máscara mantiene su offset/escala RELATIVOS a la
    //    cliente — así envuelve la imagen igual aunque ésta esté en otra
    //    posición en cada formato. Funciona como una pre-comp de After
    //    Effects: máscara + imagen forman un "grupo virtual" que se mueve
    //    junto al cambiar de formato.
    //
    // 2) "Lienzo-relativo" (fallback): si la máscara aún no tiene clientes
    //    o la cliente principal no tiene params en alguno de los formatos,
    //    propagamos respecto al lienzo con ajuste de ratio (comportamiento
    //    original). Esto cubre el caso de máscara recién creada antes de
    //    asignar clientes.

    const allFormats = Object.keys(State.formatSizes || {});
    const sourceSize = State.formatSizes[sourceFormat];
    const sourceParams = State.formatParams[sourceFormat]?.[layerId];
    if (!sourceParams) return;

    // Cliente principal: la primera capa (en orden Z) que apunta a esta máscara.
    const primaryClient = State.layers.find(l => l.maskLayerId === layerId);
    const clientSourceP = primaryClient ? State.formatParams[sourceFormat]?.[primaryClient.id] : null;

    allFormats.forEach(fid => {
      if (fid === sourceFormat) return;
      if (!State.formatParams[fid]) State.formatParams[fid] = {};
      if (!State.formatParams[fid][layerId]) State.formatParams[fid][layerId] = _defaultParams();
      const target = State.formatParams[fid][layerId];
      const targetSize = State.formatSizes[fid];
      const clientTargetP = primaryClient ? State.formatParams[fid]?.[primaryClient.id] : null;

      const useClientRelative = clientSourceP && clientTargetP;

      if (useClientRelative) {
        // Offset de la máscara respecto al centro de la cliente en source.
        const cxS = clientSourceP.x ?? 0;
        const cyS = clientSourceP.y ?? 0;
        const csxS = clientSourceP.scaleX ?? 100;
        const csyS = clientSourceP.scaleY ?? 100;
        const cxT = clientTargetP.x ?? 0;
        const cyT = clientTargetP.y ?? 0;
        const csxT = clientTargetP.scaleX ?? 100;
        const csyT = clientTargetP.scaleY ?? 100;
        const mxS = sourceParams.x ?? 0;
        const myS = sourceParams.y ?? 0;
        const msxS = sourceParams.scaleX ?? 100;
        const msyS = sourceParams.scaleY ?? 100;
        const dx = mxS - cxS;
        const dy = myS - cyS;
        // Ratio de escala cliente: la máscara crece/encoge proporcionalmente.
        const xRatio = csxS !== 0 ? csxT / csxS : 1;
        const yRatio = csyS !== 0 ? csyT / csyS : 1;
        target.x = cxT + dx * xRatio;
        target.y = cyT + dy * yRatio;
        target.scaleX = msxS * xRatio;
        target.scaleY = msyS * yRatio;
        // Resto de campos se copian tal cual (rotation, visible, opacity…)
        Object.keys(sourceParams).forEach(k => {
          if (k === 'x' || k === 'y' || k === 'scaleX' || k === 'scaleY') return;
          target[k] = sourceParams[k];
        });
      } else {
        // Fallback lienzo-relativo (ratio de dimensiones del formato).
        Object.keys(sourceParams).forEach(k => {
          const v = sourceParams[k];
          let adjusted = v;
          if (sourceSize && targetSize && typeof v === 'number') {
            if (k === 'x' || k === 'scaleX') {
              adjusted = v * (targetSize.w / sourceSize.w);
            } else if (k === 'y' || k === 'scaleY') {
              adjusted = v * (targetSize.h / sourceSize.h);
            }
          }
          target[k] = adjusted;
        });
      }
    });
  }

  function _propagateLinkGroup(formatId, sourceLayerId, groupId, key, delta) {
    State.layers
      .filter(l => l.linkGroupId === groupId && l.id !== sourceLayerId)
      .forEach(l => {
        if (!State.formatParams[formatId]) State.formatParams[formatId] = {};
        if (!State.formatParams[formatId][l.id]) State.formatParams[formatId][l.id] = _defaultParams();
        const current = State.formatParams[formatId][l.id][key] ?? _defaultParams()[key] ?? 0;
        State.formatParams[formatId][l.id][key] = current + delta;
      });
  }

  // ── GESTIÓN DE GRUPOS DE ENLACE ───────────────────────────

  function linkLayers(layerIds) {
    if (!layerIds || layerIds.length < 2) return;
    // Buscar si alguna ya tiene grupo
    const existingGroup = layerIds
      .map(id => State.layers.find(l => l.id === id)?.linkGroupId)
      .find(g => g);
    const groupId = existingGroup || ('link_' + Date.now());
    layerIds.forEach(id => {
      const layer = State.layers.find(l => l.id === id);
      if (layer) layer.linkGroupId = groupId;
    });
  }

  function unlinkLayer(layerId) {
    const layer = State.layers.find(l => l.id === layerId);
    if (!layer?.linkGroupId) return;
    const groupId = layer.linkGroupId;
    delete layer.linkGroupId;
    // Si solo queda una capa en el grupo, disolver el grupo
    const remaining = State.layers.filter(l => l.linkGroupId === groupId);
    if (remaining.length === 1) delete remaining[0].linkGroupId;
  }

  function _propagateTitleParam(masterFormat, layerId, key, value) {
    const allFormats = Object.keys(State.formatSizes || {});

    if (masterFormat === 'MUX4 TXT') {
      // Propagar a todos excepto MOVIL MUX FONDO y MOVIL TXT
      allFormats.forEach(fid => {
        if (fid === masterFormat) return;
        if (fid === 'MOVIL MUX FONDO') return;
        if (fid === 'MOVIL TXT') return;
        if (!State.formatParams[fid]) State.formatParams[fid] = {};
        if (!State.formatParams[fid][layerId]) State.formatParams[fid][layerId] = _defaultParams();
        State.formatParams[fid][layerId][key] = value;
      });
    } else if (masterFormat === 'MOVIL TXT') {
      // Propagar solo a MOVIL MUX FONDO
      const fid = 'MOVIL MUX FONDO';
      if (!State.formatParams[fid]) State.formatParams[fid] = {};
      if (!State.formatParams[fid][layerId]) State.formatParams[fid][layerId] = _defaultParams();
      State.formatParams[fid][layerId][key] = value;
    }
  }

  function _defaultParams() {
    return { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0 };
  }

  // ── VARIANTE DE TEXTO POR FORMATO ─────────────────────────
  // Defaults por orientación. El lapicero escribe overrides en State.formatTextVariant.
  // Formatos que muestran la IMAGEN DE TÍTULO CRUDA por defecto (en vez de composición):
  const TEXT_VARIANT_TITLE_H_DEFAULT = [
    'CARÁTULA H', 'CARTEL COM. H', 'XIAOMI BANNER',
    'DEST. DOBLE 1', 'DEST. DOBLE 1 SIL', 'DEST. DOBLE 2', 'DEST. DOBLE 2 SIL', 'MOD N SIL',
  ];
  const TEXT_VARIANT_TITLE_V_DEFAULT = [
    'CARÁTULA V', 'CARTEL COM. V', 'SONY', 'DEST. DOBLE 4', 'DEST. DOBLE 4 SIL',
  ];
  // Formatos con composición horneada VERTICAL por defecto (los que quedan en vertical)
  const TEXT_VARIANT_V_DEFAULT = [];
  // Formatos que NO reciben texto (sin variante)
  const TEXT_VARIANT_NONE = ['FANART', 'FANART MÓVIL', 'FANART DEST.', 'FANART MOD N', 'PERFIL',
                             'MUX4 FONDO', 'MOVIL MUX FONDO', 'AMAZON BG', 'TÍTULO FICHA',
                             'MUX4 TXT', 'MOVIL TXT', 'AMAZON LOGO', 'TEXTO HORIZONTAL', 'TEXTO VERTICAL'];

  function _defaultTextVariant(fid) {
    if (TEXT_VARIANT_NONE.includes(fid)) return null;
    if (TEXT_VARIANT_TITLE_H_DEFAULT.includes(fid)) return 'TITLE_H';
    if (TEXT_VARIANT_TITLE_V_DEFAULT.includes(fid)) return 'TITLE_V';
    return TEXT_VARIANT_V_DEFAULT.includes(fid) ? 'V' : 'H';
  }

  // Opciones del lápiz: 4 composiciones horneadas + 2 imágenes de título crudas.
  // value = variante · flag = propiedad de la capa a mostrar · label = texto visible.
  const TEXT_VARIANT_OPTIONS = [
    { value: 'H',       label: 'TEXTO HORIZONTAL',     flag: 'isComposicionTextoH' },
    { value: 'V',       label: 'TEXTO VERTICAL',       flag: 'isComposicionTextoV' },
    { value: 'MUX4',    label: 'MUX4 TEXT',            flag: 'isComposicion'       },
    { value: 'MOVIL',   label: 'Smartphone TEXT',      flag: 'isComposicionMovil'  },
    { value: 'TITLE_H', label: 'TÍTULO ORIGINAL HOR',  flag: 'isTitleLayerH'       },
    { value: 'TITLE_V', label: 'TÍTULO ORIGINAL VER',  flag: 'isTitleLayerV'       },
  ];
  const TEXT_VARIANT_VALUES = TEXT_VARIANT_OPTIONS.map(o => o.value);

  // Devuelve la variante de un formato: 'H' | 'V' | 'MUX4' | 'MOVIL' | null (override del usuario o default)
  function getTextVariant(fid) {
    const v = State.formatTextVariant?.[fid];
    if (TEXT_VARIANT_VALUES.includes(v)) return v;
    return _defaultTextVariant(fid);
  }

  function getTextVariantOptions() { return TEXT_VARIANT_OPTIONS; }

  function setTextVariant(fid, variant) {
    if (typeof History !== 'undefined') History.push();
    // Guardar la composición que estaba activa ANTES del cambio, para
    // preservar su posición Z al mostrar la nueva. Sin esto, si el usuario
    // movió la composición vieja a una posición concreta (p. ej. encima de
    // una máscara para que cubra el recorte), la composición nueva se ve
    // donde acabó al crearse hace tiempo (posición Z arbitraria).
    const _oldVariant = getTextVariant(fid);
    const _oldOpt = TEXT_VARIANT_OPTIONS.find(o => o.value === _oldVariant);
    const _oldComp = _oldOpt && State.layers.find(l => l[_oldOpt.flag]);

    State.formatTextVariant[fid] = variant;
    State.dirty = true;

    const opt = TEXT_VARIANT_OPTIONS.find(o => o.value === variant);

    const _finish = () => {
      const comp = opt && State.layers.find(l => l[opt.flag]);
      // Mover la nueva composición a la posición Z que ocupaba la vieja.
      if (comp && _oldComp && comp !== _oldComp) {
        const oldIdx = State.layers.indexOf(_oldComp);
        const newIdx = State.layers.indexOf(comp);
        if (oldIdx >= 0 && newIdx >= 0 && oldIdx !== newIdx) {
          State.layers.splice(newIdx, 1);
          const insertAt = newIdx < oldIdx ? oldIdx - 1 : oldIdx;
          State.layers.splice(insertAt, 0, comp);
        }
      }
      if (comp && typeof AutoLayout !== 'undefined' && AutoLayout.repositionTextComp) {
        AutoLayout.repositionTextComp(comp, variant);
      }
      if (typeof Canvas !== 'undefined') Canvas.render();
      if (typeof Layers !== 'undefined') Layers.render();
    };

    // Si la composición elegida aún no existe (sin contenido), generarla VACÍA para que su
    // capa siga apareciendo en el panel (con su lápiz) y se pueda volver a cambiar o rellenar.
    const exists = opt && State.layers.find(l => l[opt.flag]);
    if (opt && !exists) {
      let p = null;
      if (variant === 'H' && typeof ComposicionTexto !== 'undefined')
        p = ComposicionTexto.generate('TEXTO HORIZONTAL', 'COMPOSICIÓN TEXTO HORIZONTAL', 'isComposicionTextoH');
      else if (variant === 'V' && typeof ComposicionTexto !== 'undefined')
        p = ComposicionTexto.generate('TEXTO VERTICAL', 'COMPOSICIÓN TEXTO VERTICAL', 'isComposicionTextoV');
      else if (variant === 'MUX4' && typeof Composicion !== 'undefined')
        p = Composicion.generate();
      else if (variant === 'MOVIL' && typeof ComposicionMovil !== 'undefined')
        p = ComposicionMovil.generate();
      if (p && typeof p.then === 'function') { p.then(_finish); return; }
    }
    _finish();
  }

  // ── COPIAR ATRIBUTOS ENTRE PARES DE TEXTO ─────────────────
  // HORIZONTAL ⇄ MUX4 TXT · VERTICAL ⇄ MOVIL TXT
  const TEXT_PAIRS = {
    'TEXTO HORIZONTAL': 'MUX4 TXT',
    'MUX4 TXT':         'TEXTO HORIZONTAL',
    'TEXTO VERTICAL':   'MOVIL TXT',
    'MOVIL TXT':        'TEXTO VERTICAL',
  };
  function getTextPair(fid) { return TEXT_PAIRS[fid] || null; }

  // ── ROL FANART ────────────────────────────────────────────
  const FANART_FORMATS = ['FANART', 'FANART MÓVIL', 'FANART DEST.', 'FANART MOD N'];
  function isFanartFormat(fid) { return FANART_FORMATS.includes(fid); }

  // ── ELEGIR TÍTULO ACTIVO POR FORMATO ──────────────────────
  // Devuelve la capa de título (isTitleLayerH/V) que debe mostrarse en este formato.
  // Con fallback: si solo hay uno, se usa para los dos.
  function _formatNeedsTitleOrient(fid) {
    if (fid === 'MUX4 TXT' || fid === 'TEXTO HORIZONTAL' || fid === 'AMAZON LOGO' || fid === 'TÍTULO FICHA') return 'H';
    if (fid === 'MOVIL TXT' || fid === 'TEXTO VERTICAL') return 'V';
    // Receptores no-maestros: según la variante de texto que tengan
    const v = getTextVariant(fid);
    if (v === 'H' || v === 'MUX4' || v === 'TITLE_H') return 'H';
    if (v === 'V' || v === 'MOVIL' || v === 'TITLE_V') return 'V';
    return null;
  }
  function getActiveTitleForFormat(fid) {
    const orient = _formatNeedsTitleOrient(fid);
    if (!orient) return null;
    const titleH = State.layers.find(l => l.isTitleLayerH);
    const titleV = State.layers.find(l => l.isTitleLayerV);
    if (orient === 'H') return titleH || titleV || null;
    if (orient === 'V') return titleV || titleH || null;
    return null;
  }
  // Devuelve la lista de orientaciones que necesita un formato (para visibilidad)
  function isActiveTitleForFormat(layer, fid) {
    return getActiveTitleForFormat(fid) === layer;
  }

  // ── GUÍAS DE COMPOSICIÓN ──────────────────────────────────
  function getGuides(fid) { return State.guides[fid] || []; }
  function hasGuides(fid) { return getGuides(fid).length > 0; }
  function areGuidesVisible(fid) {
    const v = State.guidesVisible?.[fid];
    return v === undefined ? true : !!v;
  }
  function areGuidesLocked(fid) { return !!State.guidesLocked?.[fid]; }
  function isSnapEnabled() { return !!State.snapEnabled; }

  function _refreshUI() {
    if (typeof Canvas !== 'undefined' && Canvas.render) Canvas.render();
    if (typeof Layers !== 'undefined' && Layers.render) Layers.render();
  }
  function addGuide(fid, orient, pos) {
    if (areGuidesLocked(fid)) return null;
    if (typeof History !== 'undefined') History.push();
    if (!State.guides[fid]) State.guides[fid] = [];
    const guide = { id: 'guide_' + Date.now() + '_' + Math.random().toString(36).slice(2), orient, pos: Math.round(pos) };
    State.guides[fid].push(guide);
    State.dirty = true;
    _refreshUI();
    return guide;
  }
  function moveGuide(fid, guideId, pos) {
    if (areGuidesLocked(fid)) return;
    const g = (State.guides[fid] || []).find(x => x.id === guideId);
    if (!g) return;
    g.pos = Math.round(pos);
    State.dirty = true;
    _refreshUI();
  }
  function deleteGuide(fid, guideId) {
    if (areGuidesLocked(fid)) return;
    if (typeof History !== 'undefined') History.push();
    State.guides[fid] = (State.guides[fid] || []).filter(g => g.id !== guideId);
    State.dirty = true;
    _refreshUI();
  }
  function toggleGuidesVisible(fid) {
    if (typeof History !== 'undefined') History.push();
    State.guidesVisible[fid] = !areGuidesVisible(fid);
    State.dirty = true;
    _refreshUI();
  }
  function toggleGuidesLocked(fid) {
    if (typeof History !== 'undefined') History.push();
    State.guidesLocked[fid] = !areGuidesLocked(fid);
    State.dirty = true;
    _refreshUI();
  }
  function toggleSnap() {
    if (typeof History !== 'undefined') History.push();
    State.snapEnabled = !State.snapEnabled;
    State.dirty = true;
    _refreshUI();
  }

  // Visibilidad por rol fanart. Devuelve: true (mostrar), false (ocultar) o null (no aplica).
  function fanartRoleVisibility(layerId, formatName) {
    const role = State.layerRoles?.[layerId];
    const isF  = FANART_FORMATS.includes(formatName);
    if (role === 'fanart') return isF;  // el fanart solo se ve en formatos FANART
    if (isF && (role === 'subject' || role === 'background')) {
      const hasFanart = State.layers.some(l => State.layerRoles?.[l.id] === 'fanart');
      if (hasFanart) return false;      // subject/fondo tapados por el fanart
    }
    return null;                         // no aplica regla fanart
  }

  function _cloneLayerToFormat(layer, destFormat, fy) {
    const c = { ...layer };
    c.id = 'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    c.exclusiveFormat = destFormat;
    if (layer.params)         c.params = { ...layer.params };
    if (layer.solidParams)    c.solidParams = { ...layer.solidParams };
    if (layer.gradientParams) c.gradientParams = { ...layer.gradientParams };
    if (layer.textParams) {
      c.textParams = { ...layer.textParams, runs: (layer.textParams.runs || []).map(r => ({ ...r })) };
      if (typeof c.textParams.size === 'number') c.textParams.size = Math.round(c.textParams.size * fy);
      c.textParams.runs.forEach(r => { if (typeof r.size === 'number') r.size = Math.round(r.size * fy); });
    }
    return c;
  }

  function _scaleParamsForCopy(p, isText, fx, fy) {
    // scaleX/scaleY usan UN ÚNICO factor uniforme (mín) → no deforma capas.
    const fScale = Math.min(fx, fy);
    const out = {
      x: Math.round((p.x ?? 0) * fx),
      y: Math.round((p.y ?? 0) * fy),
      rotation: p.rotation ?? 0,
      scaleX: isText ? (p.scaleX ?? 100) : Math.round((p.scaleX ?? 100) * fScale * 10) / 10,
      scaleY: isText ? (p.scaleY ?? 100) : Math.round((p.scaleY ?? 100) * fScale * 10) / 10,
    };
    if (p.visible !== undefined) out.visible = p.visible;
    return out;
  }

  // Copia TODOS los atributos del formato actual a su pareja, reescalados a su tamaño.
  function propagateTextAttributes(source) {
    const dest = TEXT_PAIRS[source];
    if (!dest) return;
    const srcSize = State.formatSizes[source], destSize = State.formatSizes[dest];
    if (!srcSize || !destSize) return;
    if (typeof History !== 'undefined') History.push();

    const fx = destSize.w / srcSize.w;
    const fy = destSize.h / srcSize.h;

    // 1. Maquetación
    if (State.layoutConfig[source]) State.layoutConfig[dest] = { ...State.layoutConfig[source] };
    else delete State.layoutConfig[dest];

    // 2. Quitar capas exclusivas actuales del destino y sus params
    const removed = State.layers.filter(l => l.exclusiveFormat === dest).map(l => l.id);
    State.layers = State.layers.filter(l => l.exclusiveFormat !== dest);
    if (State.formatParams[dest]) removed.forEach(id => { delete State.formatParams[dest][id]; });

    // 3. Punto de inserción (tras sistema / composiciones / título)
    let insertIdx = 0;
    while (insertIdx < State.layers.length && (
      State.layers[insertIdx].isComposicion || State.layers[insertIdx].isComposicionMovil ||
      State.layers[insertIdx].isComposicionAmazon || State.layers[insertIdx].isComposicionTextoH ||
      State.layers[insertIdx].isComposicionTextoV || State.layers[insertIdx].isMarcaIplus ||
      State.layers[insertIdx].isMarcaSony || State.layers[insertIdx].isTitleLayer
    )) insertIdx++;

    // 4. Clonar capas exclusivas del origen → destino (escaladas), conservando el orden
    if (!State.formatParams[dest]) State.formatParams[dest] = {};
    const srcLayers = State.layers.filter(l => l.exclusiveFormat === source);
    [...srcLayers].reverse().forEach(srcLayer => {
      const clone = _cloneLayerToFormat(srcLayer, dest, fy);
      State.layers.splice(insertIdx, 0, clone);
      const sp = State.formatParams[source]?.[srcLayer.id] || _defaultParams();
      State.formatParams[dest][clone.id] = _scaleParamsForCopy(sp, srcLayer.type === 'text', fx, fy);
    });

    // 5. Imagen de título (capa compartida): copiar sus params escalados
    const titleLayer = State.layers.find(l => l.isTitleLayer);
    if (titleLayer) {
      const sp = State.formatParams[source]?.[titleLayer.id];
      if (sp) State.formatParams[dest][titleLayer.id] = _scaleParamsForCopy(sp, false, fx, fy);
    }
    State.dirty = true;

    // 6. Regenerar la composición del destino y refrescar
    const _done = () => {
      if (typeof Canvas !== 'undefined') Canvas.render();
      if (typeof Layers !== 'undefined') Layers.render();
    };
    let p = null;
    if (dest === 'MUX4 TXT' && typeof Composicion !== 'undefined') p = Composicion.generate();
    else if (dest === 'MOVIL TXT' && typeof ComposicionMovil !== 'undefined') p = ComposicionMovil.generate();
    else if (dest === 'TEXTO HORIZONTAL' && typeof ComposicionTexto !== 'undefined') p = ComposicionTexto.generate('TEXTO HORIZONTAL', 'COMPOSICIÓN TEXTO HORIZONTAL', 'isComposicionTextoH');
    else if (dest === 'TEXTO VERTICAL' && typeof ComposicionTexto !== 'undefined') p = ComposicionTexto.generate('TEXTO VERTICAL', 'COMPOSICIÓN TEXTO VERTICAL', 'isComposicionTextoV');
    if (p && typeof p.then === 'function') p.then(_done); else _done();
  }

  return { init, setActiveFormat, toggleOk, getLayerParams, setLayerParam, linkLayers, unlinkLayer, refreshGrid: _renderFormatGrid, getTextVariant, setTextVariant, getTextVariantOptions, displayLabel, getTextPair, propagateTextAttributes, isFanartFormat, fanartRoleVisibility, syncMaskAcrossFormats, recomputeMaskForFormat,
    getActiveTitleForFormat, isActiveTitleForFormat,
    getGuides, hasGuides, areGuidesVisible, areGuidesLocked, isSnapEnabled,
    addGuide, moveGuide, deleteGuide, toggleGuidesVisible, toggleGuidesLocked, toggleSnap };
})();
