import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Si el enlace expiró o es inválido, redirige limpiamente
  if (error) {
    return NextResponse.redirect(
      `\({origin}/forgot-password?error=\){encodeURIComponent(
        errorDescription || "El enlace ha expirado o es inválido"
      )}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return NextResponse.redirect(`\({origin}\){next}`);
    }
  }

  // Si ocurrió algún otro problema, se devuelve a forgot-password
  return NextResponse.redirect(
    `${origin}/forgot-password?error=No+se+pudo+verificar+el+enlace`
  );
}