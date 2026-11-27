"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Deal, PipelineStage } from "@/types";
import { DealCard } from "./deal-card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import { useLocale, useTranslations } from "next-intl";
import { computeStageProbability } from "@/lib/pipeline-probability";
import { useDragMode, type DragMode } from "@/hooks/use-media-query";

interface PipelineBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  onDealMoved: (dealId: string, newStageId: string) => void;
  onEditDeal: (deal: Deal) => void;
}

export function PipelineBoard({
  stages,
  deals,
  onDealMoved,
  onEditDeal,
}: PipelineBoardProps) {
  const { defaultCurrency } = useAuth();
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages],
  );

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const stage of sortedStages) map.set(stage.id, []);
    for (const deal of deals) {
      const bucket = map.get(deal.stage_id);
      if (bucket) bucket.push(deal);
    }
    return map;
  }, [sortedStages, deals]);

  const grandTotal = useMemo(
    () =>
      deals
        .filter((d) => d.status !== "lost")
        .reduce((s, d) => s + Number(d.value || 0), 0),
    [deals],
  );

  // Celular: sin arrastre (la etapa se cambia desde el detalle).
  // Tablet tactil: mantener presionado 250 ms; deslizar hace scroll.
  // Escritorio: mouse + teclado, como siempre.
  const dragMode = useDragMode();

  // 5px activation distance avoids clicks being interpreted as drags.
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 8 },
  });
  // Keyboard drag support: focus a card, Space to pick up, arrows to move,
  // Space to drop, Escape to cancel.
  const keyboardSensor = useSensor(KeyboardSensor);
  // useSensors descarta los null; el numero de argumentos no cambia.
  const sensors = useSensors(
    dragMode === "pointer" ? pointerSensor : null,
    dragMode === "touch" ? touchSensor : null,
    dragMode !== "none" ? keyboardSensor : null,
  );

  const activeDeal = activeDealId
    ? deals.find((d) => d.id === activeDealId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDealId(String(event.active.id));
    // Pequena vibracion al levantar la tarjeta con el dedo.
    if (dragMode === "touch" && typeof navigator !== "undefined") {
      navigator.vibrate?.(10);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDealId(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id);
    const targetStageId = String(over.id);

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === targetStageId) return;
    if (!sortedStages.some((s) => s.id === targetStageId)) return;

    onDealMoved(dealId, targetStageId);
  }

  function handleDragCancel() {
    setActiveDealId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* snap-x + snap-mandatory on mobile so swipes land the next
          stage cleanly at the viewport edge instead of mid-column.
          Disabled on lg+ where snapping would interfere with the
          natural layout. The board can still overflow horizontally on
          lg+ once a pipeline has many stages (columns keep a 260px
          min-width), so a thin scrollbar stays visible on desktop. */}
      <div className="pipeline-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 lg:snap-none">
        {sortedStages.map((stage) => {
          const stageDeals = dealsByStage.get(stage.id) ?? [];
          const probability = computeStageProbability(stage, sortedStages);
          const weighted =
            stageDeals
              .filter((d) => d.status !== "won" && d.status !== "lost")
              .reduce((s, d) => s + Number(d.value || 0), 0) * probability;
          // Las perdidas no cuentan en el valor de la etapa ni en su porcentaje.
          const totalValue = stageDeals
            .filter((d) => d.status !== "lost")
            .reduce((s, d) => s + Number(d.value || 0), 0);
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              totalValue={totalValue}
              share={grandTotal > 0 ? totalValue / grandTotal : 0}
              probability={probability}
              weighted={weighted}
              currency={defaultCurrency}
              onEditDeal={onEditDeal}
              dragMode={dragMode}
            />
          );
        })}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {activeDeal ? (
          <div
            className={cn(
              "opacity-90",
              // Feedback al levantar con el dedo: un poco mas grande.
              dragMode === "touch" && "scale-[1.03] rotate-1",
            )}
          >
            <DealCard
              deal={activeDeal}
              stage={
                sortedStages.find((s) => s.id === activeDeal.stage_id) ?? null
              }
              onEdit={() => {}}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>

      <style jsx>{`
        .pipeline-scroll {
          scroll-behavior: smooth;
        }
        /* On touch devices the peek/snap layout already signals there's
           more to swipe, so the scrollbar is hidden for a clean look.
           On desktop (mouse) the board can overflow with many stages
           and there is no peek hint, so keep a thin, themed scrollbar
           visible to make the overflow discoverable and usable. */
        @media (hover: none), (pointer: coarse) {
          .pipeline-scroll::-webkit-scrollbar {
            height: 0;
            display: none;
          }
          .pipeline-scroll {
            scrollbar-width: none;
          }
        }
        @media (hover: hover) and (pointer: fine) {
          .pipeline-scroll {
            scrollbar-width: thin;
            scrollbar-color: var(--border) transparent;
          }
          .pipeline-scroll::-webkit-scrollbar {
            height: 8px;
          }
          .pipeline-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .pipeline-scroll::-webkit-scrollbar-thumb {
            background-color: var(--border);
            border-radius: 9999px;
          }
          .pipeline-scroll::-webkit-scrollbar-thumb:hover {
            background-color: var(--muted-foreground);
          }
        }
      `}</style>
    </DndContext>
  );
}

