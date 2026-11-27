"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Suscribe a una media query y se actualiza al cambiar el tamano o la
 * orientacion. En el servidor (y en la hidratacion) devuelve `false`.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Como se arrastran las tarjetas segun el dispositivo:
 * - "none":    celular (< 768px), sin arrastre.
 * - "touch":   tablet tactil (>= 768px y pointer: coarse), mantener presionado.
 * - "pointer": escritorio con mouse.
 */
export type DragMode = "none" | "touch" | "pointer";

export function useDragMode(): DragMode {
  const wide = useMediaQuery("(min-width: 768px)");
  const coarse = useMediaQuery("(pointer: coarse)");
  if (!wide) return "none";
  return coarse ? "touch" : "pointer";
}
