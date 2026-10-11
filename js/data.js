// js/data.js

import { fetchJSON } from './utils.js';

const STORAGE_KEY = 'cuaderno_recetas_admin';

let recetas = [];
let tags = [];
let config = {};

export async function cargarDatos() {
  console.log('[data.js] Iniciando carga de datos...');
  
  try {
    // 1. Intentar cargar recetas desde localStorage
    const desdeStorage = localStorage.getItem(STORAGE_KEY);
    if (desdeStorage) {
      try {
        const data = JSON.parse(desdeStorage);
        // Nos aseguramos de que sea un array y que no esté vacío
        if (Array.isArray(data) && data.length > 0) {
          recetas = data;
          console.log(`[data.js] Recetas cargadas desde localStorage: ${recetas.length}`);
        }
      } catch (e) {
        console.warn('[data.js] Error al leer localStorage, se cargará desde el archivo.', e);
        // Si hay un error, limpiamos el storage corrupto
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // 2. Si no hay recetas en localStorage, cargar desde el archivo JSON
    if (recetas.length === 0) {
      console.log('[data.js] Cargando recetas desde ./data/recetas.json...');
      recetas = await fetchJSON('./data/recetas.json');
      console.log(`[data.js] Recetas cargadas desde archivo: ${recetas.length}`);
    }

    // 3. Cargar tags y config (siempre desde el archivo, ya que no son editables desde el admin)
    console.log('[data.js] Cargando tags.json...');
    const tagsData = await fetchJSON('./data/tags.json');
    tags = tagsData.tags || [];

    console.log('[data.js] Cargando config.json...');
    config = await fetchJSON('./data/config.json');

    console.log('[data.js] ✅ Datos cargados OK:', { 
      recetas: recetas.length, 
      tags: tags.length, 
      categorias: config.categorias ? config.categorias.length : 0 
    });

  } catch (error) {
    console.error('[data.js] ❌ Error al cargar datos:', error);
    throw error; // Propagar el error para que app.js lo muestre
  }
}

// --- El resto de las funciones no necesita cambios ---

export function getRecetas() {
  // La PWA solo debe mostrar las recetas activas
  return recetas.filter(r => r.activa !== false);
}

export function getRecetaPorId(id) {
  // El admin necesita encontrar todas las recetas, incluso las inactivas
  return recetas.find(r => r.id === id) || null;
}

export function getRecetasPorCategoria(categoria) {
  return getRecetas().filter(r => r.categoria === categoria);
}

export function getRecetasPorTag(tag) {
  return getRecetas().filter(r => r.tags && r.tags.includes(tag));
}

export function buscarRecetas(query) {
  const q = query.toLowerCase().trim();
  if (!q) return getRecetas();

  return getRecetas().filter(r => {
    if (r.nombre && r.nombre.toLowerCase().includes(q)) return true;
    if (r.id && r.id.toLowerCase().includes(q)) return true;
    if (r.tags && r.tags.some(t => t.toLowerCase().includes(q))) return true;
    if (r.categoria && r.categoria.toLowerCase().includes(q)) return true;
    // Buscar en los ingredientes de las sub-recetas
    if (Array.isArray(r.sub_recetas)) {
      for (const sr of r.sub_recetas) {
        if (Array.isArray(sr.ingredientes)) {
          for (const ing of sr.ingredientes) {
            if (ing.nombre && ing.nombre.toLowerCase().includes(q)) return true;
          }
        }
      }
    }
    return false;
  });
}

export function getTags() {
  return tags;
}

export function getConfig() {
  return config;
}

export function getCategorias() {
  return config.categorias || [];
}
