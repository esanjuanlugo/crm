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
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Chatwise login — served at /login.
//
// Same auth logic as /login (Supabase password sign-in, invite token,
// full-page redirect so the middleware sees the fresh cookies), with the
// Chatwise identity: midnight brand panel + light form panel.
// ---------------------------------------------------------------------------

const COPY = {
  es: {
    tagline: "CRM con IA para tus chats",
    headline: "Cada chat cuenta. Atiéndelos con ayuda de la IA.",
    sub: "Responde, da seguimiento y vende desde un solo lugar.",
    f1: "Bandeja compartida",
    f2: "Embudos de ventas",
    f3: "Automatizaciones",
    f4: "Asistente de IA",
    chatIn: "Hola, ¿tienen disponible el plan Pro?",
    chatOut: "¡Claro! Te envío los detalles ahora mismo.",
    show: "Mostrar contraseña",
    hide: "Ocultar contraseña",
  },
  en: {
    tagline: "AI-powered CRM for your chats",
    headline: "Every chat counts. Handle them with AI by your side.",
    sub: "Reply, follow up and sell from one place.",
    f1: "Shared inbox",
    f2: "Sales pipelines",
    f3: "Automations",
    f4: "AI assistant",
    chatIn: "Hi, is the Pro plan available?",
    chatOut: "Of course! Sending you the details now.",
    show: "Show password",
    hide: "Hide password",
  },
} as const;

function ChatwiseMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Chatwise"
      className={className}
    >
      <rect width="64" height="64" rx="15" fill="#6D4AFF" />
      <g transform="translate(8 8)">
        <path
          d="M12 4h24a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H24l-9 8v-8h-3a8 8 0 0 1-8-8V12a8 8 0 0 1 8-8z"
          fill="#FFFFFF"
        />
        <path
          d="M24 10C24.8 15 26.2 17.2 33 19C26.2 20.8 24.8 23 24 28C23.2 23 21.8 20.8 15 19C21.8 17.2 23.2 15 24 10z"
          fill="#6D4AFF"
        />
      </g>
    </svg>
  );
}

export default function ChatwiseLoginPage() {
  return (
    <Suspense fallback={null}>
      <ChatwiseLoginInner />
    </Suspense>
  );
}

function ChatwiseLoginInner() {
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

    // Full-page navigation so the middleware sees the fresh auth cookies.
    window.location.href = inviteToken
      ? `/join/${encodeURIComponent(inviteToken)}`
      : "/dashboard";
  };

  const features = [
    { icon: CheckCheck, label: c.f1 },
    { icon: GitBranch, label: c.f2 },
    { icon: Zap, label: c.f3 },
    { icon: Bot, label: c.f4 },
  ];

  const inputClass =
    "h-12 w-full rounded-xl border border-[#E6DEF7] bg-white pl-11 pr-4 text-sm text-[#1E1433] outline-none transition placeholder:text-[#8B7FA8] focus:border-[#6D4AFF] focus:ring-4 focus:ring-[#6D4AFF]/15";

  return (
    <div className="grid min-h-screen bg-[#FAF7FF] text-[#1E1433] lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Brand panel ---------- */}
      <aside className="relative hidden overflow-hidden bg-[#1E1433] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#6D4AFF]/40 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-[#FF8FA8]/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <ChatwiseMark className="h-11 w-11" />
          <div className="leading-tight">
            <p className="text-xl font-bold tracking-tight text-white">
              Chat<span className="text-[#FF8FA8]">wise</span>
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#D9CFF5]">
              {c.tagline}
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-white">
            {c.headline}
          </h2>
          <p className="mt-4 text-base text-[#D9CFF5]">{c.sub}</p>

          <ul className="mt-8 grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6D4AFF] text-white">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex max-w-sm flex-col gap-2" aria-hidden="true">
          <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-2.5 text-sm text-white">
            {c.chatIn}
          </div>
          <div className="ml-auto flex w-fit max-w-[85%] items-center gap-2 rounded-2xl rounded-br-md bg-[#6D4AFF] px-4 py-2.5 text-sm text-white">
            {c.chatOut}
            <Bot className="h-4 w-4 shrink-0 opacity-80" />
          </div>
        </div>
      </aside>

      {/* ---------- Form panel ---------- */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-[#E6DEF7] bg-white p-8 shadow-xl shadow-[#6D4AFF]/10 sm:p-10">
          {/* Brand on small screens */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <ChatwiseMark className="h-14 w-14" />
            <p className="mt-4 text-2xl font-bold tracking-tight">
              Chat<span className="text-[#6D4AFF]">wise</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#5B4F78]">
              {c.tagline}
            </p>
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {inviteToken ? t("titleAccept") : t("titleWelcome")}
            </h1>
            <p className="mt-2 text-sm text-[#5B4F78]">
              {inviteToken ? t("descAccept") : t("descWelcome")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-[#5B4F78]">
                {t("emailLabel")}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B7FA8]" />
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
                <label htmlFor="password" className="text-sm font-medium text-[#5B4F78]">
                  {t("passwordLabel")}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-[#6D4AFF] transition hover:text-[#5A38F0]"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B7FA8]" />
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
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#5B4F78] transition hover:bg-[#FAF7FF] hover:text-[#1E1433]"
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
              className="group mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6D4AFF] text-sm font-semibold text-white shadow-lg shadow-[#6D4AFF]/25 transition hover:bg-[#5A38F0] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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

          <p className="mt-8 border-t border-[#E6DEF7] pt-6 text-center text-sm text-[#5B4F78]">
            {t("noAccount")}{" "}
            <Link
              href={
                inviteToken
                  ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                  : "/signup"
              }
              className="font-semibold text-[#6D4AFF] transition hover:text-[#5A38F0]"
            >
              {t("createAccount")}
            </Link>
          </p>

        </div>
      </main>
    </div>
  );
}