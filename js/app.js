// js/app.js

import { cargarDatos, getRecetas, getRecetaPorId, getTags, getConfig, getCategorias, buscarRecetas } from './data.js';
import { escalarReceta } from './lib/escalado.js';
import { formatearCiencia } from './lib/ciencia.js';
import { formatNumber, debounce, notificar } from './utils.js';

// Estado de la app
let estado = {
  vista: 'lista', // 'lista' | 'detalle'
  recetaActual: null,
  recetaOriginal: null,
  filtroCategoria: null,
  filtroTag: null,
  busqueda: ''
};

/**
 * Inicializa la aplicación.
 */
async function init() {
  try {
    await cargarDatos();
    renderizarApp();
    configurarEventos();
    console.log('App inicializada');
  } catch (error) {
    console.error('Error al inicializar:', error);
    document.getElementById('app').innerHTML = `
      <div class="error" style="padding: 2rem; background: #fff; color: #000; font-family: monospace;">
        <h2>Error al cargar la aplicación</h2>
        <p><strong>${error.message}</strong></p>
        <pre>${error.stack || ''}</pre>
      </div>
    `;
  }
}

/**
 * Renderiza la app completa.
 */
function renderizarApp() {
  const config = getConfig();
  const app = document.getElementById('app');

  app.innerHTML = `
    <header class="header">
      <div class="header-content">
        <h1 class="titulo">${config.nombre}</h1>
        <p class="subtitulo">${config.descripcion}</p>
      </div>
      <nav class="nav">
        <button class="nav-btn" data-vista="lista">Recetas</button>
        <button class="nav-btn" data-vista="tags">Tags</button>
      </nav>
    </header>

    <main class="main">
      <div class="buscador no-print">
        <input type="text" id="busqueda" placeholder="Buscar receta, ingrediente o tag..." />
        <button id="limpiar-busqueda" class="btn-limpiar">✕</button>
      </div>

      <div class="filtros no-print">
        <div class="filtro-categorias" id="filtro-categorias"></div>
        <div class="filtro-tags" id="filtro-tags"></div>
      </div>

      <div class="contenido" id="contenido"></div>
    </main>

    <footer class="footer no-print">
      <p>${config.nombre} v${config.version} — ${config.autor}</p>
      <p><a href="${config.repo}" target="_blank">GitHub</a></p>
    </footer>
  `;

  renderizarFiltros();
  renderizarContenido();
}

/**
 * Renderiza los filtros de categorías y tags.
 */
function renderizarFiltros() {
  const categorias = getCategorias();
  const tags = getTags();

  const catContainer = document.getElementById('filtro-categorias');
  catContainer.innerHTML = `
    <button class="filtro-btn ${!estado.filtroCategoria ? 'activo' : ''}" data-categoria="">
      Todas
    </button>
    ${categorias.map(c => `
      <button class="filtro-btn ${estado.filtroCategoria === c.id ? 'activo' : ''}" data-categoria="${c.id}">
        ${c.nombre}
      </button>
    `).join('')}
  `;

  const tagContainer = document.getElementById('filtro-tags');
  tagContainer.innerHTML = `
    <button class="filtro-btn ${!estado.filtroTag ? 'activo' : ''}" data-tag="">
      Todos
    </button>
    ${tags.map(t => `
      <button class="filtro-btn ${estado.filtroTag === t ? 'activo' : ''}" data-tag="${t}">
        ${t}
      </button>
    `).join('')}
  `;
}

/**
 * Renderiza el contenido principal.
 */
function renderizarContenido() {
  if (estado.vista === 'detalle' && estado.recetaActual) {
    renderizarDetalle(estado.recetaActual);
  } else {
    renderizarLista();
  }
}

/**
 * Renderiza la lista de recetas.
 */
function renderizarLista() {
  const contenido = document.getElementById('contenido');
  let recetas = getRecetas();

  if (estado.filtroCategoria) {
    recetas = recetas.filter(r => r.categoria === estado.filtroCategoria);
  }
  if (estado.filtroTag) {
    recetas = recetas.filter(r => r.tags && r.tags.includes(estado.filtroTag));
  }
  if (estado.busqueda) {
    recetas = buscarRecetas(estado.busqueda);
  }

  if (recetas.length === 0) {
    contenido.innerHTML = `<div class="sin-resultados"><p>No se encontraron recetas.</p></div>`;
    return;
  }

  contenido.innerHTML = `
    <div class="lista-recetas">
      ${recetas.map(r => `
        <div class="receta-card" data-id="${r.id}">
          <h3 class="receta-nombre">${r.nombre}</h3>
          <p class="receta-categoria">${r.categoria}</p>
          <div class="receta-tags">
            ${r.tags ? r.tags.map(t => `<span class="tag">${t}</span>`).join('') : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.querySelectorAll('.receta-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const receta = getRecetaPorId(id);
      if (receta) {
        estado.vista = 'detalle';
        estado.recetaActual = receta;
        estado.recetaOriginal = receta;
        renderizarContenido();
      }
    });
  });
}

