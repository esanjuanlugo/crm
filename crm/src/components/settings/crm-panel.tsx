'use client';

import { FieldsAndTagsPanel } from './fields-and-tags-panel';

/**
 * CRM data = fields & tags. La moneda ahora vive en el menu de la
 * barra superior (CurrencyMenu), junto a Apariencia.
 */
export function CrmPanel() {
  return (
    <div id="settings-fields" className="min-w-0 scroll-mt-6">
      <FieldsAndTagsPanel />
    </div>
  );
}
