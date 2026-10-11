/* ============================================
   ADMIN.JS — Panel de Administración
   CRUD con listas desplegables y checkboxes
   ============================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'cuaderno_recetas_admin';
  const DATA_URL = '../data/recetas.json';
  const CONFIG_URL = '../data/config.json';

  let recetas = [];
  let config = null;
  let recetaEditando = null;

  // Listas predefinidas
  const FENOMENOS_CIENCIA = [
    { value: 'emulsion', label: 'Emulsión' },
    { value: 'cristalizacion', label: 'Cristalización' },
    { value: 'coagulacion_proteinas', label: 'Coagulación de proteínas' },
    { value: 'gelificacion', label: 'Gelificación' },
    { value: 'aireado', label: 'Aireado' },
    { value: 'gelatinizacion_almidon', label: 'Gelatinización del almidón' },
    { value: 'reaccion_maillard', label: 'Reacción de Maillard' },
    { value: 'caramelizacion', label: 'Caramelización' },
    { value: 'fermentacion', label: 'Fermentación' },
    { value: 'extraccion', label: 'Extracción' },
    { value: 'temperado', label: 'Temperado' },
    { value: 'sol-gel', label: 'Sol-Gel' }
  ];

  const BPM_COMUNES = [
    'Lavado de manos antes de manipular',
    'Superficie desinfectada',
    'Uso de guantes',
    'Uso de cofia o redecilla',
    'Evitar contaminación cruzada',
    'Temperatura de frío controlada (< 5°C)',
    'Utensilios limpios y desinfectados'
  ];

  const ANMAT_COMUNES = [
    'Rotulado según CAA art. 235',
    'Declaración de alérgenos',
    'Fecha de elaboración y vencimiento',
    'Registro de establecimiento',
    'Condiciones de conservación'
  ];

  // --- Utilidades ---

  function generarId(nombre) {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 40) + '-' + Date.now().toString(36);
  }

  function mostrarStatus(mensaje, tipo) {
    const el = document.getElementById('admin-status');
    if (!el) return;
    el.textContent = mensaje;
    el.style.color = tipo === 'error' ? '#8b0000' : '#555';
    setTimeout(() => { el.textContent = ''; }, 4000);
  }

  function guardarEnStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recetas));
  }

  function cargarDesdeStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  // --- Carga inicial ---

  async function cargarConfig() {
    try {
      const resp = await fetch(CONFIG_URL);
      config = await resp.json();
    } catch (e) {
      console.warn('No se pudo cargar config.json', e);
      config = { categorias: [] };
    }
  }

  async function cargarRecetas() {
    const desdeStorage = cargarDesdeStorage();
    if (desdeStorage) {
      recetas = desdeStorage;
      mostrarStatus('Cargado desde localStorage');
    } else {
      try {
        const resp = await fetch(DATA_URL);
        recetas = await resp.json();
        guardarEnStorage();
        mostrarStatus('Cargado desde data/recetas.json');
      } catch (e) {
        recetas = [];
        mostrarStatus('Error al cargar recetas.json', 'error');
      }
    }
    renderTabla();
  }

  // --- Render de la tabla ---

  function renderTabla() {
    const tbody = document.getElementById('tabla-recetas');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (recetas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No hay recetas cargadas.</td></tr>';
      return;
    }

    recetas.forEach((receta, index) => {
      const tr = document.createElement('tr');
      const activa = receta.activa !== false;
      const tags = Array.isArray(receta.tags) ? receta.tags.join(', ') : '';

      tr.innerHTML = `
        <td><code>${receta.id || ''}</code></td>
        <td>${receta.nombre || ''}</td>
        <td>${receta.bloque || ''}</td>
        <td>${receta.categoria || ''}</td>
        <td>${tags}</td>
        <td class="${activa ? 'estado-activa' : 'estado-suspendida'}">
          ${activa ? 'Activa' : 'Suspendida'}
        </td>
        <td class="acciones-cell">
          <button class="btn btn-secondary btn-small" data-accion="editar" data-index="${index}">Editar</button>
          <button class="btn ${activa ? 'btn-danger' : 'btn-secondary'} btn-small" data-accion="suspender" data-index="${index}">
            ${activa ? 'Suspender' : 'Reactivar'}
          </button>
          <button class="btn btn-danger btn-small" data-accion="eliminar" data-index="${index}">Eliminar</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-accion]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const accion = e.target.dataset.accion;
        const index = parseInt(e.target.dataset.index, 10);
        manejarAccion(accion, index);
      });
    });
  }

  // --- Poblar select de categorías ---

  function poblarSelectCategorias() {
    const select = document.getElementById('campo-categoria');
    if (!select || !config) return;
    
    const categorias = config.categorias || [];
    select.innerHTML = '<option value="">— Seleccionar —</option>' +
      categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  }

  // --- Poblar checkboxes de BPM y ANMAT ---

  function renderChecklist(containerId, opciones, seleccionadas, nombreClase) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    opciones.forEach(opcion => {
      const label = document.createElement('label');
      label.className = 'checklist-item';
      const checked = Array.isArray(seleccionadas) && seleccionadas.includes(opcion);
      label.innerHTML = `
        <input type="checkbox" class="${nombreClase}" value="${opcion}" ${checked ? 'checked' : ''}>
        <span>${opcion}</span>
      `;
      container.appendChild(label);
    });
  }

  function obtenerChecklistSeleccionados(nombreClase) {
    const checks = document.querySelectorAll(`.${nombreClase}:checked`);
    return Array.from(checks).map(c => c.value);
  }

  // --- Acciones ---

  function manejarAccion(accion, index) {
    const receta = recetas[index];
    if (!receta) return;

    switch (accion) {
      case 'editar':
        abrirFormulario(receta, index);
        break;
      case 'suspender':
        receta.activa = receta.activa === false ? true : false;
        guardarEnStorage();
        renderTabla();
        mostrarStatus(receta.activa ? 'Receta reactivada' : 'Receta suspendida');
        break;
      case 'eliminar':
        if (confirm(`¿Eliminar permanentemente la receta "${receta.nombre}"? Esta acción no se puede deshacer.`)) {
          recetas.splice(index, 1);
          guardarEnStorage();
          renderTabla();
          mostrarStatus('Receta eliminada');
        }
        break;
    }
  }

  // --- Formulario ---

  function abrirFormulario(receta, index) {
    recetaEditando = { receta, index };
    document.getElementById('form-titulo').textContent = index === null ? 'Nueva Receta' : 'Editar Receta';
    document.getElementById('form-edicion').classList.remove('hidden');

    // Poblar categorías
    poblarSelectCategorias();

    // Rellenar campos básicos
    document.getElementById('campo-id').value = receta.id || '';
    document.getElementById('campo-nombre').value = receta.nombre || '';
    document.getElementById('campo-bloque').value = receta.bloque || '';
    document.getElementById('campo-categoria').value = receta.categoria || '';
    document.getElementById('campo-tags').value = Array.isArray(receta.tags) ? receta.tags.join(', ') : '';
    document.getElementById('campo-porciones').value = receta.porciones || '';

    // Molde
    const molde = receta.molde || {};
    document.getElementById('campo-molde-forma').value = molde.forma || '';
    document.getElementById('campo-molde-diametro').value = molde.diametro_cm || '';
    document.getElementById('campo-molde-altura').value = molde.altura_cm || '';
    document.getElementById('campo-molde-tipo').value = molde.tipo || '';
    document.getElementById('campo-molde-cavidades').value = molde.cavidades || '';
    document.getElementById('campo-molde-peso').value = molde.peso_pieza_g || '';

    // Escalado
    const esc = receta.escalado || {};
    document.getElementById('campo-escalado-tipo').value = esc.tipo || '';
    document.getElementById('campo-escalado-base-cm').value = esc.base_cm || '';
    document.getElementById('campo-escalado-regla').value = esc.regla || '';
    document.getElementById('campo-escalado-altura-fija').checked = esc.altura_fija || false;

    // Sub-recetas
    renderSubRecetas(receta.sub_recetas || []);

    // Ciencia
    renderCiencia(receta.ciencia || []);

    // BPM — separar los que están en la lista predefinida de los extra
    const bpmSeleccionados = (receta.bpm || []).filter(b => BPM_COMUNES.includes(b));
    const bpmExtra = (receta.bpm || []).filter(b => !BPM_COMUNES.includes(b));
    renderChecklist('bpm-container', BPM_COMUNES, bpmSeleccionados, 'bpm-check');
    document.getElementById('campo-bpm-extra').value = bpmExtra.join('\n');

    // ANMAT
    const anmatSeleccionados = (receta.anmat || []).filter(a => ANMAT_COMUNES.includes(a));
    const anmatExtra = (receta.anmat || []).filter(a => !ANMAT_COMUNES.includes(a));
    renderChecklist('anmat-container', ANMAT_COMUNES, anmatSeleccionados, 'anmat-check');
    document.getElementById('campo-anmat-extra').value = anmatExtra.join('\n');

    // Rendimiento
    const rend = receta.rendimiento || {};
    document.getElementById('campo-rendimiento-unidades').value = rend.unidades || '';
    document.getElementById('campo-rendimiento-peso-pieza').value = rend.peso_pieza_g || '';
    document.getElementById('campo-rendimiento-peso-total').value = rend.peso_total_g || '';

    // Referencias
    const refs = Array.isArray(receta.referencias)
      ? receta.referencias.map(r => `${r.libro || ''}, ${r.capitulo || ''}, ${r.pagina || ''}`).join('\n')
      : '';
    document.getElementById('campo-referencias').value = refs;

    document.getElementById('form-edicion').scrollIntoView({ behavior: 'smooth' });
  }

  function cerrarFormulario() {
    recetaEditando = null;
    document.getElementById('form-edicion').classList.add('hidden');
    document.getElementById('form-receta').reset();
  }

  // --- Sub-recetas dinámicas ---

  function renderSubRecetas(subRecetas) {
    const container = document.getElementById('sub-recetas-container');
    if (!container) return;
    container.innerHTML = '';

    subRecetas.forEach((sr, i) => {
      const block = document.createElement('div');
      block.className = 'sub-receta-block';
      block.dataset.index = i;
      block.innerHTML = `
        <h4>Sub-receta ${i + 1}</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>ID</label>
            <input type="text" class="sr-id" value="${sr.id || ''}">
          </div>
          <div class="form-group">
            <label>Nombre</label>
            <input type="text" class="sr-nombre" value="${sr.nombre || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Ingredientes (uno por línea: nombre | cantidad_g | rol | notas)</label>
          <textarea class="sr-ingredientes" rows="4">${(sr.ingredientes || []).map(ing =>
            `${ing.nombre} | ${ing.cantidad_g} | ${ing.rol || ''} | ${ing.notas || ''}`
          ).join('\n')}</textarea>
        </div>
        <div class="form-group">
          <label>Etapas (una por línea: nombre | duracion_min | temperatura_c | tecnica | descripcion | ciencia_ref)</label>
          <textarea class="sr-etapas" rows="4">${(sr.etapas || []).map(et =>
            `${et.nombre} | ${et.duracion_min || ''} | ${et.temperatura_c || ''} | ${et.tecnica || ''} | ${et.descripcion || ''} | ${et.ciencia_ref || ''}`
          ).join('\n')}</textarea>
        </div>
        <div class="sub-receta-actions">
          <button type="button" class="btn btn-danger btn-small btn-eliminar-sub-receta">Eliminar sub-receta</button>
        </div>
      `;
      container.appendChild(block);
    });

    container.querySelectorAll('.btn-eliminar-sub-receta').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const block = e.target.closest('.sub-receta-block');
        block.remove();
      });
    });
  }

  function agregarSubReceta() {
    const container = document.getElementById('sub-recetas-container');
    if (!container) return;
    const count = container.querySelectorAll('.sub-receta-block').length;
    const block = document.createElement('div');
    block.className = 'sub-receta-block';
    block.dataset.index = count;
    block.innerHTML = `
      <h4>Sub-receta ${count + 1}</h4>
      <div class="form-grid">
        <div class="form-group">
          <label>ID</label>
          <input type="text" class="sr-id" value="">
        </div>
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" class="sr-nombre" value="">
        </div>
      </div>
      <div class="form-group">
        <label>Ingredientes (uno por línea: nombre | cantidad_g | rol | notas)</label>
        <textarea class="sr-ingredientes" rows="4" placeholder="harina 0000 | 250 | estructura | tamizada"></textarea>
      </div>
      <div class="form-group">
        <label>Etapas (una por línea: nombre | duracion_min | temperatura_c | tecnica | descripcion | ciencia_ref)</label>
        <textarea class="sr-etapas" rows="4" placeholder="Batido | 8 | 22 | cremado | Batir hasta blanquear | aireado"></textarea>
      </div>
      <div class="sub-receta-actions">
        <button type="button" class="btn btn-danger btn-small btn-eliminar-sub-receta">Eliminar sub-receta</button>
      </div>
    `;
    container.appendChild(block);

    block.querySelector('.btn-eliminar-sub-receta').addEventListener('click', () => {
      block.remove();
    });
  }

  // --- Ciencia dinámica ---

  function renderCiencia(ciencia) {
    const container = document.getElementById('ciencia-container');
    if (!container) return;
    container.innerHTML = '';

    ciencia.forEach((c, i) => {
      const block = document.createElement('div');
      block.className = 'ciencia-block';
      
      const opcionesFenomeno = FENOMENOS_CIENCIA.map(f => 
        `<option value="${f.value}" ${c.fenomeno === f.value ? 'selected' : ''}>${f.label}</option>`
      ).join('');
      
      block.innerHTML = `
        <h4>Bloque de ciencia ${i + 1}</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Fenómeno</label>
            <select class="ci-fenomeno">
              <option value="">— Seleccionar —</option>
              ${opcionesFenomeno}
            </select>
          </div>
          <div class="form-group">
            <label>Referencia</label>
            <input type="text" class="ci-referencia" value="${c.referencia || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Explicación</label>
          <textarea class="ci-explicacion" rows="2">${c.explicacion || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Punto crítico</label>
          <textarea class="ci-punto-critico" rows="2">${c.punto_critico || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Error típico</label>
          <textarea class="ci-error-tipico" rows="2">${c.error_tipico || ''}</textarea>
        </div>
        <div class="ciencia-actions">
          <button type="button" class="btn btn-danger btn-small btn-eliminar-ciencia">Eliminar bloque</button>
        </div>
      `;
      container.appendChild(block);
    });

    container.querySelectorAll('.btn-eliminar-ciencia').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.ciencia-block').remove();
      });
    });
  }

  function agregarCiencia() {
    const container = document.getElementById('ciencia-container');
    if (!container) return;
    const count = container.querySelectorAll('.ciencia-block').length;
    const block = document.createElement('div');
    block.className = 'ciencia-block';
    
    const opcionesFenomeno = FENOMENOS_CIENCIA.map(f => 
      `<option value="${f.value}">${f.label}</option>`
    ).join('');
    
    block.innerHTML = `
      <h4>Bloque de ciencia ${count + 1}</h4>
      <div class="form-grid">
        <div class="form-group">
          <label>Fenómeno</label>
          <select class="ci-fenomeno">
            <option value="">— Seleccionar —</option>
            ${opcionesFenomeno}
          </select>
        </div>
        <div class="form-group">
          <label>Referencia</label>
          <input type="text" class="ci-referencia" value="">
        </div>
      </div>
      <div class="form-group">
        <label>Explicación</label>
        <textarea class="ci-explicacion" rows="2"></textarea>
      </div>
      <div class="form-group">
        <label>Punto crítico</label>
        <textarea class="ci-punto-critico" rows="2"></textarea>
      </div>
      <div class="form-group">
        <label>Error típico</label>
        <textarea class="ci-error-tipico" rows="2"></textarea>
      </div>
      <div class="ciencia-actions">
        <button type="button" class="btn btn-danger btn-small btn-eliminar-ciencia">Eliminar bloque</button>
      </div>
    `;
    container.appendChild(block);

    block.querySelector('.btn-eliminar-ciencia').addEventListener('click', () => {
      block.remove();
    });
  }

  // --- Parseo de datos del formulario ---

  function parsearLineasIngredientes(texto) {
    return texto.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => {
        const partes = l.split('|').map(p => p.trim());
        return {
          nombre: partes[0] || '',
          cantidad_g: parseFloat(partes[1]) || 0,
          rol: partes[2] || '',
          notas: partes[3] || ''
        };
      });
  }

  function parsearLineasEtapas(texto) {
    return texto.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => {
        const partes = l.split('|').map(p => p.trim());
        return {
          nombre: partes[0] || '',
          duracion_min: parseFloat(partes[1]) || undefined,
          temperatura_c: parseFloat(partes[2]) || undefined,
          tecnica: partes[3] || '',
          descripcion: partes[4] || '',
          ciencia_ref: partes[5] || ''
        };
      });
  }

  function parsearSubRecetas() {
    const blocks = document.querySelectorAll('#sub-recetas-container .sub-receta-block');
    return Array.from(blocks).map(block => ({
      id: block.querySelector('.sr-id').value.trim(),
      nombre: block.querySelector('.sr-nombre').value.trim(),
      ingredientes: parsearLineasIngredientes(block.querySelector('.sr-ingredientes').value),
      etapas: parsearLineasEtapas(block.querySelector('.sr-etapas').value)
    }));
  }

  function parsearCiencia() {
    const blocks = document.querySelectorAll('#ciencia-container .ciencia-block');
    return Array.from(blocks).map(block => ({
      fenomeno: block.querySelector('.ci-fenomeno').value.trim(),
      explicacion: block.querySelector('.ci-explicacion').value.trim(),
      punto_critico: block.querySelector('.ci-punto-critico').value.trim(),
      error_tipico: block.querySelector('.ci-error-tipico').value.trim(),
      referencia: block.querySelector('.ci-referencia').value.trim()
    }));
  }

  function parsearReferencias(texto) {
    return texto.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => {
        const partes = l.split(',').map(p => p.trim());
        return {
          libro: partes[0] || '',
          capitulo: partes[1] || '',
          pagina: parseInt(partes[2]) || undefined
        };
      });
  }

  // --- Guardar receta ---

  function guardarReceta(e) {
    e.preventDefault();

    const id = document.getElementById('campo-id').value.trim() || generarId(document.getElementById('campo-nombre').value);

    // Combinar BPM seleccionados con los extra
    const bpmSeleccionados = obtenerChecklistSeleccionados('bpm-check');
    const bpmExtra = document.getElementById('campo-bpm-extra').value.split('\n').map(l => l.trim()).filter(l => l);
    const bpmFinal = [...bpmSeleccionados, ...bpmExtra];

    // Combinar ANMAT
    const anmatSeleccionados = obtenerChecklistSeleccionados('anmat-check');
    const anmatExtra = document.getElementById('campo-anmat-extra').value.split('\n').map(l => l.trim()).filter(l => l);
    const anmatFinal = [...anmatSeleccionados, ...anmatExtra];

    const receta = {
      id: id,
      nombre: document.getElementById('campo-nombre').value.trim(),
      bloque: document.getElementById('campo-bloque').value.trim(),
      categoria: document.getElementById('campo-categoria').value.trim(),
      tags: document.getElementById('campo-tags').value.split(',').map(t => t.trim()).filter(t => t),
      porciones: parseInt(document.getElementById('campo-porciones').value) || 0,
      molde: {
        forma: document.getElementById('campo-molde-forma').value.trim(),
        diametro_cm: parseFloat(document.getElementById('campo-molde-diametro').value) || undefined,
        altura_cm: parseFloat(document.getElementById('campo-molde-altura').value) || undefined,
        tipo: document.getElementById('campo-molde-tipo').value.trim(),
        cavidades: parseInt(document.getElementById('campo-molde-cavidades').value) || undefined,
        peso_pieza_g: parseFloat(document.getElementById('campo-molde-peso').value) || undefined
      },
      escalado: {
        tipo: document.getElementById('campo-escalado-tipo').value.trim(),
        base_cm: parseFloat(document.getElementById('campo-escalado-base-cm').value) || undefined,
        regla: document.getElementById('campo-escalado-regla').value.trim(),
        altura_fija: document.getElementById('campo-escalado-altura-fija').checked
      },
      sub_recetas: parsearSubRecetas(),
      etapas: [],
      ciencia: parsearCiencia(),
      bpm: bpmFinal,
      anmat: anmatFinal,
      rendimiento: {
        unidades: parseInt(document.getElementById('campo-rendimiento-unidades').value) || undefined,
        peso_pieza_g: parseFloat(document.getElementById('campo-rendimiento-peso-pieza').value) || undefined,
        peso_total_g: parseFloat(document.getElementById('campo-rendimiento-peso-total').value) || undefined
      },
      referencias: parsearReferencias(document.getElementById('campo-referencias').value),
      activa: true
    };

    if (recetaEditando && recetaEditando.index !== null && recetaEditando.index !== undefined) {
      const anterior = recetas[recetaEditando.index];
      receta.activa = anterior.activa !== false;
      recetas[recetaEditando.index] = receta;
    } else {
      recetas.push(receta);
    }

    guardarEnStorage();
    renderTabla();
    cerrarFormulario();
    mostrarStatus('Receta guardada correctamente');
  }

  // --- Exportar / Importar ---

  function exportarJSON() {
    const dataStr = JSON.stringify(recetas, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recetas.json';
    a.click();
    URL.revokeObjectURL(url);
    mostrarStatus('JSON exportado. Súbelo al repositorio.');
  }

  function importarJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          recetas = data;
          guardarEnStorage();
          renderTabla();
          mostrarStatus('JSON importado correctamente');
        } else {
          mostrarStatus('El archivo no contiene un array de recetas', 'error');
        }
      } catch (err) {
        mostrarStatus('Error al parsear el JSON', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function restaurarDesdeArchivo() {
    if (confirm('¿Restaurar desde data/recetas.json? Se perderán los cambios no exportados.')) {
      localStorage.removeItem(STORAGE_KEY);
      cargarRecetas();
    }
  }

  // --- Inicialización ---

  async function init() {
    await cargarConfig();
    await cargarRecetas();

    document.getElementById('btn-nueva-receta').addEventListener('click', () => {
      abrirFormulario({
        id: '',
        nombre: '',
        bloque: '',
        categoria: '',
        tags: [],
        porciones: 0,
        molde: {},
        escalado: {},
        sub_recetas: [],
        etapas: [],
        ciencia: [],
        bpm: [],
        anmat: [],
        rendimiento: {},
        referencias: [],
        activa: true
      }, null);
    });

    document.getElementById('btn-exportar').addEventListener('click', exportarJSON);
    document.getElementById('input-importar').addEventListener('change', importarJSON);
    document.getElementById('btn-restaurar').addEventListener('click', restaurarDesdeArchivo);

    document.getElementById('form-receta').addEventListener('submit', guardarReceta);
    document.getElementById('btn-cancelar').addEventListener('click', cerrarFormulario);
    document.getElementById('btn-add-sub-receta').addEventListener('click', agregarSubReceta);
    document.getElementById('btn-add-ciencia').addEventListener('click', agregarCiencia);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
