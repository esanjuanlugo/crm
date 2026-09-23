"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  KeyRound,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
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
  const t = useTranslations("ResetPassword");

  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        setError(t("sessionExpired"));
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setPassword("");
      setConfirm("");
      setSuccess(true);

      toast.success(t("successToast"));

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError(t("error"));
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
              {t("successTitle")}
            </CardTitle>

            <CardDescription className="text-muted-foreground">
              {t("successDescription")}
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
            {t("title")}
          </CardTitle>

          <CardDescription className="text-muted-foreground">
            {t("description")}
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
                {t("password")}
              </Label>

              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD}
                  disabled={saving}
                  required
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={saving}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label={
                    showPassword
                      ? t("hidePassword")
                      : t("showPassword")
                  }
                  title={
                    showPassword
                      ? t("hidePassword")
                      : t("showPassword")
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirm-password"
                className="text-foreground"
              >
                {t("confirmPassword")}
              </Label>

              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD}
                  disabled={saving}
                  required
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  disabled={saving}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label={
                    showConfirmPassword
                      ? t("hideConfirmPassword")
                      : t("showConfirmPassword")
                  }
                  title={
                    showConfirmPassword
                      ? t("hideConfirmPassword")
                      : t("showConfirmPassword")
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving || !password || !confirm}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("updating")}
                </>
              ) : (
                t("updatePassword")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}