import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/reset-password";

  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
debugger;
  // URL pública de producción
  const origin = "https://emiwheels.com";

  // Si Supabase devuelve un error
  if (error) {
    const message =
      errorDescription || "El enlace ha expirado o es inválido";

    return NextResponse.redirect(
      `${origin}/forgot-password?error=${encodeURIComponent(message)}`
    );
  }

  // Intercambiar el código por la sesión de Supabase
  if (code) {
    const supabase = await createClient();

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/forgot-password?error=${encodeURIComponent(
        "No se pudo verificar el enlace"
      )}`
    );
  }

  // No llegó ningún código
  return NextResponse.redirect(
    `${origin}/forgot-password?error=${encodeURIComponent(
      "No se recibió un código de recuperación"
    )}`
  );
}