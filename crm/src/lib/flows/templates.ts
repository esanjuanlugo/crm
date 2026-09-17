/**
 * Plantillas de flujos iniciales.
 *
 * Tres flujos predefinidos que los usuarios pueden clonar con un solo clic
 * en lugar de crearlos desde cero. Cada plantilla es un objeto JS simple
 * que describe la misma estructura que acepta `/api/flows` PUT:
 * nombre, configuración del disparador, entry_node_id, fallback_policy,
 * nodes[] — identificados mediante un `slug` estable.
 *
 * La ruta de clonación (`/api/flows` POST con `template_slug`) crea un
 * NUEVO flow_row + registros flow_nodes para el usuario. Los `node_key`
 * se mantienen exactamente iguales (son cadenas estables, no UUIDs,
 * por lo que al clonar nunca es necesario reescribir las referencias
 * entre nodos).
 *
 * Elegimos un único módulo estático en lugar de una galería respaldada
 * por la base de datos para v1 porque: (a) el conjunto es pequeño y
 * cambia con las versiones del código, no con los datos; (b) mantiene
 * las plantillas portátiles entre instancias autoalojadas sin migraciones;
 * (c) editar directamente el código es la forma más sencilla de agregar
 * la siguiente plantilla.
 */

import type {
  CollectInputNodeConfig,
  ConditionNodeConfig,
  HandoffNodeConfig,
  KeywordTriggerConfig,
  SendButtonsNodeConfig,
  SendListNodeConfig,
  SendMessageNodeConfig,
  StartNodeConfig,
} from "./types";

export type FlowTemplateNodeType =
  | "start"
  | "send_message"
  | "send_buttons"
  | "send_list"
  | "collect_input"
  | "condition"
  | "set_tag"
  | "handoff"
  | "end";

export interface FlowTemplateNode {
  node_key: string;
  node_type: FlowTemplateNodeType;
  config:
    | StartNodeConfig
    | SendMessageNodeConfig
    | SendButtonsNodeConfig
    | SendListNodeConfig
    | CollectInputNodeConfig
    | ConditionNodeConfig
    | HandoffNodeConfig
    | Record<string, unknown>;
}

export interface FlowTemplate {
  slug: string;
  name: string;
  description: string;
  /** Utilizado por la galería para mostrar un icono relevante. Nombre de lucide-react. */
  icon: "MessageSquare" | "HelpCircle" | "UserPlus";
  trigger_type: "keyword" | "first_inbound_message" | "manual";
  trigger_config: KeywordTriggerConfig | Record<string, unknown>;
  entry_node_id: string;
  nodes: FlowTemplateNode[];
}