/**
 * Renderiza el detalle de una receta.
 */
function renderizarDetalle(receta) {
  const contenido = document.getElementById('contenido');

  contenido.innerHTML = `
    <div class="detalle-receta">
      <button class="btn-volver no-print" id="btn-volver">← Volver</button>

      <h2 class="receta-titulo">${receta.nombre}</h2>
      <p class="detalle-categoria">${receta.categoria}</p>
      <div class="detalle-tags no-print">
        ${receta.tags ? receta.tags.map(t => `<span class="tag">${t}</span>`).join('') : ''}
      </div>

      <button class="print-button no-print" id="btn-imprimir">
        🖨️ Imprimir ficha
      </button>

      <div class="detalle-info receta-info">
        ${receta.porciones ? `<span class="receta-info-item"><strong>Porciones:</strong> ${receta.porciones}</span>` : ''}
        ${receta.molde ? `<span class="receta-info-item"><strong>Molde:</strong> ${formatearMolde(receta.molde)}</span>` : ''}
        ${receta.rendimiento ? `<span class="receta-info-item"><strong>Rendimiento:</strong> ${formatearRendimiento(receta.rendimiento)}</span>` : ''}
      </div>

      <div class="detalle-escalado no-print">
        <h3>Escalar receta</h3>
        <div class="escalado-controles">
          ${generarControlesEscalado(receta)}
          <button id="btn-escalar" class="btn-escalar">Escalar</button>
          <button id="btn-resetear" class="btn-resetear">Resetear</button>
        </div>
      </div>

      ${receta.sub_recetas ? receta.sub_recetas.map((sr, i) => renderSubReceta(sr, i)).join('') : ''}

      ${receta.etapas && receta.etapas.length > 0 ? `
        <div class="seccion-etapas">
          <h3>Flujo de trabajo</h3>
          ${receta.etapas.map(e => renderEtapa(e)).join('')}
        </div>
      ` : ''}

      ${receta.ciencia && receta.ciencia.length > 0 ? `
        <div class="seccion-ciencia">
          <h3>Ciencia detrás de la receta</h3>
          ${formatearCiencia(receta.ciencia)}
        </div>
      ` : ''}

      ${receta.bpm && receta.bpm.length > 0 ? `
        <div class="seccion-bpm">
          <h3>BPM</h3>
          <ul class="bpm-lista">
            ${receta.bpm.map(b => `<li>${b}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${receta.anmat && receta.anmat.length > 0 ? `
        <div class="seccion-anmat">
          <h3>ANMAT</h3>
          <ul class="anmat-lista">
            ${receta.anmat.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${receta.referencias && receta.referencias.length > 0 ? `
        <div class="seccion-referencias">
          <h3>Referencias</h3>
          <ul class="referencias-lista">
            ${receta.referencias.map(r => `<li>${r.libro}${r.capitulo ? ' — ' + r.capitulo : ''}${r.pagina ? ', p. ' + r.pagina : ''}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="ficha-footer">
        Ficha generada desde el Cuaderno de Pastelería — ${new Date().toLocaleDateString('es-AR')}
      </div>
    </div>
  `;

  // Eventos
  document.getElementById('btn-volver').addEventListener('click', () => {
    estado.vista = 'lista';
    estado.recetaActual = null;
    estado.recetaOriginal = null;
    renderizarContenido();
  });

  document.getElementById('btn-imprimir').addEventListener('click', () => {
    window.print();
  });

  const btnEscalar = document.getElementById('btn-escalar');
  if (btnEscalar) {
    btnEscalar.addEventListener('click', () => {
      const valor = parseFloat(document.getElementById('escalado-valor').value);
      if (isNaN(valor) || valor <= 0) {
        notificar('Ingrese un valor válido', 'error');
        return;
      }
      const recetaEscalada = escalarReceta(estado.recetaOriginal, valor);
      estado.recetaActual = recetaEscalada;
      renderizarDetalle(recetaEscalada);
      notificar('Receta escalada correctamente', 'success');
    });
  }

  const btnResetear = document.getElementById('btn-resetear');
  if (btnResetear) {
    btnResetear.addEventListener('click', () => {
      estado.recetaActual = estado.recetaOriginal;
      renderizarDetalle(estado.recetaOriginal);
      notificar('Receta reseteada', 'info');
    });
  }
}

/**
 * Renderiza una sub-receta completa.
 */
function renderSubReceta(sr, index) {
  return `
    <div class="sub-receta">
      <h3 class="sub-receta-nombre">${index + 1}. ${sr.nombre}</h3>

      ${sr.ingredientes && sr.ingredientes.length > 0 ? `
        <h4>Ingredientes</h4>
        <table class="tabla-ingredientes">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Cantidad</th>
              <th>Rol</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            ${sr.ingredientes.map(i => `
              <tr>
                <td>${i.nombre}</td>
                <td>${i.cantidad_g !== undefined ? formatNumber(i.cantidad_g) + ' g' : ''}</td>
                <td>${i.rol || '-'}</td>
                <td>${i.notas || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${sr.etapas && sr.etapas.length > 0 ? `
        <h4>Preparación</h4>
        ${sr.etapas.map(e => renderEtapa(e)).join('')}
      ` : ''}
    </div>
  `;
}

/**
 * Renderiza una etapa individual.
 */
function renderEtapa(etapa) {
  return `
    <div class="etapa">
      <div class="etapa-nombre">${etapa.nombre}</div>
      ${etapa.descripcion ? `<div class="etapa-descripcion">${etapa.descripcion}</div>` : ''}
      <div class="etapa-detalle etapa-meta">
        ${etapa.duracion_min ? `<span>⏱ ${etapa.duracion_min} min</span>` : ''}
        ${etapa.duracion_h ? `<span>⏱ ${etapa.duracion_h} h</span>` : ''}
        ${etapa.temperatura_c ? `<span>🌡 ${etapa.temperatura_c}°C</span>` : ''}
        ${etapa.tecnica ? `<span>🔧 ${etapa.tecnica}</span>` : ''}
      </div>
    </div>
  `;
}

function formatearMolde(molde) {
  const partes = [];
  if (molde.forma) partes.push(molde.forma);
  if (molde.diametro_cm) partes.push(molde.diametro_cm + ' cm');
  if (molde.largo_cm && molde.ancho_cm) partes.push(`${molde.largo_cm}×${molde.ancho_cm} cm`);
  if (molde.altura_cm) partes.push('altura ' + molde.altura_cm + ' cm');
  if (molde.cavidades) partes.push(molde.cavidades + ' cavidades');
  return partes.join(' · ') || '-';
}

function formatearRendimiento(rend) {
  const partes = [];
  if (rend.unidades) partes.push(rend.unidades + ' unidades');
  if (rend.peso_pieza_g) partes.push('pieza ' + formatNumber(rend.peso_pieza_g) + ' g');
  if (rend.peso_total_g) partes.push('total ' + formatNumber(rend.peso_total_g) + ' g');
  return partes.join(' · ') || '-';
}

function generarControlesEscalado(receta) {
  if (!receta.escalado) return '';
  const tipo = receta.escalado.tipo;
  if (tipo === 'diametro' || tipo === 'area') {
    return `
      <label>Nuevo diámetro (cm):</label>
      <input type="number" id="escalado-valor" value="${receta.escalado.base_cm || 24}" step="1" min="1" />
    `;
  }
  if (tipo === 'por_peso' || tipo === 'triple') {
    return `
      <label>Nuevo peso (g):</label>
      <input type="number" id="escalado-valor" value="${receta.escalado.base_cobertura_g || 1000}" step="50" min="50" />
    `;
  }
  if (tipo === 'por_unidades') {
    return `
      <label>Nuevas unidades:</label>
      <input type="number" id="escalado-valor" value="${receta.rendimiento ? receta.rendimiento.unidades : 12}" step="1" min="1" />
    `;
  }
  return `<label>Factor:</label><input type="number" id="escalado-valor" value="1" step="0.1" min="0.1" />`;
}

function configurarEventos() {
  const busqueda = document.getElementById('busqueda');
  if (busqueda) {
    busqueda.addEventListener('input', debounce((e) => {
      estado.busqueda = e.target.value;
      if (estado.vista === 'lista') {
        renderizarLista();
      } else {
        estado.vista = 'lista';
        renderizarContenido();
      }
    }, 300));
  }

  const limpiar = document.getElementById('limpiar-busqueda');
  if (limpiar) {
    limpiar.addEventListener('click', () => {
      document.getElementById('busqueda').value = '';
      estado.busqueda = '';
      renderizarContenido();
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('filtro-btn')) {
      if (e.target.dataset.categoria !== undefined) {
        estado.filtroCategoria = e.target.dataset.categoria || null;
        renderizarFiltros();
        renderizarLista();
      }
      if (e.target.dataset.tag !== undefined) {
        estado.filtroTag = e.target.dataset.tag || null;
        renderizarFiltros();
        renderizarLista();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
