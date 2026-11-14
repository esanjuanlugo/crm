import {
  FileText,
  KeyRound,
  LayoutGrid,
  PlugZap,
  Shield,
  Tags,
  User,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

/**
 * Settings information architecture.
 *
 * Merged sections:
 *   messages = templates + quick replies
 *   crm      = fields & tags + deals & currency
 *
 * profile and security are their own screens, but they do not appear in
 * the Settings rail: they live in the account menus (header and sidebar
 * user menu). The URL query param stays "?tab=". Old values (account,
 * appearance, templates, quick-replies, fields, tags, custom-fields,
 * deals) still work: they resolve onto the section that now contains
 * them and scroll to the block they used to be (see LEGACY_TABS).
 */
export const SETTINGS_SECTIONS = [
  'overview',
  'profile',
  'security',
  'whatsapp',
  'messages',
  'crm',
  'members',
  'api',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const DEFAULT_SECTION: SettingsSection = 'overview';

/** Sections hidden from the rail and not reachable via "?tab=". */
export const HIDDEN_SECTIONS: readonly SettingsSection[] = ['api'];

/** Reachable via "?tab=" but not listed in the Settings rail (account menu only). */
export const MENU_ONLY_SECTIONS: readonly SettingsSection[] = ['profile', 'security'];

/** Everything the rail should not list. */
export const RAIL_HIDDEN_SECTIONS: readonly SettingsSection[] = [
  ...HIDDEN_SECTIONS,
  ...MENU_ONLY_SECTIONS,
];

/** Rail grouping. */
export interface SectionMeta {
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
  group: 'top' | 'account' | 'workspace';
}

export const SECTION_META: Record<SettingsSection, SectionMeta> = {
  overview: { id: 'overview', label: 'Overview', icon: LayoutGrid, group: 'top' },
  profile: { id: 'profile', label: 'Your profile', icon: User, group: 'account' },
  security: { id: 'security', label: 'Login & security', icon: Shield, group: 'account' },
  whatsapp: { id: 'whatsapp', label: 'WhatsApp', icon: PlugZap, group: 'workspace' },
  messages: { id: 'messages', label: 'Messages', icon: FileText, group: 'workspace' },
  crm: { id: 'crm', label: 'CRM data', icon: Tags, group: 'workspace' },
  members: { id: 'members', label: 'Team members', icon: UsersRound, group: 'workspace' },
  api: { id: 'api', label: 'API keys', icon: KeyRound, group: 'workspace' },
};

export const RAIL_GROUPS: { label: string | null; group: SectionMeta['group'] }[] = [
  { label: null, group: 'top' },
  { label: 'Account', group: 'account' },
  { label: 'Workspace', group: 'workspace' },
];

/**
 * Old "?tab=" values -> current section + the block to scroll to. A null
 * anchor means "first block of the section" (no scroll needed).
 */
const LEGACY_TABS: Record<string, { section: SettingsSection; anchor: string | null }> = {
  account: { section: 'profile', anchor: null },
  appearance: { section: 'profile', anchor: null },
  templates: { section: 'messages', anchor: null },
  'quick-replies': { section: 'messages', anchor: 'quick-replies' },
  fields: { section: 'crm', anchor: null },
  tags: { section: 'crm', anchor: null },
  'custom-fields': { section: 'crm', anchor: null },
  deals: { section: 'crm', anchor: 'deals' },
};

function legacyOf(raw: string | null) {
  return raw && Object.prototype.hasOwnProperty.call(LEGACY_TABS, raw)
    ? LEGACY_TABS[raw]
    : null;
}

function isSection(value: string | null): value is SettingsSection {
  return !!value && (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

/**
 * Resolve a raw "?tab=" value to a section. Legacy tabs collapse onto the
 * section that now contains them. Anything unknown falls back to the
 * Overview landing.
 */
export function resolveSection(raw: string | null): SettingsSection {
  const legacy = legacyOf(raw);
  if (legacy) return legacy.section;
  if (isSection(raw) && !HIDDEN_SECTIONS.includes(raw)) return raw;
  return DEFAULT_SECTION;
}

/** Block id (without the "settings-" prefix) to scroll to for a legacy tab. */
export function resolveAnchor(raw: string | null): string | null {
  return legacyOf(raw)?.anchor ?? null;
}