// ============================================================
// 1. Menú de bienvenida — el ejemplo del documento del propietario
// ============================================================
const WELCOME_MENU: FlowTemplate = {
  slug: "welcome_menu",
  name: "Menú de bienvenida",
  description:
    "Saluda a los clientes que escriban una palabra clave y dirígelos al agente adecuado según sean clientes nuevos o existentes.",
  icon: "MessageSquare",
  trigger_type: "keyword",
  trigger_config: { keywords: ["support", "help", "hi"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "welcome" },
    },
    {
      node_key: "welcome",
      node_type: "send_buttons",
      config: {
        text: "¡Hola! 👋 Bienvenido al soporte. ¿Ya eres cliente o eres nuevo por aquí?",
        footer_text: "Toca un botón para continuar.",
        buttons: [
          {
            reply_id: "existing",
            title: "Ya soy cliente",
            next_node_key: "existing_handoff",
          },
          {
            reply_id: "new",
            title: "Soy cliente nuevo",
            next_node_key: "new_handoff",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "existing_handoff",
      node_type: "handoff",
      config: {
        note: "El cliente existente necesita asistencia — revisa el historial de su cuenta antes de responder.",
      } as HandoffNodeConfig,
    },
    {
      node_key: "new_handoff",
      node_type: "handoff",
      config: {
        note: "Cliente nuevo — compartir precios + enlace de incorporación.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 2. Bot de preguntas frecuentes — respuestas mediante listas,
//    completamente automatizado
// ============================================================
const FAQ_BOT: FlowTemplate = {
  slug: "faq_bot",
  name: "Bot de preguntas frecuentes",
  description:
    "Responde automáticamente las preguntas más comunes. El cliente elige un tema de una lista; el bot responde y finaliza el flujo.",
  icon: "HelpCircle",
  trigger_type: "keyword",
  trigger_config: {
    keywords: ["faq", "question", "info"],
    match_type: "contains",
  },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "topics" },
    },
    {
      node_key: "topics",
      node_type: "send_list",
      config: {
        text: "¿En qué puedo ayudarte?",
        button_label: "Ver temas",
        sections: [
          {
            title: "Preguntas frecuentes",
            rows: [
              {
                reply_id: "hours",
                title: "Horario de atención",
                next_node_key: "answer_hours",
              },
              {
                reply_id: "pricing",
                title: "Precios",
                next_node_key: "answer_pricing",
              },
              {
                reply_id: "refunds",
                title: "Política de reembolsos",
                next_node_key: "answer_refunds",
              },
            ],
          },
          {
            title: "Otros",
            rows: [
              {
                reply_id: "human",
                title: "Hablar con una persona",
                next_node_key: "human_handoff",
              },
            ],
          },
        ],
      } as SendListNodeConfig,
    },
    {
      node_key: "answer_hours",
      node_type: "send_message",
      config: {
        text: "Nuestro horario es de lunes a viernes, de 9:00 a 18:00, hora local. La atención durante el fin de semana está limitada a problemas urgentes.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "answer_pricing",
      node_type: "send_message",
      config: {
        text: "Nuestros precios comienzan en $9 al mes. Visita https://example.com/pricing para consultar todos los detalles.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "answer_refunds",
      node_type: "send_message",
      config: {
        text: "Los reembolsos se aceptan dentro de los 30 días posteriores a la compra. Responde con tu número de pedido y procesaremos la solicitud.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "human_handoff",
      node_type: "handoff",
      config: {
        note: "El cliente solicitó hablar con una persona desde el bot de preguntas frecuentes.",
      } as HandoffNodeConfig,
    },
    {
      node_key: "end",
      node_type: "end",
      config: {},
    },
  ],
};

// ============================================================
// 3. Captura de clientes potenciales — cadena de collect_input,
//    termina con una transferencia a ventas
// ============================================================
const LEAD_CAPTURE: FlowTemplate = {
  slug: "lead_capture",
  name: "Captura de clientes potenciales",
  description:
    "Saluda a los nuevos contactos, recopila nombre + correo electrónico + empresa y luego los transfiere al equipo de ventas con las respuestas incluidas en la nota.",
  icon: "UserPlus",
  trigger_type: "first_inbound_message",
  trigger_config: {},
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "intro" },
    },
    {
      node_key: "intro",
      node_type: "send_message",
      config: {
        text: "¡Bienvenido! 👋 Te haré unas preguntas rápidas para poder dirigirte a la persona adecuada.",
        next_node_key: "ask_name",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_name",
      node_type: "collect_input",
      config: {
        prompt_text: "¿Cuál es tu nombre?",
        var_key: "name",
        next_node_key: "ask_email",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_email",
      node_type: "collect_input",
      config: {
        prompt_text: "¡Gracias, {{vars.name}}! ¿Cuál es tu correo electrónico de trabajo?",
        var_key: "email",
        next_node_key: "ask_company",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_company",
      node_type: "collect_input",
      config: {
        prompt_text: "Casi terminamos — ¿cuál es el nombre de tu empresa?",
        var_key: "company",
        next_node_key: "handoff",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "handoff",
      node_type: "handoff",
      config: {
        note: "Nuevo cliente potencial — nombre={{vars.name}}, correo={{vars.email}}, empresa={{vars.company}}.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// Registro
// ============================================================

const TEMPLATES: Record<string, FlowTemplate> = {
  welcome_menu: WELCOME_MENU,
  faq_bot: FAQ_BOT,
  lead_capture: LEAD_CAPTURE,
};

export function getFlowTemplate(slug: string): FlowTemplate | null {
  return TEMPLATES[slug] ?? null;
}

export function listFlowTemplates(): FlowTemplate[] {
  return Object.values(TEMPLATES);
}
