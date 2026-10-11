// js/utils.js

/**
 * Formatea un número con separador de miles.
 * @param {number} num - El número a formatear.
 * @returns {string} - El número formateado.
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '';
  return num.toLocaleString('es-AR');
}

/**
 * Redondea un número a una cantidad de decimales.
 * @param {number} num - El número a redondear.
 * @param {number} decimals - Cantidad de decimales.
 * @returns {number} - El número redondeado.
 */
export function round(num, decimals = 2) {
  if (num === null || num === undefined) return 0;
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Genera un ID único a partir de un string.
 * @param {string} str - El string base.
 * @returns {string} - El ID generado.
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

/**
 * Debounce para evitar llamadas excesivas.
 * @param {Function} func - La función a ejecutar.
 * @param {number} wait - Milisegundos de espera.
 * @returns {Function} - La función con debounce.
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Carga un archivo JSON.
 * @param {string} url - La URL del archivo.
 * @returns {Promise<any>} - Los datos del archivo.
 */
export async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error al cargar ${url}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Muestra un mensaje de notificación.
 * @param {string} mensaje - El mensaje a mostrar.
 * @param {string} tipo - El tipo de mensaje (success, error, info).
 */
export function notificar(mensaje, tipo = 'info') {
  const notificacion = document.createElement('div');
  notificacion.className = `notificacion notificacion-${tipo}`;
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);
  setTimeout(() => {
    notificacion.classList.add('visible');
  }, 10);
  setTimeout(() => {
    notificacion.classList.remove('visible');
    setTimeout(() => {
      document.body.removeChild(notificacion);
    }, 300);
  }, 3000);
}
