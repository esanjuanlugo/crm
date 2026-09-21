// ============================================================
// Payload de mensaje interactivo — estructura compartida + validación.
//
// La representación persistente y reversible de un mensaje
// interactivo de WhatsApp (botones de respuesta o una lista).
// Esta es la única fuente de verdad utilizada por:
//   - el compositor de la bandeja de entrada + los constructores
//     de automatización de "enviar interactivo",
//   - el núcleo de envío de mensajes + el motor de automatización
//     (envío + persistencia),
//   - la burbuja del mensaje + la vista previa (renderizado),
//   - las respuestas rápidas (almacenan un fragmento interactivo).
//
// Los nombres de los campos (`id`/`title`/`description`) en botones
// y filas coinciden intencionalmente con `InteractiveButton` /
// `InteractiveListRow` / `InteractiveListSection` de `meta-api.ts`,
// para que un payload pueda mapearse directamente a los argumentos
// de envío de Meta sin necesidad de traducción.
//
// `validateInteractivePayload` replica los errores que ya existen
// dentro de los emisores de `meta-api`, pero devuelve un objeto de
// resultado para que las rutas de API y las comprobaciones de
// activación puedan mostrar un error claro al usuario *antes* de
// realizar la llamada de red, en lugar de convertir un payload
// incorrecto en un error 400 de Meta durante la conversación.
// ============================================================

import { INTERACTIVE_LIMITS } from './meta-api'

export interface InteractiveButton {
  /** ID estable que se devuelve en el webhook cuando se pulsa. */
  id: string
  /** Etiqueta visible (≤ 20 caracteres según Meta). */
  title: string
}

export interface InteractiveButtonsPayload {
  kind: 'buttons'
  /** Texto del cuerpo mostrado sobre los botones (≤ 1024 caracteres). */
  body: string
  /** Encabezado opcional de texto plano (≤ 60 caracteres). */
  header?: string
  /** Línea de pie de página opcional en gris (≤ 60 caracteres). */
  footer?: string
  /** De 1 a 3 botones. */
  buttons: InteractiveButton[]
}

export interface InteractiveListRow {
  /** ID estable que se devuelve en el webhook cuando se selecciona. */
  id: string
  /** Título de la fila (≤ 24 caracteres según Meta). */
  title: string
  /** Línea secundaria opcional (≤ 72 caracteres). */
  description?: string
}

export interface InteractiveListSection {
  /** Encabezado opcional de la sección mostrado sobre sus filas. */
  title?: string
  rows: InteractiveListRow[]
}

export interface InteractiveListPayload {
  kind: 'list'
  body: string
  header?: string
  footer?: string
  /** Etiqueta del botón para desplegar la lista en el mensaje (≤ 20 caracteres). */
  button_label: string
  /** De 1 a 10 filas EN TOTAL entre todas las secciones. */
  sections: InteractiveListSection[]
}

export type InteractiveMessagePayload =
  | InteractiveButtonsPayload
  | InteractiveListPayload

export type InteractiveValidation =
  | { ok: true }
  | { ok: false; error: string }

function ok(): InteractiveValidation {
  return { ok: true }
}
function fail(error: string): InteractiveValidation {
  return { ok: false, error }
}

function validateHeaderFooter(
  header: string | undefined,
  footer: string | undefined,
): InteractiveValidation {
  if (header && header.length > INTERACTIVE_LIMITS.headerTextMaxLength) {
    return fail(
      `El encabezado supera el límite de ${INTERACTIVE_LIMITS.headerTextMaxLength} caracteres.`,
    )
  }
  if (footer && footer.length > INTERACTIVE_LIMITS.footerMaxLength) {
    return fail(
      `El pie de página supera el límite de ${INTERACTIVE_LIMITS.footerMaxLength} caracteres.`,
    )
  }
  return ok()
}

/**
 * Valida un payload interactivo según los límites estrictos de Meta
 * y nuestras reglas estructurales (IDs/títulos no vacíos e IDs únicos).
 * Devuelve un objeto de resultado en lugar de lanzar una excepción,
 * para que las rutas de API puedan convertirlo en un error 400 con
 * un mensaje comprensible para el usuario.
 *
 * `unknown` como entrada, con el tipo validado aquí, permite llamar
 * a esta función directamente sobre el cuerpo de una solicitud
 * previamente analizada.
 */
