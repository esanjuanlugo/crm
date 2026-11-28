'use client';

import { Check, RotateCcw, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StageMoveConfirmation } from '@/lib/pipelines/stage-status';

export interface PendingStageMove {
  kind: StageMoveConfirmation;
  dealTitle: string;
}

/**
 * Confirmacion al mover una oportunidad a Ganada/Perdida, o al sacarla
 * de ahi (la reabre). Cerrar el dialogo equivale a cancelar.
 */
export function StageMoveConfirm({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingStageMove | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations('Pipelines.confirmMove');
  const kind = pending?.kind ?? 'won';
  const title = pending?.dealTitle ?? '';

  const Icon = kind === 'won' ? Check : kind === 'lost' ? X : RotateCcw;

  return (
    <Dialog
      open={!!pending}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                kind === 'won' && 'bg-green-500/15 text-green-500',
                kind === 'lost' && 'bg-red-500/15 text-red-500',
                kind === 'reopen' && 'bg-primary/15 text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            {kind === 'won'
              ? t('wonTitle', { title })
              : kind === 'lost'
                ? t('lostTitle', { title })
                : t('reopenTitle', { title })}
          </DialogTitle>
          <DialogDescription>
            {kind === 'won'
              ? t('wonDescription')
              : kind === 'lost'
                ? t('lostDescription')
                : t('reopenDescription')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button
            variant={kind === 'lost' ? 'destructive' : 'default'}
            onClick={onConfirm}
            autoFocus
          >
            {kind === 'won'
              ? t('confirmWon')
              : kind === 'lost'
                ? t('confirmLost')
                : t('confirmReopen')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
