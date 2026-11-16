"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Lightbulb,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsPanelHead } from "./settings-panel-head";
import {
  InteractiveBuilder,
  blankButtonsPayload,
} from "@/components/interactive/interactive-builder";
import {
  interactivePayloadPreviewText,
  type InteractiveMessagePayload,
} from "@/lib/whatsapp/interactive";
import type { QuickReply, QuickReplyKind } from "@/types";

interface DraftState {
  id?: string;
  title: string;
  kind: QuickReplyKind;
  content_text: string;
  interactive_payload: InteractiveMessagePayload;
}

function emptyDraft(): DraftState {
  return {
    title: "",
    kind: "text",
    content_text: "",
    interactive_payload: blankButtonsPayload(),
  };
}

export function QuickRepliesManager() {
  const [items, setItems] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "text" | "interactive">("all");
  const [ideaKind, setIdeaKind] = useState<"text" | "interactive">("text");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quick-replies", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setItems((data.quick_replies as QuickReply[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => setDraft(emptyDraft());
  const openEdit = (qr: QuickReply) =>
    setDraft({
      id: qr.id,
      title: qr.title,
      kind: qr.kind,
      content_text: qr.content_text ?? "",
      interactive_payload:
        qr.interactive_payload ?? blankButtonsPayload(),
    });

  const save = useCallback(async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("Ponle un nombre a la respuesta rápida.");
      return;
    }
    const payload =
      draft.kind === "interactive"
        ? { title: draft.title, kind: "interactive", interactive_payload: draft.interactive_payload }
        : { title: draft.title, kind: "text", content_text: draft.content_text };

    setSaving(true);
    try {
      const res = await fetch(
        draft.id ? `/api/quick-replies/${draft.id}` : "/api/quick-replies",
        {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo guardar la respuesta rápida.");
        return;
      }
      toast.success(
        draft.id
          ? "Respuesta rápida actualizada."
          : "Respuesta rápida creada.",
      );
      setDraft(null);
      await load();
    } catch {
      toast.error("No se pudo guardar la respuesta rápida.");
    } finally {
      setSaving(false);
    }
  }, [draft, load]);

  const remove = useCallback(
    async (id: string) => {
      if (!window.confirm("¿Eliminar esta respuesta rápida?")) return;
      const res = await fetch(`/api/quick-replies/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo eliminar la respuesta rápida.");
        return;
      }
      await load();
    },
    [load],
  );

  const needle = query.trim().toLowerCase();
  const previewOf = (qr: QuickReply) =>
    qr.kind === "interactive" && qr.interactive_payload
      ? interactivePayloadPreviewText(qr.interactive_payload)
      : (qr.content_text ?? "");
  const filtered = items.filter((qr) => {
    if (filter !== "all" && qr.kind !== filter) return false;
    if (!needle) return true;
    return (
      qr.title.toLowerCase().includes(needle) ||
      previewOf(qr).toLowerCase().includes(needle)
    );
  });
  const openFromIdea = (idea: Idea) =>
    setDraft(
      idea.kind === "interactive"
        ? {
            ...emptyDraft(),
            title: idea.title,
            kind: "interactive",
            interactive_payload: structuredClone(idea.payload),
          }
        : { ...emptyDraft(), title: idea.title, content_text: idea.text },
    );
  const visibleIdeas = IDEAS.filter((i) => i.kind === ideaKind);

  return (
    <div>
      <SettingsPanelHead
        title="Respuestas rápidas"
        description="Guarda mensajes reutilizables, de texto o interactivos, para que los agentes puedan insertarlos desde el compositor de mensajes."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 3xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {items.length > 0 && (
              <div className="relative w-full lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o contenido..."
                  autoComplete="off"
                  className="bg-muted pl-9 text-foreground"
                />
              </div>

               <Button
              onClick={openCreate}
              className="w-full shrink-0 sm:w-auto sm:self-start lg:self-auto"
            >
              <Plus className="mr-1 h-4 w-4" />
              Nueva respuesta rápida
            </Button>
            )}
            {items.length > 0 && (
              <div className="flex flex-wrap gap-2 lg:ml-auto">
                <FilterChip
                  active={filter === "all"}
                  label="Todas"
                  onClick={() => setFilter("all")}
                />
                <FilterChip
                  active={filter === "text"}
                  label="Texto"
                  onClick={() => setFilter("text")}
                />
                <FilterChip
                  active={filter === "interactive"}
                  label="Interactivas"
                  onClick={() => setFilter("interactive")}
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Zap className="size-6" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Aún no tienes respuestas rápidas
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Crea una para reutilizarla en tus conversaciones, o elige una
                de las ideas para empezar (de texto o interactivas).
              </p>
              <Button className="mt-5" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Crear mi primera respuesta
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No hay respuestas que coincidan con tu búsqueda.
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
                className="ml-2 text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 3xl:grid-cols-3">
              {filtered.map((qr) => (
                <li
                  key={qr.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={
                        "flex size-9 shrink-0 items-center justify-center rounded-lg " +
                        (qr.kind === "interactive"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {qr.kind === "interactive" ? (
                        <Zap className="size-4" />
                      ) : (
                        <MessageSquare className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {qr.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {qr.kind === "interactive" ? "Interactiva" : "Texto"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar"
                        onClick={() => openEdit(qr)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Eliminar"
                        onClick={() => remove(qr.id)}
                        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="line-clamp-3 min-h-[3.75rem] whitespace-pre-line break-words text-sm text-muted-foreground">
                    {previewOf(qr) || "Sin contenido"}
                  </p>
                  <p className="mt-auto text-xs text-muted-foreground/70">
                    Actualizada {formatDate(qr.updated_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-4 xl:self-start">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Cómo usarlas
            </h3>
            <ol className="mt-3 space-y-3">
              {STEPS.map((step, i) => (
                <li
                  key={step}
                  className="flex gap-3 text-sm text-muted-foreground"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lightbulb className="size-4 text-primary" />
              Ideas para empezar
            </h3>
            <div className="mt-3 flex gap-2">
              <FilterChip
                active={ideaKind === "text"}
                label="Texto"
                onClick={() => setIdeaKind("text")}
              />
              <FilterChip
                active={ideaKind === "interactive"}
                label="Interactivas"
                onClick={() => setIdeaKind("interactive")}
              />
            </div>
            <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              {visibleIdeas.map((idea) => (
                <li key={idea.title}>
                  <button
                    type="button"
                    onClick={() => openFromIdea(idea)}
                    className="w-full rounded-lg border border-border bg-muted/40 p-3 text-left transition-colors hover:border-primary/40"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {idea.title}
                      </span>
                      {idea.kind === "interactive" && (
                        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {idea.payload.kind === "buttons" ? "Botones" : "Lista"}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                      {idea.kind === "interactive"
                        ? interactivePayloadPreviewText(idea.payload)
                        : idea.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {draft?.id
                ? "Editar respuesta rápida"
                : "Nueva respuesta rápida"}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="max-h-[70vh] space-y-3 overflow-y-auto">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Nombre
                </label>
                <Input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  placeholder="Ej. Horario de atención"
                  className="bg-muted text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <KindTab
                  active={draft.kind === "text"}
                  label="Texto"
                  onClick={() => setDraft({ ...draft, kind: "text" })}
                />
                <KindTab
                  active={draft.kind === "interactive"}
                  label="Interactive"
                  onClick={() => setDraft({ ...draft, kind: "interactive" })}
                />
              </div>
              {draft.kind === "text" ? (
                <Textarea
                  value={draft.content_text}
                  onChange={(e) =>
                    setDraft({ ...draft, content_text: e.target.value })
                  }
                  placeholder="Escribe el mensaje que quieres insertar"
                  className="min-h-28 bg-muted text-foreground"
                />
              ) : (
                <InteractiveBuilder
                  value={draft.interactive_payload}
                  onChange={(p) =>
                    setDraft({ ...draft, interactive_payload: p })
                  }
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDraft(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KindTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex-1 rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
          : "flex-1 rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </button>
  );
}

const STEPS = [
  "Abre una conversación en la bandeja de entrada.",
  "En el compositor de mensajes, abre Respuestas rápidas y elige una.",
  "Se agrega al mensaje: revísala y envíala.",
];

type Idea =
  | { kind: "text"; title: string; text: string }
  | { kind: "interactive"; title: string; payload: InteractiveMessagePayload };

const IDEAS: Idea[] = [
  // ---- Texto ----
  {
    kind: "text",
    title: "Saludo de bienvenida",
    text: "¡Hola! Gracias por escribirnos. ¿En qué podemos ayudarte hoy?",
  },
  {
    kind: "text",
    title: "Horario de atención",
    text: "Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00 h. Te responderemos en cuanto abramos.",
  },
  {
    kind: "text",
    title: "Fuera de horario",
    text: "Gracias por escribirnos. En este momento estamos fuera de horario; te responderemos el siguiente día hábil.",
  },
  {
    kind: "text",
    title: "Solicitar datos",
    text: "Para ayudarte mejor, ¿nos compartes tu nombre completo y lo que estás buscando?",
  },
  {
    kind: "text",
    title: "Datos de pago",
    text: "Puedes pagar por transferencia:\nBanco: ____\nCLABE: ____\nTitular: ____\nCuando pagues, envíanos tu comprobante por este medio.",
  },
  {
    kind: "text",
    title: "Pedido en camino",
    text: "¡Tu pedido va en camino! Tu número de guía es: ____. Cualquier duda, aquí estamos.",
  },
  {
    kind: "text",
    title: "Seguimiento",
    text: "¡Hola! Solo quería dar seguimiento a tu solicitud. ¿Te puedo ayudar con algo más?",
  },
  {
    kind: "text",
    title: "Gracias por tu compra",
    text: "¡Gracias por tu compra! Si tienes cualquier duda, aquí estamos para ayudarte.",
  },
  {
    kind: "text",
    title: "Despedida",
    text: "Gracias por tu preferencia. ¡Que tengas un excelente día!",
  },
  // ---- Interactivas ----
  {
    kind: "interactive",
    title: "Menú de bienvenida",
    payload: {
      kind: "buttons",
      body: "¡Hola! Gracias por escribirnos. ¿Qué te gustaría hacer?",
      buttons: [
        { id: "menu_catalogo", title: "Ver catálogo" },
        { id: "menu_pedido", title: "Hacer un pedido" },
        { id: "menu_asesor", title: "Hablar con asesor" },
      ],
    },
  },
  {
    kind: "interactive",
    title: "Confirmar pedido",
    payload: {
      kind: "buttons",
      body: "¿Confirmamos tu pedido tal como lo platicamos?",
      buttons: [
        { id: "confirmar_si", title: "Sí, confirmar" },
        { id: "confirmar_cambio", title: "Quiero cambiar algo" },
        { id: "confirmar_cancelar", title: "Cancelar" },
      ],
    },
  },
  {
    kind: "interactive",
    title: "Encuesta de satisfacción",
    payload: {
      kind: "buttons",
      body: "¿Cómo fue tu experiencia con nosotros?",
      buttons: [
        { id: "encuesta_excelente", title: "Excelente" },
        { id: "encuesta_buena", title: "Buena" },
        { id: "encuesta_mejorar", title: "Puede mejorar" },
      ],
    },
  },
  {
    kind: "interactive",
    title: "Método de pago",
    payload: {
      kind: "list",
      body: "Elige cómo prefieres pagar:",
      button_label: "Ver opciones",
      sections: [
        {
          title: "Métodos de pago",
          rows: [
            {
              id: "pago_transferencia",
              title: "Transferencia",
              description: "Te enviamos los datos bancarios",
            },
            {
              id: "pago_tarjeta",
              title: "Tarjeta",
              description: "Crédito o débito",
            },
            {
              id: "pago_efectivo",
              title: "Efectivo",
              description: "Al recibir tu pedido",
            },
          ],
        },
      ],
    },
  },
  {
    kind: "interactive",
    title: "Elegir horario",
    payload: {
      kind: "list",
      body: "¿En qué horario te queda mejor?",
      button_label: "Ver horarios",
      sections: [
        {
          title: "Horarios disponibles",
          rows: [
            { id: "horario_manana", title: "Mañana (9 a 12 h)" },
            { id: "horario_tarde", title: "Tarde (12 a 16 h)" },
            { id: "horario_noche", title: "Noche (16 a 19 h)" },
          ],
        },
      ],
    },
  },
  {
    kind: "interactive",
    title: "Menú de categorías",
    payload: {
      kind: "list",
      body: "¿Sobre qué necesitas información?",
      button_label: "Ver temas",
      sections: [
        {
          title: "Temas",
          rows: [
            {
              id: "tema_productos",
              title: "Productos",
              description: "Conoce lo que tenemos disponible",
            },
            {
              id: "tema_promos",
              title: "Promociones",
              description: "Ofertas y descuentos vigentes",
            },
            {
              id: "tema_envios",
              title: "Envíos y entregas",
              description: "Costos, tiempos y rastreo",
            },
            {
              id: "tema_garantia",
              title: "Garantía y cambios",
              description: "Políticas de devolución",
            },
            {
              id: "tema_asesor",
              title: "Hablar con asesor",
              description: "Te atendemos personalmente",
            },
          ],
        },
      ],
    },
  },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        (active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground hover:text-foreground") +
        " inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors"
      }
    >
      {label}
    </button>
  );
}
