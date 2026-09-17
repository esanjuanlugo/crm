import type {
  AutomationStepConfig,
  AutomationStepType,
  AutomationTriggerConfig,
  AutomationTriggerType,
} from '@/types'

export type TemplateSlug =
  | 'welcome_message'
  | 'out_of_office'
  | 'lead_qualifier'
  | 'follow_up_reminder'

export interface TemplateStepSeed {
  step_type: AutomationStepType
  step_config: AutomationStepConfig
  branch?: 'yes' | 'no' | null
  /** Índice (dentro de esta lista de semillas) del Condition padre, si está anidado. */
  parent_index?: number | null
}

export interface AutomationTemplateDefinition {
  slug: TemplateSlug
  name: string
  description: string
  trigger_type: AutomationTriggerType
  trigger_config: AutomationTriggerConfig
  steps: TemplateStepSeed[]
}

export const AUTOMATION_TEMPLATES: Record<TemplateSlug, AutomationTemplateDefinition> = {
  welcome_message: {
    slug: 'welcome_message',
    name: 'Mensaje de bienvenida',
    description:'Responde automáticamente a los contactos que escriben por primera vez con un saludo.',
    // first_inbound_message (agregado en el PR #33) detecta tanto contactos
    // completamente nuevos como contactos agregados o importados manualmente
    // cuando responden por primera vez. Esto es lo que normalmente espera
    // un usuario al configurar una automatización de bienvenida.
    // new_contact_created no detectaría el caso de contactos importados
    // manualmente.
    trigger_type: 'first_inbound_message',
    trigger_config: {},
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: '¡Hola! 👋 Gracias por escribirnos. Nos pondremos en contacto contigo lo antes posible.',
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' },
      },
    ],
  },
  out_of_office: {
    slug: 'out_of_office',
    name: 'Fuera de horario',
    description:'Responde automáticamente fuera del horario laboral para que nadie tenga que esperar.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'condition',
        step_config: {
          subject: 'time_of_day',
          operand: '18:00-09:00',
        },
      },
      {
        step_type: 'send_message',
        step_config: {
          text: '¡Gracias por tu mensaje! Nuestro equipo está fuera de horario en este momento (9:00 a. m.–6:00 p. m.) y te responderá a primera hora mañana.',
        },
        parent_index: 0,
        branch: 'yes',
      },
    ],
  },
  lead_qualifier: {
    slug: 'lead_qualifier',
    name: 'Calificador de clientes potenciales',
    description:'Haz preguntas de calificación para filtrar los clientes potenciales entrantes.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['pricing', 'quote', 'buy'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: '¡Perfecto! Nos encantará ayudarte con los precios. Una pregunta rápida: aproximadamente, ¿para cuántos usuarios estás buscando?',
        },
      },
      {
        step_type: 'wait',
        step_config: { amount: 10, unit: 'minutes' },
      },
      {
        step_type: 'assign_conversation',
        step_config: { mode: 'round_robin' },
      },
    ],
  },
  follow_up_reminder: {
    slug: 'follow_up_reminder',
    name: 'Recordatorio de seguimiento',
    description:
      'Envía un recordatorio si un contacto no ha respondido en un plazo de 24 horas.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'wait',
        step_config: { amount: 1, unit: 'days' },
      },
      {
        step_type: 'send_message',
        step_config: {
          text: 'Solo queríamos dar seguimiento a nuestro mensaje anterior. ¿Tienes alguna otra pregunta? ¡Estamos aquí para ayudarte!',
        },
      },
    ],
  },
}

export function getTemplate(slug: string): AutomationTemplateDefinition | null {
  return AUTOMATION_TEMPLATES[slug as TemplateSlug] ?? null
}
