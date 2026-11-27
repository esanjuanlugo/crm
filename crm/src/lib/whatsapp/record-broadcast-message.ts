// ============================================================
// Persist a broadcast send into the Inbox.
//
// Broadcasts used to only stamp `broadcast_recipients`: the template
// reached the customer's WhatsApp but never showed up in their
// conversation, so the team (and the AI agent) had no record of it
// when the customer replied.
//
// This records each successful send the same way the chat composer
// does (`sendMessageToConversation`): find-or-create the contact's
// conversation, insert an outbound `template` message with the
// substituted body + header media + `template_name`, and bump the
// conversation preview. It does NOT touch `unread_count` and does NOT
// run the AI auto-reply (that only fires on inbound webhooks).
//
// The `message_id` column carries Meta's wamid, so the status webhook
// (which matches on it) advances delivered/read on this row exactly as
// it does on `broadcast_recipients`.
//
// Best-effort by design: a persistence failure is logged and swallowed
// — the message already went out, so the campaign must not fail.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

import type { MessageTemplate } from '@/types';
import { findExistingContact } from '@/lib/contacts/dedupe';
import { resolveAuditUserId } from '@/lib/api/v1/contacts';
import { sanitizePhoneForMeta } from '@/lib/whatsapp/phone-utils';
import {
  findOrCreateConversationRow,
  resolveConversationByPhone,
} from '@/lib/whatsapp/resolve-conversation';
import {
  insertOutboundMessage,
  outboundTemplateFields,
  touchConversationLastMessage,
} from '@/lib/whatsapp/send-message';

export interface BroadcastSendRecord {
  /** Known for API / resumed broadcasts (recipient row's contact_id). */
  contactId?: string | null;
  /** Used to find (or create) the contact when `contactId` is absent. */
  phone: string;
  /** Positional body params ({{1}}, {{2}}…). */
  params?: string[] | null;
  /** Structured per-send values (header media override, body…). */
  messageParams?: unknown;
  /** Meta's wamid for this send. */
  waMessageId: string;
}

export type BroadcastMessageRecorder = (send: BroadcastSendRecord) => Promise<void>;

/**
 * Build a recorder for one broadcast pass. The template row and the
 * audit owner are resolved once and reused for every recipient.
 */
export function createBroadcastMessageRecorder(
  db: SupabaseClient,
  accountId: string,
  templateName: string,
  templateRow: MessageTemplate | null
): BroadcastMessageRecorder {
  let ownerUserId: Promise<string> | null = null;
  const owner = () => (ownerUserId ??= resolveAuditUserId(db, accountId));

  async function conversationFor(send: BroadcastSendRecord): Promise<string> {
    if (send.contactId) {
      return findOrCreateConversationRow(db, accountId, send.contactId, await owner());
    }
    const sanitized = sanitizePhoneForMeta(send.phone);
    const existing = await findExistingContact(db, accountId, sanitized);
    if (existing) {
      return findOrCreateConversationRow(db, accountId, existing.id, await owner());
    }
    // No contact yet (legacy `phone_numbers` callers): create it the
    // same way the public API does.
    const resolved = await resolveConversationByPhone(db, accountId, sanitized);
    return resolved.conversationId;
  }

  return async (send) => {
    try {
      const conversationId = await conversationFor(send);
      const fields = outboundTemplateFields(
        templateRow,
        send.params ?? [],
        send.messageParams,
        null
      );

      const { error } = await insertOutboundMessage(db, {
        conversationId,
        senderType: 'agent',
        contentType: 'template',
        contentText: fields.contentText,
        mediaUrl: fields.headerMediaUrl,
        templateName,
        waMessageId: send.waMessageId,
      });
      if (error) throw new Error(error.message);

      await touchConversationLastMessage(
        db,
        conversationId,
        fields.contentText || '[template]'
      );
    } catch (err) {
      console.error(
        '[broadcast] sent but failed to record in the inbox:',
        send.waMessageId,
        err instanceof Error ? err.message : err
      );
    }
  };
}
