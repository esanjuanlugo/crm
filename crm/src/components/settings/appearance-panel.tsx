"use client";

import type { ReactNode } from "react";
import { Check, Moon, Palette, Sun, SunMoon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTheme } from "@/hooks/use-theme";
import { MODES, THEMES, type Mode } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { SettingsPanelHead } from "./settings-panel-head";

/**
 * Appearance panel: light/dark mode, accent color and a live preview.
 *
 * Each choice applies and persists immediately (localStorage, per
 * device) so there is no save button. The mode tiles draw a tiny app
 * mockup with fixed colors, so each one shows how that mode looks no
 * matter which one is active; the accent is always the live one.
 */
export function AppearancePanel() {
  const { theme, setTheme, mode, setMode } = useTheme();
  const t = useTranslations("Settings.appearance");
  const current = THEMES.find((x) => x.id === theme) ?? THEMES[0];

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title={t("title")}
        description={t("description")}
      />

      <div className="space-y-4">
        <Block icon={<SunMoon className="size-4" />} title={t("mode")}>
          <div
            role="radiogroup"
            aria-label="Color mode"
            className="grid max-w-xl grid-cols-2 gap-3"
          >
            {MODES.map((m) => (
              <ModeTile
                key={m}
                mode={m}
                label={t(m === "light" ? "modeLight" : "modeDark")}
                ariaLabel={t("useMode", { mode: m })}
                isActive={m === mode}
                onPick={() => setMode(m)}
              />
            ))}
          </div>
        </Block>

        <Block icon={<Palette className="size-4" />} title={t("accentColor")}>
          <div
            role="radiogroup"
            aria-label={t("accentColor")}
            className="flex flex-wrap gap-x-5 gap-y-4"
          >
            {THEMES.map((th) => {
              const active = th.id === theme;
              return (
                <button
                  key={th.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={t("useTheme", { name: th.name })}
                  title={th.tagline}
                  onClick={() => setTheme(th.id)}
                  className="group flex w-16 flex-col items-center gap-2 rounded-lg outline-none"
                >
                  <span
                    className="flex size-11 items-center justify-center rounded-full transition-transform group-hover:scale-105 group-focus-visible:scale-105"
                    style={{
                      background: th.swatch,
                      boxShadow: active
                        ? "0 0 0 2px var(--card), 0 0 0 4px " + th.swatch
                        : "inset 0 0 0 1px oklch(1 0 0 / 0.15)",
                    }}
                  >
                    {active && (
                      <Check className="size-4 text-white" strokeWidth={3} />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      active
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {th.name}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{current.name}</span>
            {" · "}
            {current.tagline}
          </p>
        </Block>

        <Block title={t("preview")}>
          <Preview name={current.name} activeLabel={t("active")} />
        </Block>
      </div>
    </section>
  );
}

function Block({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        {title}
      </h3>
      {children}
    </div>
  );
}

function ModeTile({
  mode,
  label,
  ariaLabel,
  isActive,
  onPick,
}: {
  mode: Mode;
  label: string;
  ariaLabel: string;
  isActive: boolean;
  onPick: () => void;
}) {
  const Icon = mode === "light" ? Sun : Moon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      aria-label={ariaLabel}
      onClick={onPick}
      className={cn(
        "rounded-xl border p-2 text-left transition-colors",
        isActive
          ? "border-primary bg-primary-soft"
          : "border-border hover:bg-muted/40",
      )}
    >
      <ModeMockup mode={mode} />
      <span className="mt-2 flex items-center gap-2 px-1 pb-0.5 text-sm font-medium text-foreground">
        <Icon className="size-4 text-muted-foreground" />
        <span className="flex-1">{label}</span>
        {isActive && (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
      </span>
    </button>
  );
}

/** Mini app screenshot: fixed neutrals per mode, live accent color. */
function ModeMockup({ mode }: { mode: Mode }) {
  const c =
    mode === "light"
      ? { bg: "#f4f4f7", side: "#ffffff", card: "#ffffff", line: "#d9d9e1", edge: "#e4e4ea" }
      : { bg: "#0b0b10", side: "#14141b", card: "#171720", line: "#2c2c39", edge: "#23232e" };
  return (
    <div
      aria-hidden
      className="flex h-24 w-full overflow-hidden rounded-lg"
      style={{ background: c.bg, border: "1px solid " + c.edge }}
    >
      <div
        className="flex w-1/4 flex-col gap-1.5 p-2"
        style={{ background: c.side, borderRight: "1px solid " + c.edge }}
      >
        <span className="h-1.5 w-4/5 rounded-full bg-primary" />
        <span className="h-1.5 w-full rounded-full" style={{ background: c.line }} />
        <span className="h-1.5 w-3/4 rounded-full" style={{ background: c.line }} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <span className="h-2 w-1/3 rounded-full" style={{ background: c.line }} />
        <div className="flex flex-1 gap-2">
          <span
            className="flex-1 rounded-md"
            style={{ background: c.card, border: "1px solid " + c.edge }}
          />
          <span
            className="flex-1 rounded-md"
            style={{ background: c.card, border: "1px solid " + c.edge }}
          />
        </div>
        <span className="h-2 w-1/4 rounded-full bg-primary" />
      </div>
    </div>
  );
}

/** Small live sample built with the real theme tokens. */
function Preview({ name, activeLabel }: { name: string; activeLabel: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
          {name.charAt(0)}
        </span>
        <div className="flex-1 space-y-1.5">
          <span className="block h-2 w-1/3 rounded-full bg-foreground/80" />
          <span className="block h-2 w-1/2 rounded-full bg-muted-foreground/40" />
        </div>
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-primary">
          {activeLabel}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <span className="flex max-w-[70%] flex-col gap-1.5 self-start rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5">
          <span className="h-1.5 w-24 rounded-full bg-muted-foreground/40" />
          <span className="h-1.5 w-16 rounded-full bg-muted-foreground/40" />
        </span>
        <span className="max-w-[70%] self-end rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          {name}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          {name}
        </span>
        <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
          {name}
        </span>
        <span className="ml-2 h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <span className="block h-full w-2/3 rounded-full bg-primary" />
        </span>
      </div>
    </div>
  );
}
