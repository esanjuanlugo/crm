
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function SettingsPanelHead({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Layout responsive
        'mb-5 flex w-full min-w-0 flex-col gap-3',

        // Tablet y escritorio
        'sm:flex-row sm:items-start sm:justify-between sm:gap-6',

        // Espaciado adaptable
        'sm:mb-6',

        className,
      )}
    >
      {/* Title and description */}
      <div className="min-w-0 flex-1">
        <h2 className="break-words text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </h2>

        {description && (
          <p className="mt-1 max-w-[62ch] break-words text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Action */}
      {action && (
        <div
          className={cn(
            'flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2',

            // Alineación en pantallas grandes
            'sm:w-auto sm:justify-end',
          )}
        >
          {action}
        </div>
      )}
    </div>
  );
}
