"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import type { Pipeline, PipelineStage } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Plus,
  GripVertical,
  AlertTriangle,
  Check,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const STAGE_COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
];

interface PipelineSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline;
  stages: PipelineStage[];
  onPipelinesChanged: () => void;
  onStagesChanged: () => void;
  onCreateNewPipeline: () => void;
}

export function PipelineSettings({
  open,
  onOpenChange,
  pipeline,
  stages,
  onPipelinesChanged,
  onStagesChanged,
  onCreateNewPipeline,
}: PipelineSettingsProps) {
  const t = useTranslations("Pipelines.settings");
  const supabase = createClient();

  const [name, setName] = useState(pipeline.name);
  const [localStages, setLocalStages] = useState<PipelineStage[]>(stages);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset form state when the dialog opens or its prop inputs change
  // — legitimate prop-driven sync.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setName(pipeline.name);
    setLocalStages([...stages].sort((a, b) => a.position - b.position));
    setShowDeleteConfirm(false);
  }, [open, pipeline, stages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleReorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localStages.findIndex((s) => s.id === active.id);
    const newIndex = localStages.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setLocalStages(arrayMove(localStages, oldIndex, newIndex));
  }

  async function handleSave() {
    setSaving(true);

    // One upsert for all stages — batches N stage writes into a single
    // round-trip. Previous implementation did N sequential UPDATEs which
    // latency-scaled linearly with stage count.
    const stageRows = localStages.map((s, i) => ({
      id: s.id,
      pipeline_id: s.pipeline_id,
      name: s.name,
      color: s.color,
      position: i,
    }));

    const [renameRes, stagesRes] = await Promise.all([
      supabase
        .from("pipelines")
        .update({ name: name.trim() })
        .eq("id", pipeline.id),
      supabase.from("pipeline_stages").upsert(stageRows, { onConflict: "id" }),
    ]);

    setSaving(false);

    if (renameRes.error || stagesRes.error) {
      toast.error(t("toastFailedSave"));
      return;
    }

    onOpenChange(false);
    onPipelinesChanged();
    onStagesChanged();
    toast.success(t("toastSaved"));
  }

  async function handleAddStage() {
    const trimmed = newStageName.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from("pipeline_stages")
      .insert({
        pipeline_id: pipeline.id,
        name: trimmed,
        color: newStageColor,
        position: localStages.length,
      })
      .select()
      .single();
    if (error || !data) {
      toast.error(t("toastFailedAddStage"));
      return;
    }
    setLocalStages([...localStages, data as PipelineStage]);
    setNewStageName("");
    setNewStageColor(STAGE_COLORS[(localStages.length + 1) % STAGE_COLORS.length]);
  }

  async function handleRemoveStage(stageId: string) {
    // Refuse to delete if deals still reference the stage (FK would fail).
    const { count } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("stage_id", stageId);
    if (count && count > 0) {
      toast.error(t("toastMoveOrDeleteDeals"));
      return;
    }
    const { error } = await supabase
      .from("pipeline_stages")
      .delete()
      .eq("id", stageId);
    if (error) {
      toast.error(t("toastFailedDeleteStage"));
      return;
    }
    setLocalStages(localStages.filter((s) => s.id !== stageId));
  }

  async function handleDeletePipeline() {
    setDeleting(true);
    // ON DELETE CASCADE handles deals + stages.
    const { error } = await supabase
      .from("pipelines")
      .delete()
      .eq("id", pipeline.id);
    setDeleting(false);
    if (error) {
      toast.error(t("toastFailedDeletePipeline"));
      return;
    }
    onOpenChange(false);
    onPipelinesChanged();
    toast.success(t("toastDeleted"));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-popover border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-base text-popover-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Settings className="h-4 w-4" />
            </span>
            {t("managePipeline")}
          </DialogTitle>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="py-4">
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </span>
              <div>
                <p className="text-sm font-medium text-red-400">
                  {t("deletePipeline")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("deletePipelineDesc")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="border-border bg-transparent text-muted-foreground hover:bg-muted"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleDeletePipeline}
                disabled={deleting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deleting ? t("deleting") : t("deletePipelineBtn")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("pipelineName")}
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 border-border bg-muted/60 text-base font-medium text-foreground"
                />
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("stages")}
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-foreground">
                    {localStages.length}
                  </span>
                </Label>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleReorder}
                >
                  <SortableContext
                    items={localStages.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {localStages.map((stage, index) => (
                        <SortableStageRow
                          key={stage.id}
                          stage={stage}
                          index={index}
                          onNameChange={(v) => {
                            const updated = [...localStages];
                            updated[index] = { ...updated[index], name: v };
                            setLocalStages(updated);
                          }}
                          onColorChange={(v) => {
                            const updated = [...localStages];
                            updated[index] = { ...updated[index], color: v };
                            setLocalStages(updated);
                          }}
                          onRemove={() => handleRemoveStage(stage.id)}
                          colors={STAGE_COLORS}
                          t={t}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Agregar etapa */}
                <div className="space-y-3 rounded-xl border border-dashed border-border/70 p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {STAGE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewStageColor(color)}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-popover transition-transform hover:scale-110",
                          newStageColor === color ? "ring-foreground" : "ring-transparent",
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={"Pick color " + color}
                      >
                        {newStageColor === color && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder={t("newStageNamePlaceholder")}
                      className="border-border bg-muted/60 text-sm text-foreground"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddStage();
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddStage}
                      disabled={!newStageName.trim()}
                      className="shrink-0 border-primary/40 bg-transparent text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {t("add")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-border bg-popover/50">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="mr-auto text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                {t("deletePipeline")}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border bg-transparent text-muted-foreground hover:bg-muted"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? t("saving") : t("saveChanges")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SortableStageRow({
  stage,
  index,
  onNameChange,
  onColorChange,
  onRemove,
  colors,
  t,
}: {
  stage: PipelineStage;
  index: number;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onRemove: () => void;
  colors: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-2 pl-1.5 transition-colors hover:bg-muted/70",
        isDragging && "shadow-lg ring-1 ring-primary/40",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-8 w-6 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground active:cursor-grabbing"
        aria-label={t("dragToReorder")}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-4 shrink-0 text-center text-[11px] font-semibold text-muted-foreground">
        {index + 1}
      </span>
      <ColorSwatch value={stage.color} onChange={onColorChange} colors={colors} t={t} />
      <Input
        value={stage.name}
        onChange={(e) => onNameChange(e.target.value)}
        className="h-8 flex-1 border-transparent bg-transparent text-sm font-medium text-foreground focus:border-border"
      />
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        className="text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ColorSwatch({
  value,
  onChange,
  colors,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  colors: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-5 w-5 rounded-full border-2 border-white/20 shadow-sm transition-transform hover:scale-110"
        style={{ backgroundColor: value }}
        aria-label={t("changeColor")}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-20 grid w-40 grid-cols-5 gap-2 rounded-xl border border-border bg-popover p-3 shadow-xl">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-popover transition-transform hover:scale-110",
                  c === value ? "ring-foreground" : "ring-transparent",
                )}
                style={{ backgroundColor: c }}
              >
                {c === value && <Check className="h-3 w-3 text-white" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
