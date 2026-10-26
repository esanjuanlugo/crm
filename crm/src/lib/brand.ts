// Single source of truth for the application's brand identity.
// Internal identifiers (API key prefix, webhook headers, storage keys)
// intentionally keep their original values so existing integrations
// and saved sessions keep working.
export const BRAND = {
  name: "Velvet Suit",
  tagline: "CRM para WhatsApp",
  fallbackAccountName: "nuestra cuenta de Velvet Suit",
} as const;
