// ============================================================
// IMPORT-PSD.JS — Importación de capas desde archivos PSD / PSB
// ============================================================
// Lee un PSD con ag-psd, muestra su árbol de capas para que el usuario elija
// qué importar y con qué rol, y rasteriza lo elegido a PNG con transparencia
// para añadirlo a State.layers como capas normales. A partir de ahí Adaptator
// funciona igual que con imágenes importadas a mano.
//
// No tiene botón propio: se entra por el botón de añadir capa de siempre.
// _routeImport() en layers.js mira lo seleccionado y llama a
// ImportPSD.importFile(file) cuando es un PSD/PSB.
//
// La librería (assets/js/ag-psd.js, ~830 KB) se carga DIFERIDA: solo se
// descarga la primera vez que se abre este modal, para no penalizar el
// arranque de la app a quien nunca importa un PSD.
//
// ── ALCANCE (decisiones cerradas de diseño) ─────────────────────────────
//   · Solo-lectura: Adaptator NUNCA reescribe el PSD.
//   · Texto, smart objects y efectos de capa → se usan los píxeles YA
//     renderizados que el PSD trae guardados. No se re-renderiza nada, así que
//     no hace falta tener instaladas las fuentes del partner.
//   · Grupos → se importan APLANADOS, como aproximación: se pintan los hijos
//     visibles en orden aplicando su opacidad, pero SIN blend modes ni máscaras
//     de grupo. Para un control exacto, importar las hojas por separado.
//   · CMYK → ag-psd lo convierte a RGB al leer.