const COL_ES = {
  ofValue: "del valor",
  prob: "Prob.",
  weighted: "Ponderado",
};

const COL_EN: typeof COL_ES = {
  ofValue: "of value",
  prob: "Prob.",
  weighted: "Weighted",
};

function StageColumn({
  stage,
  deals,
  totalValue,
  share,
  probability,
  weighted,
  currency,
  onEditDeal,
  dragMode,
}: {
  stage: PipelineStage;
  deals: Deal[];
  totalValue: number;
  share: number;
  probability: number;
  weighted: number;
  currency: string;
  onEditDeal: (deal: Deal) => void;
  dragMode: DragMode;
}) {
  const t = useTranslations("Pipelines.board");
  const locale = useLocale();
  const L = locale === "es" ? COL_ES : COL_EN;
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    // Mismo comportamiento responsivo de siempre: en movil cada columna mide
    // 85vw (se asoma la siguiente) y en lg+ se reparten el ancho.
    // La columna es un "carril" de fondo muy sutil; el encabezado es un
    // titulo (sin fondo) y solo la zona de tarjetas hace scroll, asi el
    // encabezado queda fijo arriba. El area soltable es la zona de tarjetas.
    <div className="flex max-h-[calc(100dvh-7rem)] w-[85vw] min-w-[260px] max-w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] light:border-slate-200 light:bg-slate-100 lg:w-auto lg:min-w-[210px] lg:max-w-none lg:flex-1 lg:basis-[210px] lg:shrink lg:snap-none">
      {/* Franja superior con el color de la etapa (identidad de un vistazo) */}
      <div
        aria-hidden
        className="h-[3px] shrink-0"
        style={{ backgroundColor: stage.color }}
      />

      {/* Rotulo de la etapa: tinte suave del color de borde a borde, sin
          bordes ni esquinas propias, hasta la divisoria. */}
      <div
        className="sticky top-0 z-10 shrink-0 px-3.5 pb-2.5 pt-3"
        style={{
          backgroundColor:
            "color-mix(in srgb, " + stage.color + " 7%, transparent)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3
            className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: stage.color }}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="truncate">{stage.name}</span>
          </h3>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-foreground"
            style={{
              backgroundColor:
                "color-mix(in srgb, " + stage.color + " 25%, transparent)",
            }}
          >
            {deals.length}
          </span>
        </div>
        <p className="mt-1.5 text-base font-medium tracking-tight text-white/70 light:text-slate-600">
          {formatCurrency(totalValue, currency)}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full"
              style={{
                width: Math.round(share * 100) + "%",
                backgroundColor: stage.color,
              }}
            />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-white/50 light:text-slate-500">
            <span className="font-semibold">{Math.round(share * 100)} %</span>{" "}
            {L.ofValue}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-tight text-white/50 light:text-slate-500">
          {L.prob} {Math.round(probability * 100)} % {"\u00b7"} {L.weighted}{" "}
          {formatCurrency(weighted, currency)}
        </p>
      </div>

      {/* Divisoria con el color de la etapa: separa el titulo de las tarjetas */}
      <div
        aria-hidden
        className="h-0.5 shrink-0 opacity-70"
        style={{ backgroundColor: stage.color }}
      />

      <div
        ref={setNodeRef}
        className={cn(
          "m-2 flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto rounded-xl p-1.5 transition-all",
          isOver
            ? "bg-primary/5 outline outline-2 outline-dashed outline-primary outline-offset-2"
            : "",
        )}
      >
        {deals.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 px-2 py-8 text-center text-xs text-muted-foreground/70">
            {t("dropDealHere")}
          </div>
        ) : (
          deals.map((deal) => (
            <DraggableDealCard
              key={deal.id}
              deal={deal}
              stage={stage}
              onEdit={onEditDeal}
              dragMode={dragMode}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableDealCard({
  deal,
  stage,
  onEdit,
  dragMode,
}: {
  deal: Deal;
  stage: PipelineStage;
  onEdit: (deal: Deal) => void;
  dragMode: DragMode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    disabled: dragMode === "none",
  });

  // Al soltar una tarjeta (sobre todo tras mantener presionado en la
  // tablet) el navegador puede disparar un clic que abriria el detalle.
  // Se ignora ese clic durante un instante despues de arrastrar.
  const suppressClick = useRef(false);
  useEffect(() => {
    if (isDragging) {
      suppressClick.current = true;
      return;
    }
    if (!suppressClick.current) return;
    const timer = setTimeout(() => {
      suppressClick.current = false;
    }, 300);
    return () => clearTimeout(timer);
  }, [isDragging]);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClickCapture={(e) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        opacity: isDragging ? 0.3 : 1,
        // Con mouse se bloquea el gesto tactil como antes. En tablet y
        // celular el dedo debe poder hacer scroll sobre la tarjeta.
        touchAction: dragMode === "pointer" ? "none" : "manipulation",
        // Evita la seleccion de texto y el menu del sistema al mantener
        // presionado en la tablet.
        ...(dragMode === "touch"
          ? { WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }
          : null),
      }}
    >
      <DealCard deal={deal} stage={stage} onEdit={onEdit} />
    </div>
  );
}
