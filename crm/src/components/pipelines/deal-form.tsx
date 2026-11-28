"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CURRENCIES } from "@/lib/currency";
import type {
  Contact,
  Conversation,
  Deal,
  PipelineStage,
  Profile,
} from "@/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Trash2, MessageSquare, DollarSign, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  sortStages,
  stageMoveConfirmation,
} from "@/lib/pipelines/stage-status";
import {
  StageMoveConfirm,
  type PendingStageMove,
} from "./stage-move-confirm";

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  pipelineId: string;
  stages: PipelineStage[];
  defaultStageId?: string;
  onSaved: () => void;
}

export function DealForm({
  open,
  onOpenChange,
  deal,
  pipelineId,
  stages,
  defaultStageId,
  onSaved,
}: DealFormProps) {
  const t = useTranslations("Pipelines.form");
  const supabase = createClient();
  const { accountId, defaultCurrency } = useAuth();

  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [contactId, setContactId] = useState("");
  const [stageId, setStageId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [linkedConversation, setLinkedConversation] =
    useState<Conversation | null>(null);

  const [saving, setSaving] = useState(false);
  // Guardar un cambio de etapa hacia/desde Ganada o Perdida pide
  // confirmacion, igual que al arrastrar en el tablero.
  const [pendingMove, setPendingMove] = useState<PendingStageMove | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset the form fields every time the sheet opens or its input
  // props change. This is a legitimate prop-driven sync; the rule is
  // over-cautious here, hence the block-level disable.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (deal) {
      setTitle(deal.title);
      setValue(String(deal.value ?? ""));
      setCurrency(deal.currency || defaultCurrency);
      // contact_id is nullable when the contact has been deleted
      // (migration 004: ON DELETE SET NULL). "" means "no selection".
      setContactId(deal.contact_id ?? "");
      setStageId(deal.stage_id);
      setAssignedTo(deal.assigned_to ?? "");
      setExpectedCloseDate(deal.expected_close_date ?? "");
      setNotes(deal.notes ?? "");
    } else {
      setTitle("");
      setValue("");
      setCurrency(defaultCurrency);
      setContactId("");
      setStageId(defaultStageId || stages[0]?.id || "");
      setAssignedTo("");
      setExpectedCloseDate("");
      setNotes("");
    }
  }, [open, deal, defaultStageId, stages, defaultCurrency]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load supporting data once the sheet is open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("contacts").select("*").order("name"),
        supabase.from("profiles").select("*").order("full_name"),
      ]);
      if (cancelled) return;
      setContacts((c.data ?? []) as Contact[]);
      setProfiles((p.data ?? []) as Profile[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  // Fetch linked conversation for the selected contact (newest open one).
  // Clearing on no-selection is sync with prop state; the populated
  // case runs setLinkedConversation inside the async fetch callback.
  useEffect(() => {
    if (!open || !contactId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinkedConversation(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("contact_id", contactId)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setLinkedConversation((data as Conversation | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, contactId, supabase]);

  function handleSave() {
    if (!title.trim() || !contactId || !stageId) {
      toast.error(t("toastRequired"));
      return;
    }
    if (deal && deal.stage_id !== stageId) {
      const kind = stageMoveConfirmation(
        stages.find((s) => s.id === deal.stage_id)?.kind,
        stages.find((s) => s.id === stageId)?.kind,
      );
      if (kind) {
        setPendingMove({ kind, dealTitle: title.trim() });
        return;
      }
    }
    void saveDeal();
  }

  async function saveDeal() {
    setSaving(true);

    // Sin status: la etapa lo decide en la base de datos (migracion 045).
    const payload = {
      title: title.trim(),
      value: parseFloat(value) || 0,
      currency,
      contact_id: contactId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      assigned_to: assignedTo || null,
      notes: notes.trim() || null,
      expected_close_date: expectedCloseDate || null,
    };

    if (deal) {
      const { error } = await supabase
        .from("deals")
        .update(payload)
        .eq("id", deal.id);
      if (error) {
        toast.error(t("toastFailedSave"));
        setSaving(false);
        return;
      }
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        toast.error(t("toastNotSignedIn"));
        setSaving(false);
        return;
      }
      if (!accountId) {
        toast.error(t("toastNotLinked"));
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("deals")
        .insert({ ...payload, user_id: user.id, account_id: accountId });
      if (error) {
        toast.error(t("toastFailedCreate"));
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast.success(deal ? t("toastUpdated") : t("toastCreated"));
    onOpenChange(false);
    onSaved();
  }

  async function handleDelete() {
    if (!deal) return;
    setDeleting(true);
    const { error } = await supabase.from("deals").delete().eq("id", deal.id);
    setDeleting(false);
    if (error) {
      toast.error(t("toastFailedDelete"));
      return;
    }
    toast.success(t("toastDeleted"));
    setConfirmDelete(false);
    onOpenChange(false);
    onSaved();
  }

  const labelClass =
    "text-xs font-medium uppercase tracking-wide text-muted-foreground";
  const fieldClass = "h-10 border-border bg-muted/60 text-foreground";
  const selectClass =
    "h-10 w-full rounded-lg border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary";
  const stageColor = stages.find((s) => s.id === stageId)?.color;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden border-border bg-popover p-0 text-popover-foreground sm:max-w-2xl">
        <DialogHeader className="border-b border-border/50 px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-3 text-base text-popover-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Briefcase className="h-4 w-4" />
            </span>
            {deal ? t("editDeal") : t("newDeal")}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {/* Titulo */}
            <div className="grid gap-2 sm:col-span-2">
              <Label className={labelClass}>{t("title")}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                className="h-11 border-border bg-muted/60 text-base font-medium text-foreground"
              />
            </div>

            {/* Contacto */}
            <div className="grid content-start gap-2">
              <Label className={labelClass}>{t("contact")}</Label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className={selectClass}
              >
                <option value="">{t("selectContact")}</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.phone}
                  </option>
                ))}
              </select>

              {linkedConversation && (
                <Link
                  href="/inbox"
                  className="inline-flex items-center gap-1.5 self-start rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
                >
                  <MessageSquare className="h-3 w-3" />
                  {t("linkToConversation")}
                </Link>
              )}
            </div>

            {/* Asignado a */}
            <div className="grid content-start gap-2">
              <Label className={labelClass}>{t("assignedTo")}</Label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className={selectClass}
              >
                <option value="">{t("unassigned")}</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Etapa (con el color de la etapa) */}
            <div className="grid content-start gap-2">
              <Label className={labelClass}>{t("stage")}</Label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: stageColor }}
                />
                <select
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className={cn(selectClass, "pl-8")}
                >
                  {sortStages(stages).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fecha estimada de cierre */}
            <div className="grid content-start gap-2">
              <Label className={labelClass}>{t("expectedCloseDate")}</Label>
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className={fieldClass}
              />
            </div>

            {/* Valor y moneda */}
            <div className="grid grid-cols-[1fr_7rem] gap-3 sm:col-span-2">
              <div className="grid gap-2">
                <Label className={labelClass}>{t("value")}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0"
                    className="h-10 border-border bg-muted/60 pl-8 text-foreground"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className={labelClass}>{t("currency")}</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={selectClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notas */}
            <div className="grid gap-2 sm:col-span-2">
              <Label className={labelClass}>{t("notes")}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                className="min-h-24 border-border bg-muted/60 text-foreground"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 border-border bg-popover/50 px-5 py-4 sm:items-center">
          {deal &&
            (confirmDelete ? (
              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs sm:mr-2">
                <span className="text-red-300">{t("deletePrompt")}</span>
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="rounded px-2 py-1 text-muted-foreground hover:bg-muted"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? t("deleting") : t("confirm")}
                  </button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="text-red-400 hover:bg-red-500/10 hover:text-red-300 sm:mr-auto"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                {t("deleteDeal")}
              </Button>
            ))}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border bg-transparent text-muted-foreground hover:bg-muted"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || !contactId || !stageId}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? t("saving") : deal ? t("saveChanges") : t("createDeal")}
          </Button>
        </DialogFooter>

        {/* Dentro del contenido: dialogo anidado, no cierra el formulario */}
        <StageMoveConfirm
          pending={pendingMove}
          onCancel={() => setPendingMove(null)}
          onConfirm={() => {
            setPendingMove(null);
            void saveDeal();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
