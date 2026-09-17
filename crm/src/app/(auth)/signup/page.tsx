"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare, CheckCircle, UsersRound } from "lucide-react";

// `useSearchParams` hace que el componente salga del prerenderizado estático
// a menos que esté envuelto en Suspense — mismo patrón que /login.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();

  // Cuando el usuario llega aquí desde `/ join / <token>`, conservamos
  // el token de invitación en la URL para que sobreviva al proceso
  // de registro → verificación por correo → redirección.
  // `emailRedirectTo` apunta nuevamente a /join/<token> para que,
  // después de verificar el correo, el usuario pueda aceptar la invitación
  // en lugar de ser enviado al /dashboard.
      const inviteToken = searchParams.get("invite");

      const [fullName, setFullName] = useState("");
      const [email, setEmail] = useState("");
      const [password, setPassword] = useState("");
      const [confirmPassword, setConfirmPassword] = useState("");
      const [error, setError] = useState<string | null>(null);
      const [loading, setLoading] = useState(false);
      const [success, setSuccess] = useState(false);
      const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
      setError(null);

      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden");
      return;
    }

      if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

      setLoading(true);

      // Si tenemos un token de invitación, indicamos a Supabase que
      // el correo de verificación redirija a la página de invitación
      // para que el usuario pueda aceptarla después de verificar su correo.
      // Sin un token, Supabase utilizará su redirección predeterminada.
      const emailRedirectTo = inviteToken
      ? `${window.location.origin}/join/${encodeURIComponent(inviteToken)}`
      : undefined;

      const {error} = await supabase.auth.signUp({
        email,
        password,
        options: {
        data: {
        full_name: fullName,
        },
      ...(emailRedirectTo ? {emailRedirectTo} : { }),
      },
    });

      if (error) {
        setError(error.message);
      setLoading(false);
      return;
    }

      setSuccess(true);
      setLoading(false);
  };

      if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">
              Revisa tu correo electrónico
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Hemos enviado un enlace de confirmación a{" "}
              <span className="text-foreground">{email}</span>. Revisa tu
              bandeja de entrada y haz clic en el enlace para verificar tu
              cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
            >
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Volver a iniciar sesión
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      );
  }

      return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              {inviteToken ? (
                <UsersRound className="h-6 w-6 text-primary" />
              ) : (
                <MessageSquare className="h-6 w-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-xl text-foreground">
              {inviteToken ? "Crear cuenta y unirse" : "Crear cuenta"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {inviteToken
                ? "Verifica tu correo electrónico y luego acepta la invitación para unirte a tu equipo."
                : "Comienza a utilizar CRM Template para WhatsApp"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="fullName"
                  className="text-muted-foreground"
                >
                  Nombre completo
                </Label>

                <Input
                  id="fullName"
                  type="text"
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="email"
                  className="text-muted-foreground"
                >
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="password"
                  className="text-muted-foreground"
                >
                  Contraseña
                </Label>

                <Input
                  id="password"
                  type="password"
                  placeholder="Al menos 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-muted-foreground"
                >
                  Confirmar contraseña
                </Label>

                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-2 h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{" "}
              <Link
                href={
                  inviteToken
                    ? `/login?invite=${encodeURIComponent(inviteToken)}`
                    : "/login"
                }
                className="text-primary hover:text-primary/80"
              >
                Iniciar sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
      );
}
