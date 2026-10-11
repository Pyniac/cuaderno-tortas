// js/lib/ciencia.js

/**
 * Formatea la información científica de una receta.
 * @param {Array} ciencia - El array de objetos de ciencia.
 * @returns {string} - El HTML formateado.
 */
export function formatearCiencia(ciencia) {
  if (!ciencia || ciencia.length === 0) return '';
  
  return ciencia.map(c => `
    <div class="ciencia-item">
      <h4 class="ciencia-fenomeno">${c.fenomeno}</h4>
      <p class="ciencia-explicacion">${c.explicacion}</p>
      <p class="ciencia-punto"><strong>Punto crítico:</strong> ${c.punto_critico}</p>
      <p class="ciencia-error"><strong>Error típico:</strong> ${c.error_tipico}</p>
      <p class="ciencia-referencia"><em>${c.referencia}</em></p>
    </div>
  `).join('');
}

/**
 * Obtiene el icono correspondiente a un fenómeno científico.
 * @param {string} fenomeno - El nombre del fenómeno.
 * @returns {string} - El icono (emoji).
 */
export function getIconoCiencia(fenomeno) {
  const iconos = {
    'emulsion': '🥛',
    'cristalizacion': '❄️',
    'coagulacion_proteinas': '🍳',
    'gelificacion': '🧊',
    'aireado': '💨',
    'gelatinizacion_almidon': '🌾',
    'reaccion_maillard': '🔥',
    'caramelizacion': '🍬',
    'fermentacion': '🫧',
    'extraccion': '☕'
  };
  return iconos[fenomeno] || '🔬';
}
