import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Dominio desde el que se visita la app (Caddy lo manda en estas cabeceras).
function getOrigin(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

// Solo rutas internas ("/dashboard"), nunca URLs externas.
function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getOrigin(request);

  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Sin "next" es recuperar contraseña; con "next=/dashboard" es confirmar registro.
  const isRecovery = !next || next === "/reset-password";
  const destination = next ?? "/reset-password";

  const failTo = (message: string) =>
    NextResponse.redirect(
      `${origin}${isRecovery ? "/forgot-password" : "/login"}?error=${encodeURIComponent(message)}`
    );

  if (error) {
    return failTo(errorDescription || "El enlace ha expirado o es inválido");
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${destination}`);
    }

    return failTo(
      isRecovery
        ? "No se pudo verificar el enlace"
        : "No se pudo iniciar sesión automáticamente. Si ya confirmaste tu correo, inicia sesión."
    );
  }

  return failTo("No se recibió un código de verificación");
}