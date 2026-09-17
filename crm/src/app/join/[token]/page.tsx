'use client';

// ============================================================
// /join/[token] — página de destino para canjear una invitación.
//
// Cuatro estados de UI determinados por:
//   - el resultado de peek (datos de invitación validados por el servidor), y
//   - si el visitante está autenticado actualmente.
//
//   ┌──────────────────────┬───────────────┬─────────────────────────┐
//   │ peek                 │ auth          │ render                   │
//   ├──────────────────────┼───────────────┼─────────────────────────┤
//   │ loading              │ —             │ spinner                  │
//   │ ok:false (any reason)│ —             │ error amigable + registro │
//   │ ok:true              │ signed out    │ "Registrarse" + "Iniciar sesión" │
//   │ ok:true              │ signed in     │ botón "Aceptar" → redeem │
//   └──────────────────────┴───────────────┴─────────────────────────┘
//
// Deliberadamente NO canjeamos la invitación automáticamente al cargar
// la página: la persona invitada debe confirmar qué cuenta/rol está aceptando.
// El canje automático también podría entrar en conflicto con el flujo de
// registro al volver a esta página después de verificar el correo electrónico.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  MailX,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';

interface PeekOk {
  ok: true;
  account_name: string;
  role: 'admin' | 'agent' | 'viewer';
  expires_at: string;
}
interface PeekFail {
  ok: false;
  reason: 'not_found' | 'used' | 'expired' | 'server_error';
}
type PeekResult = PeekOk | PeekFail;

const ROLE_LABEL: Record<PeekOk['role'], string> = {
  admin: 'Administrador',
  agent: 'Agente',
  viewer: 'Visualizador',
};

const FAIL_COPY: Record<
  PeekFail['reason'],
  { title: string; body: string }