const ImportPSD = (() => {

  const LIB_SRC = 'assets/js/ag-psd.js';

  // Guardas para PSDs disparatados (ver sección "unsafe user-provided data"
  // del README de ag-psd): un PSD puede declarar lienzos de 300000×300000 o
  // miles de capas y agotar la memoria del navegador al descomprimir bitmaps.
  const MAX_DOC_SIDE  = 20000;
  const MAX_LAYERS    = 600;
  const MAX_LAYER_SIDE = 20000;
  const WARN_FILE_MB  = 500;
  // Por encima de ~2 GB el navegador no puede ni crear el ArrayBuffer, así que
  // no tiene sentido intentarlo: fallaría con un error de memoria sin explicar
  // nada. Varias SUPER_PLANTILLA del equipo pasan de 1,5 GB.
  const MAX_FILE_MB   = 1500;

  const THUMB_MAX     = 36;   // lado máximo de la miniatura del árbol
  const DEFAULT_TOP_N = 10;   // "seleccionar N más grandes"
  // A partir de este nº de capas importables, el modal arranca SIN nada marcado.
  // Pre-marcar 400 capas invita a pulsar "Importar" y tumbar el navegador
  // rasterizando cientos de lienzos del tamaño del documento.
  const AUTOSELECT_LIMIT = 40;

  // Mismos roles y etiquetas que el modal de AutoLayout, para que el usuario
  // vea lo mismo en los dos sitios. OJO: no existe rol "logo" — los logos se
  // añaden con el módulo Logos, no como rol de maquetación.
  const ROLE_OPTIONS = [
    { value: '',           label: 'NINGUNO' },
    { value: 'background', label: 'FONDO' },
    { value: 'subject',    label: 'IMAGEN' },
    { value: 'title_h',    label: 'TÍTULO HORIZONTAL' },
    { value: 'title_v',    label: 'TÍTULO VERTICAL' },
    { value: 'fanart',     label: 'FANART' },
  ];

  // ── CAPAS DE ANOTACIÓN ────────────────────────────────────
  // Las plantillas de M+ traen grupos que NO son contenido: especificaciones,
  // indicaciones de exportación, márgenes de seguridad, áreas de reserva…
  // Llegan desmarcadas (no ocultas: el usuario puede marcarlas si las quiere).
  //
  // La detección se hereda del grupo padre, y eso es deliberado: "TEXTOS"
  // aparece tanto dentro de CREATIVIDAD (contenido real) como dentro de
  // ESPECIFICACIONES (anotación). Por el nombre suelto sería indistinguible.
  // Por eso tampoco se listan EJEMPLO/LINEAS/INDICACIONES sueltos: en las
  // plantillas reales siempre cuelgan de un ESPECIFICACIONES, y la herencia
  // ya los cubre sin arriesgar falsos positivos.
  const ANNOTATION_PATTERNS = [
    /ESPECIFICACION/,        // ESPECIFICACIONES (OCULTAR CAPA AL EXPORTAR)
    /INDICACION/,            // INDICACIONES, INDICACIONES EXPORTACION/TIPOGRAFIA
    /INSTRUCCION/,
    /OCULTAR/,               // RESERVAS (OCULTAR CAPA AL EXPORTAR)
    /NO\s*EXPORTAR/,         // areas reserva no exportar
    /NO\s*TOCAR/,            // NO TOCAR - MODULO IZQUIERDA RESERVADO...
    /MARGENES?.*SEGURIDAD/,  // MARGENES SEGURIDAD / MÁRGENES DE SEGURIDAD
    /ZONA\s*D?E?\s*SEGURIDAD/,
    /RESERVA/,               // ZONA_RESERVA, ÁREAS DE RESERVA
  ];

  // Contraseñales explícitas: hay grupos que piden lo contrario. Sin esto, una
  // regla sobre "EXPORTAR" descartaría contenido real.
  const KEEP_PATTERNS = [
    /MANTENER\s*AL\s*EXPORTAR/,  // ELEMENTOS FIJOS (MANTENER AL EXPORTAR)
    /EXPORTAR\s*DESDE\s*OBJETO/, // EDITAR FONDO (EXPORTAR DESDE OBJETO INTELIGENTE)
    /ELEMENTOS?\s*FIJO/,         // SELLO PUBLICIDAD - ELEMENTO FIJO
  ];

  // Las plantillas mezclan acentos ("EXPORTACION"/"EXPORTACIÓN", "MARGENES"/
  // "MÁRGENES"), así que se compara en mayúsculas y sin diacríticos.
  function _norm(s) {
    return (s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Formatos "maestros de texto": solo muestran capas exclusivas suyas. Si se
  // importa estando en uno de ellos, la capa se marca exclusiva o quedaría
  // oculta justo ahí y visible en todos los demás.
  // DEBE coincidir con _TEXT_MASTER_FORMATS de layers.js (_importLayer).
  const TEXT_MASTER_FORMATS = ['MUX4 TXT', 'MOVIL TXT', 'AMAZON LOGO',
                               'TEXTO HORIZONTAL', 'TEXTO VERTICAL', 'TÍTULO FICHA'];

  let _libPromise = null;
  let _overlay    = null;
  let _nodes      = [];   // lista PLANA del árbol, en orden de panel de Photoshop
  let _psdName    = '';
  let _docSize    = { w: 0, h: 0 };
  let _cropToContent = true;

  // ── CARGA DIFERIDA DE ag-psd ──────────────────────────────

  function _ensureLib() {
    if (window.agPsd) return Promise.resolve();
    if (_libPromise) return _libPromise;
    _libPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIB_SRC;
      s.onload  = () => resolve();
      s.onerror = () => { _libPromise = null; reject(new Error('No se pudo cargar ' + LIB_SRC)); };
      document.head.appendChild(s);
    });
    return _libPromise;
  }

  // ── LECTURA DEL ARCHIVO ───────────────────────────────────

  async function _handleFile(file) {
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_FILE_MB) {
      alert('El archivo "' + file.name + '" pesa ' + mb.toFixed(0) + ' MB y no se puede abrir en el navegador ' +
            '(el límite técnico está en unos 2 GB por archivo).\n\n' +
            'Qué hacer: en Photoshop abre el PSD, descarta o aplana las capas que no necesites y guarda ' +
            'una copia más ligera. Con esa copia la importación funcionará con normalidad.');
      return;
    }
    if (mb > WARN_FILE_MB) {
      const ok = confirm(
        'El archivo "' + file.name + '" pesa ' + mb.toFixed(0) + ' MB.\n\n' +
        'Abrir un PSD tan grande puede tardar mucho o agotar la memoria del navegador.\n\n' +
        'Alternativa recomendada: en Photoshop, guarda una copia aplanando o descartando ' +
        'las capas que no necesites, y usa esa copia.\n\n¿Continuar de todas formas?'
      );
      if (!ok) return;
    }

    const progress = _showProgress('Leyendo ' + file.name + '…');
    try {
      await _ensureLib();
      const buffer = await file.arrayBuffer();

      // PASADA 1 — solo estructura, sin decodificar ningún bitmap. Es rápida y
      // permite rechazar PSDs imposibles antes de reservar memoria de verdad.
      const probe = agPsd.readPsd(buffer, {
        skipLayerImageData:     true,
        skipCompositeImageData: true,
        skipThumbnail:          true,
      });
      _assertSane(probe);

      // PASADA 2 — ahora sí, con los bitmaps de cada capa (ag-psd crea un
      // <canvas> por capa). Nos saltamos el compuesto y la miniatura del
      // documento: no los usamos y son memoria y tiempo de más.
      const psd = agPsd.readPsd(buffer, {
        skipCompositeImageData: true,
        skipThumbnail:          true,
        skipLinkedFilesData:    true,
      });

      _psdName = file.name;
      _docSize = { w: psd.width, h: psd.height };
      _nodes   = _flatten(psd.children || []);

      const importable = _nodes.filter(n => !n.empty);
      if (!importable.length) {
        alert('El PSD "' + file.name + '" no tiene ninguna capa con píxeles que se pueda importar.');
        return;
      }
      _openModal(psd);
    } catch (err) {
      console.error('[ImportPSD] Error leyendo el PSD:', err);
      alert('No se pudo leer el PSD "' + file.name + '".\n\n' + (err && err.message ? err.message : err));
    } finally {
      progress.remove();
    }
  }

  function _assertSane(psd) {
    if (psd.width > MAX_DOC_SIDE || psd.height > MAX_DOC_SIDE) {
      throw new Error('El documento mide ' + psd.width + '×' + psd.height + ' px, ' +
                      'por encima del límite admitido (' + MAX_DOC_SIDE + ' px por lado).');
    }
    if (psd.bitsPerChannel && psd.bitsPerChannel > 8) {
      throw new Error('El PSD es de ' + psd.bitsPerChannel + ' bits por canal. ' +
                      'Solo se admiten 8 bits: vuelve a guardarlo desde Photoshop en 8 bits/canal.');
    }
    let count = 0;
    (function walk(list) {
      (list || []).forEach(l => {
        if (++count > MAX_LAYERS) {
          throw new Error('El PSD tiene más de ' + MAX_LAYERS + ' capas. ' +
                          'Reduce el número de capas en Photoshop antes de importarlo.');
        }
        const w = (l.right || 0) - (l.left || 0);
        const h = (l.bottom || 0) - (l.top || 0);
        if (w > MAX_LAYER_SIDE || h > MAX_LAYER_SIDE) {
          throw new Error('La capa "' + (l.name || '?') + '" mide ' + w + '×' + h + ' px, ' +
                          'por encima del límite admitido.');
        }
        walk(l.children);
      });
    })(psd.children);
  }

  // Aplana el árbol de ag-psd a una lista con profundidad.
  //
  // OJO con el orden: ag-psd devuelve `children` de ABAJO ARRIBA (el primero es
  // la capa inferior, como se almacenan en el archivo PSD; verificado en
  // psdReader.js, que recorre los registros al revés haciendo unshift, y contra
  // las plantillas reales). Aquí lo invertimos para que el árbol se lea igual
  // que el panel de capas de Photoshop: la primera fila es la de ARRIBA.
  // Ese orden coincide además con State.layers, donde el índice 0 es la capa
  // superior, así que las capas se insertan luego sin más vueltas.
  function _flatten(children, depth = 0, parentUid = null, out = [], parentHidden = false, parentAnnotation = false) {
    children.slice().reverse().forEach(l => {
      const isGroup = Array.isArray(l.children);
      const w = Math.max(0, (l.right || 0) - (l.left || 0));
      const h = Math.max(0, (l.bottom || 0) - (l.top || 0));
      // En Photoshop, apagar un grupo apaga todo su contenido, pero las capas
      // de dentro NO llevan su propio flag `hidden`. Hay que arrastrarlo desde
      // los ancestros o se pre-marcarían capas que el diseñador había apagado
      // (caso típico: grupos de patrocinio alternativos en las plantillas).
      const hidden = parentHidden || !!l.hidden;
      // Anotación: se hereda del grupo padre salvo que el nombre diga lo
      // contrario de forma explícita (ver ANNOTATION_PATTERNS / KEEP_PATTERNS).
      const norm = _norm(l.name);
      const annotation = KEEP_PATTERNS.some(re => re.test(norm))
        ? false
        : (parentAnnotation || ANNOTATION_PATTERNS.some(re => re.test(norm)));
      const node = {
        uid:      'n' + out.length,
        name:     (l.name || 'Sin nombre').trim(),
        depth,
        parentUid,
        isGroup,
        hidden,
        annotation,
        psdLayer: l,
        w, h,
        area:     w * h,
        // Un grupo nunca tiene píxeles propios; una hoja sin canvas (p.ej. capa
        // de ajuste o de forma sin rasterizar) no se puede importar.
        empty:    isGroup ? false : (!l.canvas || !w || !h),
        checked:  false,
        role:     '',
        collapsed: false,
      };
      out.push(node);
      if (isGroup) _flatten(l.children, depth + 1, node.uid, out, hidden, annotation);
    });
    return out;
  }

  // ── MODAL ─────────────────────────────────────────────────

  function _openModal(psd) {
    // Solo desmontar un modal anterior. OJO: no usar _close() aquí — además de
    // quitar el DOM, libera _nodes, y en este punto _nodes ya trae el árbol
    // recién leído del PSD (se quedaría el modal vacío).
    _teardown();
    _cropToContent = true;

    // Pre-asignación de rol por nombre, reutilizando el detector de AutoLayout
    // (mismas keywords que la importación normal de imágenes).
    //
    // Qué llega marcado: solo las hojas que son contenido de verdad. Quedan
    // fuera las ocultas en Photoshop (el diseñador las apagó por algo) y las de
    // anotación (especificaciones, márgenes…). Desmarcadas, no escondidas:
    // siguen en el árbol y se pueden marcar a mano.
    //
    // Y si incluso así son demasiadas, no se marca nada: las plantillas del
    // equipo llegan a 400+ hojas y pre-marcarlas invita a importarlas de golpe.
    const importableLeaves = _nodes.filter(n => !n.isGroup && !n.empty).length;
    const annotations      = _nodes.filter(n => !n.isGroup && !n.empty && n.annotation).length;
    const candidates       = _nodes.filter(n => !n.isGroup && !n.empty && !n.hidden && !n.annotation);
    const autoSelect       = candidates.length <= AUTOSELECT_LIMIT;
    _nodes.forEach(n => {
      if (n.empty) return;
      n.role    = (typeof AutoLayout !== 'undefined' && AutoLayout.detectRole(n.name)) || '';
      n.checked = autoSelect && !n.isGroup && !n.hidden && !n.annotation;
      // Los grupos llegan colapsados cuando hay mucho que mostrar (para que el
      // árbol sea navegable) y también los de anotación, que estorban.
      n.collapsed = n.isGroup && (!autoSelect || n.annotation);
    });

    _overlay = document.createElement('div');
    _overlay.id = 'psd-modal-overlay';
    _overlay.addEventListener('mousedown', e => { if (e.target === _overlay) _close(); });

    const modal = document.createElement('div');
    modal.id = 'psd-modal';

    // Cabecera
    const header = document.createElement('div');
    header.id = 'psd-modal-header';
    const title = document.createElement('div');
    title.id = 'psd-modal-title';
    title.textContent = 'Importar PSD';
    const close = document.createElement('button');
    close.id = 'psd-modal-close';
    close.innerHTML = '&times;';
    close.addEventListener('click', _close);
    header.appendChild(title);
    header.appendChild(close);
    modal.appendChild(header);

    // Subtítulo con datos del documento
    const sub = document.createElement('div');
    sub.id = 'psd-modal-sub';
    const groups = _nodes.filter(n => n.isGroup).length;
    sub.textContent = _psdName + ' — ' + psd.width + '×' + psd.height + ' px · ' +
                      importableLeaves + ' capa' + (importableLeaves === 1 ? '' : 's') +
                      (groups ? ' en ' + groups + ' grupo' + (groups === 1 ? '' : 's') : '') +
                      (annotations ? ' · ' + annotations + ' de anotación, descartadas' : '') +
                      (autoSelect ? '' : ' · son muchas: elige las que necesites');
    modal.appendChild(sub);

    // Barra de herramientas
    const tools = document.createElement('div');
    tools.id = 'psd-tools';
    tools.appendChild(_toolBtn('Expandir todo',  () => { _nodes.forEach(n => n.collapsed = false); _renderTree(); }));
    tools.appendChild(_toolBtn('Colapsar todo',  () => { _nodes.forEach(n => { if (n.isGroup) n.collapsed = true; }); _renderTree(); }));
    tools.appendChild(_toolBtn('Nada',           () => { _nodes.forEach(n => n.checked = false); _renderTree(); }));
    // Selecciona lo que es contenido real: ni ocultas ni anotaciones. Es la
    // contrapartida de "Nada" y lo que se querrá casi siempre con una plantilla.
    tools.appendChild(_toolBtn('Contenido', () => {
      _nodes.forEach(n => n.checked = !n.isGroup && !n.empty && !n.hidden && !n.annotation);
      _renderTree();
    }));
    tools.appendChild(_toolBtn('Las ' + DEFAULT_TOP_N + ' más grandes', () => { _selectTopN(DEFAULT_TOP_N); _renderTree(); }));

    const cropWrap = document.createElement('label');
    cropWrap.className = 'psd-crop-toggle';
    const cropCb = document.createElement('input');
    cropCb.type = 'checkbox';
    cropCb.checked = _cropToContent;
    cropCb.addEventListener('change', () => { _cropToContent = cropCb.checked; });
    cropWrap.appendChild(cropCb);
    cropWrap.appendChild(document.createTextNode('Recortar al contenido'));
    cropWrap.title = 'Activado: cada capa se recorta a sus píxeles opacos, como al exportar un PNG a mano.\n' +
                     'Desactivado: cada capa se exporta al tamaño del documento, conservando su posición relativa en el PSD.';
    tools.appendChild(cropWrap);
    modal.appendChild(tools);

    // Árbol
    const tree = document.createElement('div');
    tree.id = 'psd-tree';
    modal.appendChild(tree);

    // Pie
    const footer = document.createElement('div');
    footer.id = 'psd-modal-footer';
    const count = document.createElement('div');
    count.id = 'psd-count';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'psd-btn psd-btn-cancel';
    btnCancel.textContent = 'Cancelar';
    btnCancel.addEventListener('click', _close);
    const btnOk = document.createElement('button');
    btnOk.className = 'psd-btn psd-btn-ok';
    btnOk.id = 'psd-btn-import';
    btnOk.textContent = 'Importar';
    btnOk.addEventListener('click', _confirm);
    footer.appendChild(count);
    footer.appendChild(btnCancel);
    footer.appendChild(btnOk);
    modal.appendChild(footer);

    _overlay.appendChild(modal);
    document.body.appendChild(_overlay);

    document.addEventListener('keydown', _onKeydown);
    _renderTree();
  }

  function _toolBtn(label, onClick) {
    const b = document.createElement('button');
    b.className = 'psd-tool';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function _onKeydown(e) { if (e.key === 'Escape') _close(); }

  // Quita el modal del DOM y suelta sus listeners, sin tocar los datos leídos.
  function _teardown() {
    document.removeEventListener('keydown', _onKeydown);
    if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
    _overlay = null;
  }

  // Cierre de verdad: además de desmontar, suelta el árbol del PSD (cada nodo
  // referencia un <canvas> de ag-psd, así que conviene liberarlo cuanto antes).
  function _close() {
    _teardown();
    _nodes = [];
  }

  // ── ÁRBOL ─────────────────────────────────────────────────

  // Un nodo se oculta si cualquier ancestro está colapsado.
  function _isRowVisible(node) {
    let p = _byUid(node.parentUid);
    while (p) {
      if (p.collapsed) return false;
      p = _byUid(p.parentUid);
    }
    return true;
  }

  function _byUid(uid) { return uid ? _nodes.find(n => n.uid === uid) : null; }

  function _descendants(node) {
    const out = [];
    const stack = _nodes.filter(n => n.parentUid === node.uid);
    while (stack.length) {
      const n = stack.shift();
      out.push(n);
      _nodes.filter(c => c.parentUid === n.uid).forEach(c => stack.push(c));
    }
    return out;
  }

  function _ancestors(node) {
    const out = [];
    let p = _byUid(node.parentUid);
    while (p) { out.push(p); p = _byUid(p.parentUid); }
    return out;
  }

  // Marcar un grupo y marcar sus hijos son acciones EXCLUYENTES: o se importa
  // el grupo aplanado, o se importan las hojas. Así nunca se importa lo mismo
  // dos veces.
  function _setChecked(node, value) {
    node.checked = value;
    if (!value) return;
    if (node.isGroup) _descendants(node).forEach(d => d.checked = false);
    else _ancestors(node).forEach(a => a.checked = false);
  }

  // Las de anotación quedan fuera a propósito: suelen ocupar todo el documento
  // (márgenes, rellenos de color) y copaban el top-N desplazando al contenido.
  function _selectTopN(n) {
    _nodes.forEach(x => x.checked = false);
    _nodes.filter(x => !x.isGroup && !x.empty && !x.annotation)
          .sort((a, b) => b.area - a.area)
          .slice(0, n)
          .forEach(x => x.checked = true);
  }

  function _renderTree() {
    const tree = document.getElementById('psd-tree');
    if (!tree) return;
    tree.innerHTML = '';

    _nodes.forEach(node => {
      if (!_isRowVisible(node)) return;

      const row = document.createElement('div');
      row.className = 'psd-row' + (node.empty ? ' psd-row-empty' : '') +
                      (node.hidden ? ' psd-row-hidden' : '') +
                      (node.annotation ? ' psd-row-annotation' : '');
      row.style.paddingLeft = (8 + node.depth * 16) + 'px';
      if (node.annotation) {
        row.title = 'Capa de anotación de la plantilla (especificaciones, márgenes, ' +
                    'áreas de reserva…). Viene descartada, pero puedes marcarla si la necesitas.';
      }

      // Triángulo de colapsar (solo grupos)
      const twisty = document.createElement('span');
      twisty.className = 'psd-twisty';
      if (node.isGroup) {
        twisty.textContent = node.collapsed ? '▸' : '▾';
        twisty.addEventListener('click', () => { node.collapsed = !node.collapsed; _renderTree(); });
      }
      row.appendChild(twisty);

      // Checkbox
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'psd-cb';
      cb.checked = node.checked;
      cb.disabled = node.empty;
      cb.addEventListener('change', () => { _setChecked(node, cb.checked); _renderTree(); });
      row.appendChild(cb);

      // Miniatura
      const thumb = document.createElement('div');
      thumb.className = 'psd-thumb';
      if (node.isGroup) {
        thumb.classList.add('psd-thumb-group');
        thumb.textContent = '▣';
      } else if (node.psdLayer.canvas && node.w && node.h) {
        thumb.appendChild(_makeThumb(node.psdLayer.canvas));
      }
      row.appendChild(thumb);

      // Nombre + tamaño
      const label = document.createElement('div');
      label.className = 'psd-name';
      const nm = document.createElement('span');
      nm.className = 'psd-name-text';
      nm.textContent = node.name;
      label.appendChild(nm);
      const meta = document.createElement('span');
      meta.className = 'psd-name-meta';
      if (node.isGroup)      meta.textContent = 'grupo (se aplana)';
      else if (node.empty)   meta.textContent = 'sin píxeles';
      else                   meta.textContent = node.w + '×' + node.h;
      if (node.hidden)     meta.textContent += ' · oculta';
      if (node.annotation) meta.textContent += ' · anotación';
      label.appendChild(meta);
      row.appendChild(label);

      // Dropdown de rol
      const sel = document.createElement('select');
      sel.className = 'psd-role';
      sel.disabled = node.empty;
      ROLE_OPTIONS.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.value === (node.role || '')) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => { node.role = sel.value; });
      row.appendChild(sel);

      tree.appendChild(row);
    });

    _updateCount();
  }

  function _updateCount() {
    const sel = _nodes.filter(n => n.checked && !n.empty);
    const el  = document.getElementById('psd-count');
    const btn = document.getElementById('psd-btn-import');
    if (el)  el.textContent = sel.length
      ? sel.length + ' capa' + (sel.length === 1 ? '' : 's') + ' seleccionada' + (sel.length === 1 ? '' : 's')
      : 'Nada seleccionado';
    if (btn) btn.disabled = sel.length === 0;
  }

  function _makeThumb(srcCanvas) {
    const scale = Math.min(THUMB_MAX / srcCanvas.width, THUMB_MAX / srcCanvas.height, 1);
    const cv = document.createElement('canvas');
    cv.width  = Math.max(1, Math.round(srcCanvas.width  * scale));
    cv.height = Math.max(1, Math.round(srcCanvas.height * scale));
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(srcCanvas, 0, 0, cv.width, cv.height);
    return cv;
  }

  // ── RASTERIZADO ───────────────────────────────────────────

  // Dibuja un nodo sobre un lienzo del tamaño del documento, en su posición
  // original. Para grupos, aplana los hijos visibles (abajo→arriba).
  function _rasterize(node, docW, docH) {
    const cv = document.createElement('canvas');
    cv.width  = docW;
    cv.height = docH;
    const ctx = cv.getContext('2d');

    const paint = l => {
      if (l.hidden) return;
      if (Array.isArray(l.children)) {
        // ag-psd da los hijos de ABAJO ARRIBA, que es justo el orden en que hay
        // que pintarlos: se recorre tal cual (ver nota de orden en _flatten).
        l.children.forEach(paint);
        return;
      }
      if (!l.canvas) return;
      const w = (l.right || 0) - (l.left || 0);
      const h = (l.bottom || 0) - (l.top || 0);
      if (!w || !h) return;
      // ag-psd expone la opacidad en 0–1; toleramos 0–255 por si cambia.
      let op = (typeof l.opacity === 'number') ? l.opacity : 1;
      if (op > 1) op = op / 255;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, op));
      ctx.drawImage(l.canvas, l.left || 0, l.top || 0);
      ctx.restore();
    };

    // La capa elegida se pinta siempre, aunque esté oculta en Photoshop: si el
    // usuario la ha marcado explícitamente, la quiere.
    if (Array.isArray(node.psdLayer.children)) {
      node.psdLayer.children.forEach(paint);
    } else {
      const l = node.psdLayer;
      let op = (typeof l.opacity === 'number') ? l.opacity : 1;
      if (op > 1) op = op / 255;
      ctx.globalAlpha = Math.max(0, Math.min(1, op));
      ctx.drawImage(l.canvas, l.left || 0, l.top || 0);
      ctx.globalAlpha = 1;
    }
    return cv;
  }

  // Bounding box de los píxeles con alfa > 0. null si el lienzo está vacío.
  function _alphaBounds(cv) {
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    let data;
    try {
      data = ctx.getImageData(0, 0, cv.width, cv.height).data;
    } catch (e) {
      console.warn('[ImportPSD] No se pudo leer el lienzo para recortar:', e);
      return null;
    }
    let minX = cv.width, minY = cv.height, maxX = -1, maxY = -1;
    for (let y = 0; y < cv.height; y++) {
      const rowOff = y * cv.width * 4;
      for (let x = 0; x < cv.width; x++) {
        if (data[rowOff + x * 4 + 3] !== 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  function _crop(cv, box) {
    const out = document.createElement('canvas');
    out.width  = box.w;
    out.height = box.h;
    out.getContext('2d').drawImage(cv, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    return out;
  }

  function _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo decodificar el PNG rasterizado'));
      img.src = src;
    });
  }

  // ── CONFIRMAR ─────────────────────────────────────────────

  async function _confirm() {
    const chosen = _nodes.filter(n => n.checked && !n.empty);
    if (!chosen.length) return;

    const psdName  = _psdName;
    const cropMode = _cropToContent;
    // Tamaño exacto del documento: el lienzo de rasterizado debe coincidir con
    // el del PSD para que las posiciones left/top de cada capa cuadren.
    const psdW = _docSize.w, psdH = _docSize.h;

    _close();

    const progress = _showProgress('Importando capas…');
    const formatAtImport = State.activeFormat;
    const newLayers = [];
    const failed    = [];

    try {
      for (const node of chosen) {
        try {
          let cv = _rasterize(node, psdW, psdH);
          let contentBounds = null;

          const box = _alphaBounds(cv);
          if (!box) { failed.push(node.name + ' (totalmente transparente)'); continue; }

          if (cropMode) {
            cv = _crop(cv, box);
          } else {
            // Sin recorte, guardamos dónde está el contenido dentro del lienzo:
            // la automaquetación lo usa para encuadrar igual que con los PNG
            // importados a mano (ver _detectContentBounds en layers.js).
            contentBounds = {
              x: box.x / cv.width,
              y: box.y / cv.height,
              w: box.w / cv.width,
              h: box.h / cv.height,
            };
          }

          const full  = cv.toDataURL('image/png');
          const img   = await _loadImage(full);
          const proxy = (typeof Layers !== 'undefined' && Layers.makeProxy)
            ? Layers.makeProxy(img, 'image/png')
            : null;

          const layer = {
            id:               'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
            name:             node.name,
            src:              proxy || full,
            visible:          true,
            naturalWidth:     img.naturalWidth,
            naturalHeight:    img.naturalHeight,
            originalFilename: node.name + '.png',
            originalMimeType: 'image/png',
            params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' },
            // El rol manda: si el usuario marca TÍTULO H/V, AutoLayout promueve
            // la capa a isTitleLayer y le aplica las zonas de fit.
            isTitleLayer:     false,
            psdOrigin:        psdName,
          };
          if (proxy) layer.srcOriginal = full;
          if (contentBounds) layer.contentBounds = contentBounds;
          if (TEXT_MASTER_FORMATS.includes(formatAtImport)) layer.exclusiveFormat = formatAtImport;

          newLayers.push({ layer, role: node.role || null });
        } catch (err) {
          console.warn('[ImportPSD] Falló la capa "' + node.name + '":', err);
          failed.push(node.name);
        }
      }
    } finally {
      progress.remove();
    }

    if (!newLayers.length) {
      alert('No se pudo importar ninguna capa del PSD.' +
            (failed.length ? '\n\nCapas descartadas:\n' + failed.join('\n') : ''));
      return;
    }

    _commit(newLayers, failed);
  }

  // Inserta las capas en State y dispara la automaquetación con los roles ya
  // decididos en nuestro modal (preRoles → AutoLayout no abre su propio modal).
  function _commit(entries, failed) {
    if (typeof History !== 'undefined') History.push();

    // Mismo punto de inserción que la importación normal: por debajo de las
    // capas auto-generadas (composiciones, marcas) y de los títulos.
    let ci = 0;
    while (ci < State.layers.length && (
      State.layers[ci].isComposicion || State.layers[ci].isComposicionMovil ||
      State.layers[ci].isComposicionAmazon || State.layers[ci].isMarcaIplus ||
      State.layers[ci].isMarcaSony || State.layers[ci].isTitleLayer)) {
      ci++;
    }

    const layers   = entries.map(e => e.layer);
    const preRoles = {};
    entries.forEach(e => { preRoles[e.layer.id] = e.role; });

    // Se insertan en el orden del árbol para conservar el apilado del PSD.
    layers.forEach((l, i) => State.layers.splice(ci + i, 0, l));

    const last = layers[layers.length - 1];
    State.selectedLayerId  = last.id;
    State.selectedLayerIds = [last.id];

    if (typeof Layers !== 'undefined') Layers.render();
    if (typeof Canvas !== 'undefined') Canvas.render();
    if (typeof UI     !== 'undefined') UI.updateSliders();

    if (failed.length) {
      alert('Se importaron ' + layers.length + ' capa(s).\n\n' +
            'No se pudieron importar:\n' + failed.join('\n'));
    }

    // Dispara la maquetación automática exactamente igual que la importación de
    // imágenes, pero sin volver a preguntar los roles.
    setTimeout(() => {
      if (typeof AutoLayout === 'undefined') return;
      const rolesEmpty = !State.layerRoles || Object.keys(State.layerRoles).length === 0;
      if (rolesEmpty) AutoLayout.onFirstImport(layers, preRoles);
      else if (AutoLayout.onAdditionalImport) AutoLayout.onAdditionalImport(layers, preRoles);
    }, 150);
  }

  // ── AVISO DE PROGRESO ─────────────────────────────────────

  function _showProgress(text) {
    const el = document.createElement('div');
    el.id = 'psd-progress';
    el.textContent = text;
    document.body.appendChild(el);
    return { remove: () => { if (el.parentNode) el.parentNode.removeChild(el); } };
  }

  // No hay init(): este módulo no tiene botón propio. El punto de entrada único
  // es el botón de añadir capa, y _routeImport() de layers.js llama aquí cuando
  // lo seleccionado es un PSD/PSB.
  return { importFile: _handleFile };
})();
