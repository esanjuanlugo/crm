"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Bell,
  Bot,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Radio,
  Search,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Paleta de comandos (Ctrl+K / Cmd+K): salta a cualquier seccion.
// Sin dependencias nuevas; las etiquetas reutilizan las del sidebar.

const ITEMS = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/inbox", labelKey: "inbox", icon: MessageSquare },
  { href: "/notifications", labelKey: "notifications", icon: Bell },
  { href: "/contacts", labelKey: "contacts", icon: Users },
  { href: "/pipelines", labelKey: "pipelines", icon: GitBranch },
  { href: "/broadcasts", labelKey: "broadcasts", icon: Radio },
  { href: "/automations", labelKey: "automations", icon: Zap },
  { href: "/agents", labelKey: "aiAgents", icon: Bot },
  { href: "/settings", labelKey: "settings", icon: Settings },
];

const COPY = {
  es: {
    title: "Paleta de comandos",
    placeholder: "Ir a...",
    empty: "Sin resultados",
    hint: "↑↓ moverte · Enter abrir · Esc cerrar",
  },
  en: {
    title: "Command palette",
    placeholder: "Go to...",
    empty: "No results",
    hint: "↑↓ move · Enter open · Esc close",
  },
} as const;

export function CommandPalette() {
  const router = useRouter();
  const t = useTranslations("Sidebar");
  const locale = useLocale();
  const c = locale === "es" ? COPY.es : COPY.en;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.map((i) => ({ ...i, label: t(i.labelKey) })).filter(
      (i) => !q || i.label.toLowerCase().includes(q),
    );
  }, [query, t]);

  const reset = () => {
    setQuery("");
    setActive(0);
  };

  const go = (href: string) => {
    setOpen(false);
    reset();
    router.push(href);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) go(r.href);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">{c.title}</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder={c.placeholder}
            aria-label={c.placeholder}
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Esc
          </kbd>
        </div>
        <ul role="listbox" className="max-h-72 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {c.empty}
            </li>
          )}
          {results.map(({ href, label, icon: Icon }, idx) => (
            <li key={href} role="option" aria-selected={idx === active}>
              <button
                type="button"
                onClick={() => go(href)}
                onMouseEnter={() => setActive(idx)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors",
                  idx === active ? "bg-primary-soft" : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md",
                    idx === active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {label}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {c.hint}
        </div>
      </DialogContent>
    </Dialog>
  );
}