> = {
  not_found: {
    title: 'Invitación no encontrada',
    body: 'Este enlace no corresponde a una invitación válida. Comprueba la URL o pide a la persona que te invitó que te envíe una nueva.',
  },
  used: {
    title: 'Invitación ya utilizada',
    body: 'Esta invitación ya ha sido aceptada. Si no fuiste tú, pide al administrador de la cuenta que envíe un enlace nuevo.',
  },
  expired: {
    title: 'Invitación caducada',
    body: 'Esta invitación ha caducado. Pide al administrador de la cuenta que envíe una nueva; tardará solo unos segundos en generarla.',
  },
  server_error: {
    title: 'Algo salió mal',
    body: 'No pudimos verificar esta invitación en este momento. Intenta actualizar la página dentro de unos instantes.',
  },
};

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [peek, setPeek] = useState<PeekResult | null>(null);

  // Comprobación de autenticación local: el AuthProvider vive dentro
  // del grupo de rutas (dashboard), por lo que no llega a esta página.
  // Consultamos Supabase directamente, igual que hacen `/login` y `/signup`.
  const [authedUserId, setAuthedUserId] = useState<
    string | null | undefined
  >(
    undefined, // undefined = desconocido / cargando; null = sesión cerrada
  );
  const [accepting, setAccepting] = useState(false);

  // `redeem_invitation` devuelve 409 cuando la cuenta actual de quien
  // realiza la solicitud ya contiene datos de dominio o cuando ya es
  // miembro de una cuenta compartida.
  // Un toast temporal no era suficiente: el usuario no tenía un siguiente
  // paso claro. Mostramos un modal bloqueante que le indica cómo proceder.
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Extraído para que el botón "Intentar de nuevo" de la tarjeta
  // server_error pueda ejecutar la misma lógica sin volver a montar
  // el componente.
  const loadPeekAndAuth = useCallback(async () => {
    if (!token) return;
    setPeek(null);
    setAuthedUserId(undefined);
    try {
      const [peekRes, authRes] = await Promise.all([
        fetch(`/api/invitations/${encodeURIComponent(token)}/peek`, {
          cache: 'no-store',
        }),
        createClient().auth.getUser(),
      ]);
      const peekBody = (await peekRes.json()) as PeekResult;
      setPeek(peekBody);
      setAuthedUserId(authRes.data.user?.id ?? null);
    } catch (err) {
      console.error('[join] peek error:', err);
      setPeek({ ok: false, reason: 'server_error' });
      setAuthedUserId(null);
    }
  }, [token]);

  // Obtener el estado de la invitación y la autenticación al montar.
  // El endpoint peek tiene un límite de solicitudes por IP (30/min),
  // por lo que un montaje doble en el modo estricto de React 19 durante
  // el desarrollo no supone un problema. También usamos la bandera
  // `cancelled` para evitar llamadas a setState si el componente se
  // desmonta mientras la solicitud sigue en curso.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const [peekRes, authRes] = await Promise.all([
          fetch(`/api/invitations/${encodeURIComponent(token)}/peek`, {
            cache: 'no-store',
          }),
          createClient().auth.getUser(),
        ]);
        const peekBody = (await peekRes.json()) as PeekResult;
        if (cancelled) return;
        setPeek(peekBody);
        setAuthedUserId(authRes.data.user?.id ?? null);
      } catch (err) {
        console.error('[join] peek error:', err);
        if (cancelled) return;
        setPeek({ ok: false, reason: 'server_error' });
        setAuthedUserId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = useCallback(async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await fetch(
        `/api/invitations/${encodeURIComponent(token)}/redeem`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        // 409 = la persona ya tiene datos / pertenece a otra
        // cuenta compartida. El mensaje de error del RPC redeem
        // es suficientemente descriptivo para mostrarlo directamente;
        // abrimos un modal para ofrecer una acción clara (cerrar sesión
        // → usar otro correo electrónico), en lugar de un toast de 3 segundos.
        if (res.status === 409) {
          setConflictMessage(
            payload.error ||
            'Ya perteneces a otra cuenta. Inicia sesión con un correo electrónico diferente para unirte a esta.',
          );
        } else {
          toast.error(
            payload.error || 'No se pudo aceptar la invitación',
          );
        }
        setAccepting(false);
        return;
      }
      toast.success('Bienvenido al equipo');
      // Recarga completa (no router.push) para que AuthProvider vuelva
      // a obtener el perfil con el nuevo account_id y account_role.
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('[join] redeem error:', err);
      toast.error('No se pudo conectar con el servidor');
      setAccepting(false);
    }
  }, [token]);

  const handleSignOutAndRetry = useCallback(async () => {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      // Recarga completa para que el nuevo estado de autenticación
      // se propague por todas partes (middleware, AuthProvider).
      // Conserva el token de invitación en la URL para que la página
      // reconstruida muestre el flujo correspondiente a una sesión cerrada.
      window.location.reload();
    } catch (err) {
      console.error('[join] sign-out error:', err);
      toast.error(
        'No se pudo cerrar la sesión. Intenta actualizar la página.',
      );
      setSigningOut(false);
    }
  }, []);

  // ----- Estado de carga (peek pendiente O autenticación aún no resuelta) -----
  if (peek === null || authedUserId === undefined) {
    return (
      <Card className="w-full max-w-md border-border bg-card">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Verificando la invitación…
          </p>
        </CardContent>
      </Card>
    );
  }

  // ----- Peek falló -----
  if (!peek.ok) {
    const copy = FAIL_COPY[peek.reason];
    return (
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
            <MailX className="h-6 w-6 text-red-400" />
          </div>
          <CardTitle className="text-xl text-foreground">
            {copy.title}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {copy.body}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {/* Para server_error, el fallo es temporal: puede que la red
              haya tenido una interrupción o que el endpoint peek haya
              fallado momentáneamente. Intentar de nuevo es la acción
              principal adecuada; los enlaces para "crear una cuenta" /
              "iniciar sesión" permanecen como opciones secundarias.
              Los demás motivos (not_found / used / expired) son
              definitivos para este token, por lo que no mostramos
              una opción para reintentar, solo las alternativas
              de registro/inicio de sesión. */}
          {peek.reason === 'server_error' ? (
            <>
              <Button
                onClick={loadPeekAndAuth}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Intentar de nuevo
              </Button>
              <Link href="/signup">
                <Button
                  variant="outline"
                  className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Crear una cuenta nueva
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/signup">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Crear una cuenta nueva
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Iniciar sesión
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // ----- Peek correcto -----
  const inviteHeader = (
    <CardHeader className="items-center text-center">
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <UsersRound className="h-6 w-6 text-primary" />
      </div>
      <CardTitle className="text-xl text-foreground">
        <span className="text-primary">{peek.account_name}</span>
        {' '}te invitó a unirte a CRM
      </CardTitle>
      <CardDescription className="text-muted-foreground">
        Te unirás como{' '}
        <span className="inline-flex items-center gap-1 text-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          {ROLE_LABEL[peek.role]}
        </span>
        .
      </CardDescription>
    </CardHeader>
  );

  const expirationDate = new Date(peek.expires_at).toLocaleDateString(
    'es-MX',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  );

  // ----- Autenticado: mostrar botón Unirme -----
  if (authedUserId) {
    return (
      <>
        <Card className="w-full max-w-md border-border bg-card">
          {inviteHeader}
          <CardContent className="flex flex-col gap-3">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {accepting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uniéndote…
                </>
              ) : (
                <>
                  <CheckCircle className="size-4" />
                  Unirme
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Al unirte, tendrás acceso a {peek.account_name} como{' '}
              {ROLE_LABEL[peek.role].toLowerCase()}.
            </p>

            <p className="text-center text-xs text-muted-foreground">
              Esta invitación es válida hasta el {expirationDate}.
            </p>
          </CardContent>
        </Card>

        {/* Modal de conflicto: se abre cuando el endpoint redeem devuelve
            409 (la persona ya pertenece a una cuenta compartida o tiene
            datos de dominio). Bloquea el flujo hasta que el usuario elija
            una acción de recuperación para evitar que quede atrapado
            reintentando un proceso que seguirá fallando. */}
        <Dialog
          open={conflictMessage !== null}
          onOpenChange={(open) => {
            if (!open) setConflictMessage(null);
          }}
        >
          <DialogContent className="bg-popover border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-popover-foreground">
                <AlertTriangle className="size-4 text-amber-400" />
                No puedes unirte a {peek.account_name} con esta cuenta
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {conflictMessage}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2 text-xs text-muted-foreground">
              <p>
                Para unirte a{' '}
                <span className="text-popover-foreground">
                  {peek.account_name}
                </span>
                , cierra sesión y vuelve a registrarte con una dirección de
                correo electrónico diferente. El enlace seguirá siendo válido
                mientras no haya caducado.
              </p>
            </div>

            <DialogFooter className="bg-popover border-border">
              <Button
                variant="outline"
                onClick={() => setConflictMessage(null)}
                className="border-border text-popover-foreground hover:bg-muted"
              >
                Mantener sesión iniciada
              </Button>
              <Button
                onClick={handleSignOutAndRetry}
                disabled={signingOut}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {signingOut ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Cerrando sesión…
                  </>
                ) : (
                  'Cerrar sesión y usar otro correo'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ----- No autenticado: solicitar registro o inicio de sesión -----
  return (
    <Card className="w-full max-w-md border-border bg-card">
      {inviteHeader}
      <CardContent className="flex flex-col gap-2">
        <Link href={`/signup?invite=${encodeURIComponent(token!)}`}>
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            Crear cuenta y unirme
          </Button>
        </Link>
        <Link href={`/login?invite=${encodeURIComponent(token!)}`}>
          <Button
            variant="outline"
            className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Ya tengo una cuenta
          </Button>
        </Link>

        <p className="pt-1 text-center text-xs text-muted-foreground">
          Esta invitación es válida hasta el {expirationDate}.
        </p>
      </CardContent>
    </Card>
  );
}
