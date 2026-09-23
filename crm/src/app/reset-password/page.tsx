"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, KeyRound, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

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

const MIN_PASSWORD = 8;

export default function ResetPasswordPage() {
  const t = useTranslations("Settings.profile");
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);

    if (password.length < MIN_PASSWORD) {
      setError(
        t("passwordTooShort", {
          min: MIN_PASSWORD,
        })
      );
      return;
    }

    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("El enlace de recuperación no es válido o ha expirado.");
        return;
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setPassword("");
      setConfirm("");
      setSuccess(true);

      toast.success("Contraseña actualizada correctamente.");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la contraseña.";

      setError(message);
    } finally {
      setSaving(false);
    }
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
              Contraseña actualizada
            </CardTitle>

            <CardDescription className="text-muted-foreground">
              Tu contraseña se actualizó correctamente. Serás redirigido al
              inicio de sesión.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>

          <CardTitle className="text-xl text-foreground">
            Restablecer contraseña
          </CardTitle>

          <CardDescription className="text-muted-foreground">
            Introduce tu nueva contraseña y confírmala para continuar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="new-password"
                className="text-foreground"
              >
                Nueva contraseña
              </Label>

              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD}
                disabled={saving}
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirm-password"
                className="text-foreground"
              >
                Confirmar contraseña
              </Label>

              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD}
                disabled={saving}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={saving || !password || !confirm}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar contraseña"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}