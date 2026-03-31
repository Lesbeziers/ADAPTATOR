// ============================================================
// LOGOS.JS — Modal de selección de logos
// ============================================================

const Logos = (() => {

  const CATEGORIES = ['CANALES', 'DEPORTES', 'MOVISTAR+', 'PARTNERS'];

  // ── ÍNDICE DE LOGOS (embebido) ────────────────────────────
  const LOGOS_DATA = [
    // CANALES
    {name:'Accion por M+ Color Negativo',file:'Accion_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Accion por M+ Color Positivo',file:'Accion_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Bar Blanco',file:'Bar_Blanco.svg',category:'CANALES'},
    {name:'Champions Tour Color Negativo',file:'Champions_Tour_Col_Neg.svg',category:'CANALES'},
    {name:'Champions Tour Color Positivo',file:'Champions_Tour_Col_Pos.svg',category:'CANALES'},
    {name:'Champions Tour por M+ Color Positivo',file:'Champions_Tour_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Champions Tour por M+ Color Negativo',file:'Champions_Tour_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Cine Espanol por M+ Color Negativo',file:'Cine_Espanol_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Cine Espanol por M+ Color Positivo',file:'Cine_Espanol_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Cine por M+ Color Negativo',file:'Cine_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Cine por M+ Color Positivo',file:'Cine_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Clasicos por M+ Color Negativo',file:'Clasicos_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Clasicos por M+ Color Positivo',file:'Clasicos_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Comedia por M+ Color Positivo',file:'Comedia_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Comedia por M+ Color Negativo',file:'Comedia_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Copa Del Rey por M+ Color Negativo',file:'Copa_Del_Rey_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Copa Del Rey por M+ Color Positivo',file:'Copa_del_Rey_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Copa Del Rey UHD por M+ Color Negativo',file:'Copa_Del_Rey_UHD_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Copa Del Rey UHD por M+ Color Positivo',file:'Copa_Del_Rey_UHD_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Deportes 2 por M+ Color Negativo',file:'Deportes_2_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Deportes 2 por M+ Color Positivo',file:'Deportes_2_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Deportes 3 por M+ Color Negativo',file:'Deportes_3_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Deportes 3 por M+ Color Positivo',file:'Deportes_3_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Deportes 4 por M+ Color Negativo',file:'Deportes_4_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Deportes 4 por M+ Color Positivo',file:'Deportes_4_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Deportes 5 por M+ Color Negativo',file:'Deportes_5_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Deportes 5 por M+ Color Positivo',file:'Deportes_5_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Deportes 6 por M+ Color Negativo',file:'Deportes_6_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Deportes 6 por M+ Color Positivo',file:'Deportes_6_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Deportes 7 por M+ Color Negativo',file:'Deportes_7_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Deportes 7 por M+ Color Positivo',file:'Deportes_7_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Deportes 8 por M+ Color Negativo',file:'Deportes_8_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Deportes 8 por M+ Color Positivo',file:'Deportes_8_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Deportes 9 por M+ Color Negativo',file:'Deportes_9_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Deportes 9 por M+ Color Positivo',file:'Deportes_9_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Deportes por M+ Color Negativo',file:'Deportes_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Deportes por M+ Color Positivo',file:'Deportes_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Documentales por M+ Color Negativo',file:'Documentales_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Documentales por M+ Color Positivo',file:'Documentales_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Drama por M+ Color Negativo',file:'Drama_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Drama por M+ Color Positivo',file:'Drama_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Ellas Vamos por M+ Color Negativo',file:'Ellas_Vamos_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Ellas Vamos por M+ Color Positivo',file:'Ellas_Vamos_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Estrenos por M+ Color Negativo',file:'Estrenos_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Estrenos por M+ Color Positivo',file:'Estrenos_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Golf 2 por M+ Color Negativo',file:'Golf_2_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Golf 2 por M+ Color Positivo',file:'Golf_2_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Golf por M+ Color Negativo',file:'Golf_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Golf por M+ Color Positivo',file:'Golf_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Hits por M+ Color Negativo',file:'Hits_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Hits por M+ Color Positivo',file:'Hits_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Indie por M+ Color Negativo',file:'Indie_por_M+_Col_Neg.svg',category:'CANALES'},
    {name:'Indie por M+ Color Positivo',file:'Indie_por_M+_Col_Pos.svg',category:'CANALES'},
    {name:'Info Blanco',file:'Info_Blanco.svg',category:'CANALES'},
    {name:'Info Negro',file:'Info_Negro.svg',category:'CANALES'},
    {name:'LaLiga 2 HDR por M+ Color Negativo',file:'LaLiga_2_HDR_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'LaLiga 2 HDR por M+ Color Positivo',file:'LaLiga_2_HDR_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'LaLiga 2 por M+ Color Negativo',file:'LaLiga_2_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'LaLiga 2 por M+ Color Positivo',file:'LaLiga_2_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'LaLiga 3 por M+ Color Negativo',file:'LaLiga_3_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'LaLiga 3 por M+ Color Positivo',file:'LaLiga_3_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'LaLiga 4 por M+ Color Negativo',file:'LaLiga_4_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'LaLiga 4 por M+ Color Positivo',file:'LaLiga_4_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'LaLiga HDR por M+ Color Negativo',file:'LaLiga_HDR_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'LaLiga HDR por M+ Color Positivo',file:'LaLiga_HDR_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'LaLiga por M+ Color Negativo',file:'LaLiga_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'LaLiga por M+ Color Positivo',file:'LaLiga_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Liga de Campeones por M+ Color Negativo',file:'Liga_de_Campeones_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Liga de Campeones por M+ Color Positivo',file:'Liga_de_Campeones_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Liga de Campeones UHD por M+ Color Negativo',file:'Liga_de_Campeones_UHD_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Liga de Campeones UHD por M+ Color Positivo',file:'Liga_de_Campeones_UHD_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'M+ Blanco',file:'M+_Blanco.svg',category:'CANALES'},
    {name:'M+ Negro',file:'M+_Negro.svg',category:'CANALES'},
    {name:'M+ 2 Blanco',file:'M+_2_Blanco.svg',category:'CANALES'},
    {name:'M+ 2 Negro',file:'M+_2_Negro.svg',category:'CANALES'},
    {name:'M+ UHD Blanco',file:'M+_UHD_Blanco.svg',category:'CANALES'},
    {name:'M+ UHD Negro',file:'M+_UHD_Negro.svg',category:'CANALES'},
    {name:'Mix 2 por M+ Color Negativo',file:'Mix_2_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Mix 2 por M+ Color Positivo',file:'Mix_2_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Mix por M+ Color Negativo',file:'Mix_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Mix por M+ Color Positivo',file:'Mix_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Multi Cine Blanco',file:'Multi_Cine_Blanco.svg',category:'CANALES'},
    {name:'Multi Cine Negro',file:'Multi_Cine_Negro.svg',category:'CANALES'},
    {name:'Multi Deporte Blanco',file:'Multi_Deporte_Blanco.svg',category:'CANALES'},
    {name:'Multi Deporte Negro',file:'Multi_Deporte_Negro.svg',category:'CANALES'},
    {name:'Musica por M+ Color Negativo',file:'Musica_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Musica por M+ Color Positivo',file:'Musica_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Originales por M+ Color Negativo',file:'Originales_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Originales por M+ Color Positivo',file:'Originales_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Portada Blanco',file:'Portada_Blanco.svg',category:'CANALES'},
    {name:'Portada Negro',file:'Portada_Negro.svg',category:'CANALES'},
    {name:'Series por M+ Color Negativo',file:'Series_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Series por M+ Color Positivo',file:'Series_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Suspense por M+ Color Negativo',file:'Suspense_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Suspense por M+ Color Positivo',file:'Suspense_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'PopUp Vacaciones por M+ Color Negativo',file:'PopUp_Vacaciones_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'PopUp Vacaciones por M+ Color Positivo',file:'PopUp_Vacaciones_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Vamos 2 por M+ Color Negativo',file:'Vamos_2_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Vamos 2 por M+ Color Positivo',file:'Vamos_2_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Vamos Bar 2 por M+ Color Negativo',file:'Vamos_Bar_2_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Vamos Bar 2 por M+ Color Positivo',file:'Vamos_Bar_2_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Vamos Bar 3 por M+ Color Negativo',file:'Vamos_Bar_3_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Vamos Bar 3 por M+ Color Positivo',file:'Vamos_Bar_3_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Vamos Bar por M+ Color Negativo',file:'Vamos_Bar_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Vamos Bar por M+ Color Positivo',file:'Vamos_Bar_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Vamos por M+ Color Negativo',file:'Vamos_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Vamos por M+ Color Positivo',file:'Vamos_porM+_Col_Pos.svg',category:'CANALES'},
    {name:'Wimbledon UHD por M+ Color Negativo',file:'Wimbledon_UHD_porM+_Col_Neg.svg',category:'CANALES'},
    {name:'Wimbledon UHD por M+ Color Positivo',file:'Wimbledon_UHD_porM+_Col_Pos.svg',category:'CANALES'},
    // DEPORTES
    {name:'Champions League Negativo',file:'Champions_League_Neg.svg',category:'DEPORTES'},
    {name:'Champions League Positivo',file:'Champions_League_Pos.svg',category:'DEPORTES'},
    // MOVISTAR+
    {name:'M+ Logotipo Negativo',file:'M+_Logotipo_Neg.svg',category:'MOVISTAR+'},
    {name:'M+ Logotipo Positivo',file:'M+_Logotipo_Pos.svg',category:'MOVISTAR+'},
    // PARTNERS
    {name:'Apple TV',file:'Apple_TV.svg',category:'PARTNERS'},
    {name:'ATRESMEDIA Color Negativo',file:'ATRESMEDIA_Col_Neg.svg',category:'PARTNERS'},
    {name:'ATRESMEDIA Color Positivo',file:'ATRESMEDIA_Col_Pos.svg',category:'PARTNERS'},
    {name:'ATRESMEDIA Trazo Negativo',file:'ATRESMEDIA_Trazo_Neg.svg',category:'PARTNERS'},
    {name:'ATRESMEDIA Trazo Positivo',file:'ATRESMEDIA_Trazo_Pos.svg',category:'PARTNERS'},
    {name:'ATRESMEDIA Trazo Vertical Negativo',file:'ATRESMEDIA_Trazo_Ver_Neg.svg',category:'PARTNERS'},
    {name:'ATRESMEDIA Trazo Vertical Positivo',file:'ATRESMEDIA_Trazo_Ver_Pos.svg',category:'PARTNERS'},
    {name:'ATRESMEDIA Vertical Color Negativo',file:'ATRESMEDIA_Ver_Col_Neg.svg',category:'PARTNERS'},
    {name:'ATRESMEDIA Vertical Color Positivo',file:'ATRESMEDIA_Ver_Col_Pos.svg',category:'PARTNERS'},
    {name:'DAZN Positivo',file:'DAZN_Pos.svg',category:'PARTNERS'},
    {name:'DAZN Negativo',file:'DAZN_Neg.svg',category:'PARTNERS'},
  ].map(l => ({ ...l, path: `assets/img/logos/${l.category}/${l.file}`, search: l.name.toLowerCase() }));

  let _filtered  = [];
  let _selected  = null;
  let _activeTab = 'TODOS';

  // ── INIT ──────────────────────────────────────────────────

  function init() {
    document.getElementById('btn-add-logo')
      ?.addEventListener('click', open);
  }

  // ── OPEN / CLOSE ──────────────────────────────────────────

  function open() {
    _selected  = null;
    _activeTab = 'TODOS';
    _buildModal();
    _filter('');
  }

  function close() {
    document.getElementById('logos-modal-overlay')?.remove();
    _selected = null;
  }

  // ── BUILD MODAL ───────────────────────────────────────────

  function _buildModal() {
    document.getElementById('logos-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'logos-modal-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    const modal = document.createElement('div');
    modal.id = 'logos-modal';

    // Header
    const header = document.createElement('div');
    header.id = 'logos-modal-header';
    const title = document.createElement('span');
    title.id = 'logos-modal-title';
    title.textContent = 'LOGOS';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'logos-modal-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', close);
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Buscador
    const searchWrap = document.createElement('div');
    searchWrap.id = 'logos-search-wrap';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'logos-search';
    searchInput.placeholder = 'Buscar logo...';
    searchInput.addEventListener('input', e => _filter(e.target.value));
    searchWrap.appendChild(searchInput);

    // Tabs categorías
    const tabs = document.createElement('div');
    tabs.id = 'logos-tabs';
    ['TODOS', ...CATEGORIES].forEach(cat => {
      const tab = document.createElement('button');
      tab.className = 'logos-tab' + (cat === _activeTab ? ' active' : '');
      tab.textContent = cat;
      tab.dataset.cat = cat;
      tab.addEventListener('click', () => {
        _activeTab = cat;
        tabs.querySelectorAll('.logos-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
        _filter(searchInput.value);
      });
      tabs.appendChild(tab);
    });

    // Grid
    const grid = document.createElement('div');
    grid.id = 'logos-grid';

    // Footer
    const footer = document.createElement('div');
    footer.id = 'logos-modal-footer';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'logos-btn logos-btn-cancel';
    cancelBtn.textContent = 'CANCELAR';
    cancelBtn.addEventListener('click', close);
    const addBtn = document.createElement('button');
    addBtn.className = 'logos-btn logos-btn-add';
    addBtn.id = 'logos-btn-add';
    addBtn.textContent = 'AÑADIR LOGO';
    addBtn.disabled = true;
    addBtn.addEventListener('click', _addLogo);
    footer.appendChild(cancelBtn);
    footer.appendChild(addBtn);

    modal.appendChild(header);
    modal.appendChild(searchWrap);
    modal.appendChild(tabs);
    modal.appendChild(grid);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => searchInput.focus(), 50);
  }

  // ── FILTRO + RENDER GRID ──────────────────────────────────

  function _filter(query) {
    const q = query.trim().toLowerCase();
    _filtered = LOGOS_DATA.filter(l => {
      const catOk    = _activeTab === 'TODOS' || l.category === _activeTab;
      const searchOk = !q || l.search.includes(q);
      return catOk && searchOk;
    });
    _renderGrid();
  }

  function _renderGrid() {
    const grid = document.getElementById('logos-grid');
    if (!grid) return;
    grid.innerHTML = '';
    _selected = null;
    _updateAddBtn();

    if (_filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'logos-empty';
      empty.textContent = 'No se encontraron logos';
      grid.appendChild(empty);
      return;
    }

    _filtered.forEach(logo => {
      const card = document.createElement('div');
      card.className = 'logos-card';
      card.dataset.path = logo.path;

      const thumb = document.createElement('div');
      thumb.className = 'logos-thumb';
      const img = document.createElement('img');
      img.src = logo.path;
      img.alt = logo.name;
      img.loading = 'lazy';
      thumb.appendChild(img);

      const name = document.createElement('span');
      name.className = 'logos-card-name';
      name.textContent = logo.name;

      const cat = document.createElement('span');
      cat.className = 'logos-card-cat';
      cat.textContent = logo.category;

      card.appendChild(thumb);
      card.appendChild(name);
      card.appendChild(cat);

      card.addEventListener('click', () => {
        grid.querySelectorAll('.logos-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        _selected = logo;
        _updateAddBtn();
      });

      card.addEventListener('dblclick', () => {
        _selected = logo;
        _addLogo();
      });

      grid.appendChild(card);
    });
  }

  function _updateAddBtn() {
    const btn = document.getElementById('logos-btn-add');
    if (btn) btn.disabled = !_selected;
  }

  // ── AÑADIR LOGO ───────────────────────────────────────────

  function _addLogo() {
    if (!_selected) return;
    const logo = _selected;
    close();

    const formatAtImport = State.activeFormat;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Convertir a dataURL para que el CSS mask-image funcione con el tint
      const cv = document.createElement('canvas');
      cv.width  = img.naturalWidth  || 200;
      cv.height = img.naturalHeight || 200;
      cv.getContext('2d').drawImage(img, 0, 0);
      let dataUrl;
      try { dataUrl = cv.toDataURL('image/png'); } catch(e) { dataUrl = logo.path; }

      const layer = {
        id:            'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        name:          logo.name,
        src:           dataUrl,
        isLogo:        true,
        logoPath:      logo.path,
        visible:       true,
        naturalWidth:  cv.width,
        naturalHeight: cv.height,
        params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' },
      };
      if (formatAtImport === 'MUX4 TXT' || formatAtImport === 'MOVIL TXT' || formatAtImport === 'AMAZON LOGO') layer.exclusiveFormat = formatAtImport;

      let _ci = 0;
    while (_ci < State.layers.length && (State.layers[_ci].isComposicion || State.layers[_ci].isComposicionMovil || State.layers[_ci].isMarcaIplus || State.layers[_ci].isTitleLayer)) {
      _ci++;
    }
      if (typeof History !== 'undefined') History.push();
      State.layers.splice(_ci, 0, layer);
      State.selectedLayerId  = layer.id;
      State.selectedLayerIds = [layer.id];
      if (typeof Layers !== 'undefined') Layers.render();
      if (typeof Canvas !== 'undefined') Canvas.render();
      if (typeof UI     !== 'undefined') UI.updateSliders();
    };
    img.onerror = () => {
      // Fallback: añadir con ruta directa si falla la conversión
      const layer = {
        id:            'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        name:          logo.name,
        src:           logo.path,
        isLogo:        true,
        logoPath:      logo.path,
        visible:       true,
        naturalWidth:  200,
        naturalHeight: 200,
        params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' },
      };
      if (formatAtImport === 'MUX4 TXT' || formatAtImport === 'MOVIL TXT' || formatAtImport === 'AMAZON LOGO') layer.exclusiveFormat = formatAtImport;
      let _ci = 0;
    while (_ci < State.layers.length && (State.layers[_ci].isComposicion || State.layers[_ci].isComposicionMovil || State.layers[_ci].isMarcaIplus || State.layers[_ci].isTitleLayer)) {
      _ci++;
    }
      if (typeof History !== 'undefined') History.push();
      State.layers.splice(_ci, 0, layer);
      State.selectedLayerId  = layer.id;
      State.selectedLayerIds = [layer.id];
      if (typeof Layers !== 'undefined') Layers.render();
      if (typeof Canvas !== 'undefined') Canvas.render();
      if (typeof UI     !== 'undefined') UI.updateSliders();
    };
    img.src = logo.path;
  }

  return { init, open };
})();
