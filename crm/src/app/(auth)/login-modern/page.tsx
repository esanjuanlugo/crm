"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Bot,
  CheckCheck,
  Eye,
  EyeOff,
  GitBranch,
  Loader2,
  Lock,
  Mail,
  Radio,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Modern login — second option next to the classic card at /login.
//
// Same auth logic as /login (Supabase password sign-in, invite token,
// full-page redirect) with a split-screen layout: brand panel on the
// left (hidden on small screens), form on the right.
//
// Change the brand here. Colors follow the active theme (`primary`).
// ---------------------------------------------------------------------------
const BRAND_FIRST = "Velvet";
const BRAND_SECOND = "Suit";

const COPY = {
  es: {
    tagline: "CRM para WhatsApp",
    headline: "Todas tus conversaciones de WhatsApp, en un solo lugar.",
    sub: "Atiende, automatiza y vende sin salir de tu bandeja.",
    f1: "Bandeja de entrada compartida",
    f2: "Embudos de ventas",
    f3: "Automatizaciones y agentes de IA",
    f4: "Envíos masivos",
    chatIn: "Hola, ¿tienen disponible el plan Pro?",
    chatOut: "¡Claro! Te envío los detalles ahora mismo.",
    classic: "Usar el diseño clásico",
    show: "Mostrar contraseña",
    hide: "Ocultar contraseña",
  },
  en: {
    tagline: "CRM for WhatsApp",
    headline: "All your WhatsApp conversations, in one place.",
    sub: "Support, automate and sell without leaving your inbox.",
    f1: "Shared team inbox",
    f2: "Sales pipelines",
    f3: "Automations and AI agents",
    f4: "Broadcasts",
    chatIn: "Hi, is the Pro plan available?",
    chatOut: "Of course! Sending you the details now.",
    classic: "Use the classic design",
    show: "Show password",
    hide: "Hide password",
  },
} as const;

export default function ModernLoginPage() {
  return (
    <Suspense fallback={null}>
      <ModernLoginInner />
    </Suspense>
  );
}

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" aria-hidden="true">
        <path d="M3 4h18l-9 17L3 4z" fill="white" fillOpacity="0.95" />
        <path d="M8.5 4 12 10l3.5-6" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-primary" />
      </svg>
    </div>
  );
}

function ModernLoginInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const t = useTranslations("LoginPage");
  const locale = useLocale();
  const c = locale === "es" ? COPY.es : COPY.en;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Full-page navigation so the middleware sees the fresh auth
    // cookies (same reasoning as the classic /login page).
    const destination = inviteToken
      ? `/join/${encodeURIComponent(inviteToken)}`
      : "/dashboard";
    window.location.href = destination;
  };

  const features = [
    { icon: CheckCheck, label: c.f1 },
    { icon: GitBranch, label: c.f2 },
    { icon: Zap, label: c.f3 },
    { icon: Radio, label: c.f4 },
  ];

  const inputClass =
    "h-12 w-full rounded-xl border border-border bg-muted/60 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-muted focus:ring-4 focus:ring-primary/15";

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Brand panel ---------- */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-background" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <BrandMark className="h-11 w-11" />
          <div className="leading-tight">
            <p className="text-lg font-semibold text-foreground">
              {BRAND_FIRST} <span className="text-primary">{BRAND_SECOND}</span>
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {c.tagline}
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-foreground">
            {c.headline}
          </h2>
          <p className="mt-4 text-base text-muted-foreground">{c.sub}</p>

          <ul className="mt-8 grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-sm text-foreground backdrop-blur"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Decorative chat preview */}
        <div className="relative flex max-w-sm flex-col gap-2" aria-hidden="true">
          <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-md border border-border/60 bg-card/60 px-4 py-2.5 text-sm text-foreground backdrop-blur">
            {c.chatIn}
          </div>
          <div className="ml-auto flex w-fit max-w-[85%] items-center gap-2 rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-lg shadow-primary/20">
            {c.chatOut}
            <Bot className="h-4 w-4 shrink-0 opacity-80" />
          </div>
        </div>
      </aside>

      {/* ---------- Form panel ---------- */}
      <main className="relative flex items-center justify-center px-6 py-12">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent lg:hidden" />

        <div className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card/50 p-8 shadow-2xl shadow-black/20 backdrop-blur sm:p-10">
          {/* Brand on small screens */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <BrandMark className="h-14 w-14" />
            <p className="mt-4 text-2xl font-semibold text-foreground">
              {BRAND_FIRST} <span className="text-primary">{BRAND_SECOND}</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {c.tagline}
            </p>
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {inviteToken ? t("titleAccept") : t("titleWelcome")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {inviteToken ? t("descAccept") : t("descWelcome")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-muted-foreground"
              >
                {t("emailLabel")}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {t("passwordLabel")}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary transition hover:text-primary/80"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? c.hide : c.show}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("signingIn")}
                </>
              ) : (
                <>
                  {t("signIn")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href={
                inviteToken
                  ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                  : "/signup"
              }
              className="font-medium text-primary transition hover:text-primary/80"
            >
              {t("createAccount")}
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-muted-foreground/70">
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
              className="underline-offset-4 transition hover:text-foreground hover:underline"
            >
              {c.classic}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}