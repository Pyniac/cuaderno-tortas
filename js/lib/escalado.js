// js/lib/escalado.js

import { round } from '../utils.js';

export function escalarPorArea(receta, nuevoDiametro) {
  const baseCm = receta.escalado.base_cm;
  const factor = Math.pow(nuevoDiametro / baseCm, 2);
  return escalarPorFactor(receta, factor);
}

export function escalarPorDiametro(receta, nuevoDiametro) {
  return escalarPorArea(receta, nuevoDiametro);
}

export function escalarPorPeso(receta, nuevoPeso) {
  const baseG = receta.escalado.base_cobertura_g || receta.escalado.base_g;
  const factor = nuevoPeso / baseG;
  return escalarPorFactor(receta, factor);
}

export function escalarPorUnidades(receta, nuevasUnidades) {
  const baseUnidades = receta.rendimiento.unidades;
  const factor = nuevasUnidades / baseUnidades;
  return escalarPorFactor(receta, factor);
}

/**
 * Escala una receta por un factor dado.
 * Recorre sub_recetas y escala sus ingredientes.
 */
export function escalarPorFactor(receta, factor) {
  const recetaEscalada = JSON.parse(JSON.stringify(receta));

  // Escalar ingredientes dentro de cada sub-receta
  if (Array.isArray(recetaEscalada.sub_recetas)) {
    recetaEscalada.sub_recetas = recetaEscalada.sub_recetas.map(sr => {
      if (Array.isArray(sr.ingredientes)) {
        sr.ingredientes = sr.ingredientes.map(ing => ({
          ...ing,
          cantidad_g: ing.cantidad_g !== undefined ? round(ing.cantidad_g * factor, 2) : undefined
        }));
      }
      return sr;
    });
  }

  // Compatibilidad: si hay ingredientes a nivel raíz, escalarlos también
  if (Array.isArray(recetaEscalada.ingredientes)) {
    recetaEscalada.ingredientes = recetaEscalada.ingredientes.map(ing => ({
      ...ing,
      cantidad_g: ing.cantidad_g !== undefined ? round(ing.cantidad_g * factor, 2) : undefined
    }));
  }

  // Actualizar rendimiento
  if (recetaEscalada.rendimiento) {
    if (recetaEscalada.rendimiento.peso_total_g) {
      recetaEscalada.rendimiento.peso_total_g = round(recetaEscalada.rendimiento.peso_total_g * factor, 2);
    }
    if (recetaEscalada.rendimiento.unidades) {
      recetaEscalada.rendimiento.unidades = Math.round(recetaEscalada.rendimiento.unidades * factor);
    }
  }

  recetaEscalada.escalado_aplicado = {
    factor: round(factor, 4),
    descripcion: `Escalado por factor ${round(factor, 2)}`
  };

  return recetaEscalada;
}

export function escalarReceta(receta, valor) {
  const tipo = receta.escalado.tipo;
  switch (tipo) {
    case 'diametro':
    case 'area':
      return escalarPorDiametro(receta, valor);
    case 'por_peso':
      return escalarPorPeso(receta, valor);
    case 'por_unidades':
      return escalarPorUnidades(receta, valor);
    case 'triple':
      // Para chocolatería: escalar por peso de cobertura
      return escalarPorPeso(receta, valor);
    default:
      return escalarPorFactor(receta, valor);
  }
}
