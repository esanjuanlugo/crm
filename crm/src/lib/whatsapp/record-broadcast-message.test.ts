import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MessageTemplate } from '@/types';

const findOrCreateConversationRow = vi.fn(async () => 'conv-1');
const resolveConversationByPhone = vi.fn(async () => ({
  conversationId: 'conv-new',
  contactId: 'c-new',
  contactCreated: true,
}));
const findExistingContact = vi.fn();

vi.mock('@/lib/whatsapp/resolve-conversation', () => ({
  findOrCreateConversationRow: (...a: unknown[]) =>
    (findOrCreateConversationRow as (...x: unknown[]) => unknown)(...a),
  resolveConversationByPhone: (...a: unknown[]) =>
    (resolveConversationByPhone as (...x: unknown[]) => unknown)(...a),
}));
vi.mock('@/lib/contacts/dedupe', () => ({
  findExistingContact: (...a: unknown[]) =>
    (findExistingContact as (...x: unknown[]) => unknown)(...a),
}));
vi.mock('@/lib/api/v1/contacts', () => ({
  resolveAuditUserId: vi.fn(async () => 'owner-1'),
}));

import { createBroadcastMessageRecorder } from './record-broadcast-message';

/** Records every insert/update so the test can assert what was written. */
function fakeDb(opts: { insertError?: string } = {}) {
  const inserts: Record<string, unknown>[] = [];
  const updates: { table: string; values: Record<string, unknown> }[] = [];
  const db = {
    from(table: string) {
      return {
        insert(values: Record<string, unknown>) {
          inserts.push({ table, ...values });
          return {
            select: () => ({
              single: async () =>
                opts.insertError
                  ? { data: null, error: { message: opts.insertError } }
                  : { data: { id: 'm-1' }, error: null },
            }),
          };
        },
        update(values: Record<string, unknown>) {
          updates.push({ table, values });
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { db, inserts, updates };
}

const template = {
  name: 'promo',
  body_text: 'Hola {{1}}, tu pedido {{2}} va en camino',
  header_type: 'image',
  header_media_url: 'https://cdn.example/promo.jpg',
} as unknown as MessageTemplate;

describe('createBroadcastMessageRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findExistingContact.mockResolvedValue({ id: 'c-1' });
  });

  it('stores the sent template as an outbound message, like the chat composer', async () => {
    const { db, inserts, updates } = fakeDb();
    const record = createBroadcastMessageRecorder(db, 'acc', 'promo', template);

    await record({
      contactId: 'c-1',
      phone: '5215555509414',
      params: ['Ana', '#42'],
      waMessageId: 'wamid.ABC',
    });

    expect(findOrCreateConversationRow).toHaveBeenCalledWith(db, 'acc', 'c-1', 'owner-1');
    expect(inserts).toEqual([
      expect.objectContaining({
        table: 'messages',
        conversation_id: 'conv-1',
        sender_type: 'agent',
        content_type: 'template',
        content_text: 'Hola Ana, tu pedido #42 va en camino',
        media_url: 'https://cdn.example/promo.jpg',
        template_name: 'promo',
        message_id: 'wamid.ABC',
        status: 'sent',
      }),
    ]);
    // Preview + timestamp bumped; unread_count untouched.
    expect(updates).toHaveLength(1);
    expect(updates[0].table).toBe('conversations');
    expect(updates[0].values).toMatchObject({
      last_message_text: 'Hola Ana, tu pedido #42 va en camino',
    });
    expect(updates[0].values).not.toHaveProperty('unread_count');
  });

  it('prefers a per-send header media override', async () => {
    const { db, inserts } = fakeDb();
    const record = createBroadcastMessageRecorder(db, 'acc', 'promo', template);
    await record({
      contactId: 'c-1',
      phone: '5215555509414',
      params: ['Ana', '#42'],
      messageParams: { headerMediaUrl: 'https://cdn.example/other.jpg' },
      waMessageId: 'wamid.X',
    });
    expect(inserts[0].media_url).toBe('https://cdn.example/other.jpg');
  });

  it('finds the contact by phone when no contactId is given', async () => {
    const { db } = fakeDb();
    const record = createBroadcastMessageRecorder(db, 'acc', 'promo', template);
    await record({ phone: '+52 1 555 550 9414', waMessageId: 'wamid.Y' });
    expect(findExistingContact).toHaveBeenCalled();
    expect(findOrCreateConversationRow).toHaveBeenCalledWith(db, 'acc', 'c-1', 'owner-1');
    expect(resolveConversationByPhone).not.toHaveBeenCalled();
  });

  it('creates the contact + conversation when the phone is unknown', async () => {
    findExistingContact.mockResolvedValue(null);
    const { db, inserts } = fakeDb();
    const record = createBroadcastMessageRecorder(db, 'acc', 'promo', template);
    await record({ phone: '5215555509414', waMessageId: 'wamid.Z' });
    expect(resolveConversationByPhone).toHaveBeenCalled();
    expect(inserts[0].conversation_id).toBe('conv-new');
  });

  it('never throws when saving fails — only logs', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db, updates } = fakeDb({ insertError: 'boom' });
    const record = createBroadcastMessageRecorder(db, 'acc', 'promo', template);
    await expect(
      record({ contactId: 'c-1', phone: '5215555509414', waMessageId: 'wamid.E' })
    ).resolves.toBeUndefined();
    expect(updates).toHaveLength(0);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