export function validateInteractivePayload(
  payload: unknown,
): InteractiveValidation {
  if (!payload || typeof payload !== 'object') {
    return fail('Se requiere el payload del mensaje interactivo.')
  }
  const p = payload as Partial<InteractiveMessagePayload>

  if (typeof p.body !== 'string' || p.body.trim() === '') {
    return fail('El texto del cuerpo del mensaje interactivo es obligatorio.')
  }
  if (p.body.length > INTERACTIVE_LIMITS.bodyMaxLength) {
    return fail(
      `El texto del cuerpo supera el límite de ${INTERACTIVE_LIMITS.bodyMaxLength} caracteres.`,
    )
  }
  const hf = validateHeaderFooter(p.header, p.footer)
  if (!hf.ok) return hf

  if (p.kind === 'buttons') {
    const buttons = (p as InteractiveButtonsPayload).buttons
    if (!Array.isArray(buttons) || buttons.length < 1) {
      return fail('Agrega al menos un botón de respuesta.')
    }
    if (buttons.length > INTERACTIVE_LIMITS.maxButtons) {
      return fail(
        `Un mensaje con botones de respuesta permite como máximo ${INTERACTIVE_LIMITS.maxButtons} botones.`,
      )
    }
    const seen = new Set<string>()
    for (const b of buttons) {
      if (!b || typeof b.id !== 'string' || b.id.trim() === '') {
        return fail('Cada botón necesita un ID.')
      }
      if (seen.has(b.id)) {
        return fail(`El ID del botón "${b.id}" está duplicado.`)
      }
      seen.add(b.id)
      if (typeof b.title !== 'string' || b.title.trim() === '') {
        return fail('Cada botón necesita una etiqueta.')
      }
      if (b.title.length > INTERACTIVE_LIMITS.buttonTitleMaxLength) {
        return fail(
          `La etiqueta del botón "${b.title}" supera el límite de ${INTERACTIVE_LIMITS.buttonTitleMaxLength} caracteres.`,
        )
      }
    }
    return ok()
  }

  if (p.kind === 'list') {
    const list = p as InteractiveListPayload
    if (
      typeof list.button_label !== 'string' ||
      list.button_label.trim() === ''
    ) {
      return fail('La lista necesita una etiqueta para el botón.')
    }
    if (list.button_label.length > INTERACTIVE_LIMITS.buttonTitleMaxLength) {
      return fail(
        `La etiqueta del botón de la lista supera el límite de ${INTERACTIVE_LIMITS.buttonTitleMaxLength} caracteres.`,
      )
    }
    if (!Array.isArray(list.sections) || list.sections.length < 1) {
      return fail('Agrega al menos una sección a la lista.')
    }
    if (list.sections.length > INTERACTIVE_LIMITS.maxListSections) {
      return fail(
        `Una lista permite como máximo ${INTERACTIVE_LIMITS.maxListSections} secciones.`,
      )
    }
    const seen = new Set<string>()
    let total = 0
    for (const section of list.sections) {
      if (!section || !Array.isArray(section.rows)) {
        return fail('Cada sección de la lista necesita filas.')
      }
      for (const row of section.rows) {
        total++
        if (!row || typeof row.id !== 'string' || row.id.trim() === '') {
          return fail('Cada fila de la lista necesita un ID.')
        }
        if (seen.has(row.id)) {
          return fail(`El ID de la fila "${row.id}" está duplicado.`)
        }
        seen.add(row.id)
        if (typeof row.title !== 'string' || row.title.trim() === '') {
          return fail('Cada fila de la lista necesita un título.')
        }
        if (row.title.length > INTERACTIVE_LIMITS.listRowTitleMaxLength) {
          return fail(
            `El título de la fila "${row.title}" supera el límite de ${INTERACTIVE_LIMITS.listRowTitleMaxLength} caracteres.`,
          )
        }
        if (
          row.description &&
          row.description.length >
            INTERACTIVE_LIMITS.listRowDescriptionMaxLength
        ) {
          return fail(
            `La descripción de la fila supera el límite de ${INTERACTIVE_LIMITS.listRowDescriptionMaxLength} caracteres.`,
          )
        }
      }
    }
    if (total < 1) return fail('Agrega al menos una fila a la lista.')
    if (total > INTERACTIVE_LIMITS.maxListRowsTotal) {
      return fail(
        `Una lista permite como máximo ${INTERACTIVE_LIMITS.maxListRowsTotal} filas en total.`,
      )
    }
    return ok()
  }

  return fail('El mensaje interactivo debe ser de botones de respuesta o de lista.')
}

/**
 * Resumen breve de una sola línea utilizado para
 * `conversations.last_message_text` y las filas de respuestas rápidas:
 * devuelve el cuerpo del mensaje sin espacios innecesarios o, si está
 * vacío, un texto alternativo adecuado.
 */
export function interactivePayloadPreviewText(
  payload: InteractiveMessagePayload,
): string {
  const body = payload.body?.trim()
  if (body) return body
  return payload.kind === 'buttons' ? '[botones]' : '[lista]'
}
