/**
 * Fuente única de verdad para el catálogo de temas de color.
 *
 * Las variables CSS viven en `src/app/globals.css` dentro de bloques
 * `html[data-theme="..."]`. Ese archivo es donde se definen los tokens
 * de cada tema. Este módulo solo contiene los metadatos que necesita la UI
 * (selector de apariencia, script de arranque sin parpadeo, etc.).
 *
 * Para añadir un tema nuevo hay que hacer dos cambios:
 *   1. Añadir el bloque `html[data-theme="<id>"]` correspondiente en
 *      globals.css con todos los tokens de un tema existente.
 *   2. Añadir una entrada aquí. El orden determina cómo aparecen
 *      los temas en el selector.
 */

export const THEME_IDS = [
  "violet",
  "emerald",
  "cobalt",
  "amber",
  "rose",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "violet";

export const STORAGE_KEY = "wacrm.theme";

/**
 * MODE — the light/dark dimension, orthogonal to the accent theme.
 *
 * The CSS variables live in `src/app/globals.css` under
 * `html[data-mode="..."]` blocks (neutral surfaces only). Applied
 * at runtime via `document.documentElement.dataset.mode`. Dark is
 * the historical default and stays the app's identity; light is the
 * opt-in eye-strain-friendly alternative.
 *
 * Persisted under its own localStorage key so it composes freely
 * with the accent choice (you can run Violet-light or Violet-dark).
 */
export const MODES = ["light", "dark"] as const;

export type Mode = (typeof MODES)[number];

export const DEFAULT_MODE: Mode = "dark";

export const MODE_STORAGE_KEY = "wacrm.mode";

export function isMode(value: unknown): value is Mode {
  return (
    typeof value === "string" && (MODES as ReadonlyArray<string>).includes(value)
  );
}

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  /**
   * Static swatch color for the picker chip. Hard-coded so the boot
   * script / picker cards don't need a getComputedStyle round trip
   * before the page settles. Must mirror `--primary` of the same
   * theme in globals.css.
   */
  swatch: string;
}

export const THEMES: ReadonlyArray<ThemeMeta> = [
  {
    id: 'violet',
    name: 'Violeta',
    tagline: 'El tema predeterminado: seguro, moderno y con un toque de personalidad.',
    swatch: 'oklch(0.526 0.247 293)',
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    tagline: 'Fresco y equilibrado, ideal para equipos y flujos de trabajo colaborativos.',
    swatch: 'oklch(0.62 0.16 162)',
  },
  {
    id: 'cobalt',
    name: 'Cobalto',
    tagline: 'Limpio y profesional, pensado para una experiencia SaaS clara y tranquila.',
    swatch: 'oklch(0.585 0.2 254)',
  },
  {
    id: 'amber',
    name: 'Ámbar',
    tagline: 'Cálido y cercano, perfecto para equipos pequeños y negocios en crecimiento.',
    swatch: 'oklch(0.745 0.16 65)',
  },
  {
    id: 'rose',
    name: 'Rosa',
    tagline: 'Expresivo y moderno, para una interfaz con más personalidad.',
    swatch: 'oklch(0.645 0.22 16)',
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEME_IDS as ReadonlyArray<string>).includes(value)
  );
}
