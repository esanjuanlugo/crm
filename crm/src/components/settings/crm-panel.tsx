'use client';

import { FieldsAndTagsPanel } from './fields-and-tags-panel';
import { DealsSettings } from './deals-settings';

/**
 * CRM data = fields & tags + deals & currency: both define how contacts
 * and sales are organised.
 */
export function CrmPanel() {
  return (
    <div className="space-y-12">
      <div id="settings-fields" className="min-w-0 scroll-mt-6">
        <FieldsAndTagsPanel />
      </div>
      <div id="settings-deals" className="min-w-0 scroll-mt-6">
        <DealsSettings />
      </div>
    </div>
  );
}
