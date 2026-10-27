// Single source of truth for the application's brand identity.
// Internal identifiers (API key prefix, webhook headers, storage keys)
// intentionally keep their original values so existing integrations
// and saved sessions keep working.
export const BRAND = {
  name: "Chatwise",
  tagline: "CRM con IA para tus chats",
  fallbackAccountName: "nuestra cuenta de Chatwise",
} as const;
