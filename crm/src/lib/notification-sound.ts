// Sonido de notificacion generado con Web Audio (no necesita archivos).
// Los navegadores bloquean el audio hasta que el usuario interactua con la
// pagina (clic o tecla), asi que el primer clic "desbloquea" el sonido.

const STORAGE_KEY = "chatwise:notification-sound";

let ctx: AudioContext | null = null;
let unlockBound = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Preferencia del usuario (se guarda en este navegador). Activado por defecto. */
export function isSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Almacenamiento no disponible: se ignora.
  }
}

/** Desbloquea el audio con el primer clic o tecla del usuario. */
export function unlockNotificationSound(): void {
  if (typeof window === "undefined" || unlockBound) return;
  unlockBound = true;
  const unlock = () => {
    const c = getContext();
    if (c && c.state === "suspended") void c.resume().catch(() => {});
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

function chime(c: AudioContext) {
  const now = c.currentTime;
  const tone = (freq: number, start: number, duration: number) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  };
  // Dos notas ascendentes: La5 y Re6.
  tone(880, now, 0.28);
  tone(1318.5, now + 0.13, 0.45);
}

/** Reproduce el aviso. Si el navegador aun lo bloquea, no hace nada. */
export function playNotificationSound(): void {
  const c = getContext();
  if (!c) return;
  if (c.state === "running") {
    chime(c);
    return;
  }
  const requestedAt = Date.now();
  c.resume()
    .then(() => {
      // Evita un "ding" atrasado si el audio se desbloquea mucho despues.
      if (c.state === "running" && Date.now() - requestedAt < 1500) chime(c);
    })
    .catch(() => {});
}
