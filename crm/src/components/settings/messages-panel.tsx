'use client';

import { TemplateManager } from './template-manager';
import { QuickRepliesManager } from './quick-replies-manager';

/**
 * Messages = WhatsApp templates + quick replies: both are reusable
 * content for writing to contacts.
 */
export function MessagesPanel() {
  return (
    <div className="space-y-12">
      <div id="settings-templates" className="min-w-0 scroll-mt-6">
        <TemplateManager />
      </div>
      <div id="settings-quick-replies" className="min-w-0 scroll-mt-6">
        <QuickRepliesManager />
      </div>
    </div>
  );
}
