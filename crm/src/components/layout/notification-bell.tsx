"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, CheckCheck, UserPlus, Volume2, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import {
  isSoundEnabled,
  playNotificationSound,
  setSoundEnabled,
  unlockNotificationSound,
} from "@/lib/notification-sound";
import type { Notification } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const RECENT_LIMIT = 5;

export function NotificationBell() {
  const router = useRouter();
  const [recent, setRecent] = useState<Notification[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [ringing, setRinging] = useState(false);

  const loadRecent = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT);
    if (!error && data) setRecent(data as Notification[]);
  }, []);

  // Llega una notificacion nueva: se agrega a la lista, suena y la campana late unos segundos.
  const handleInsert = useCallback((row: Notification) => {
    setRecent((prev) =>
      [row, ...prev.filter((n) => n.id !== row.id)].slice(0, RECENT_LIMIT),
    );
    if (isSoundEnabled()) playNotificationSound();
    setRinging(true);
    window.setTimeout(() => setRinging(false), 4000);
  }, []);

  const unread = useUnreadNotifications({ onInsert: handleInsert });

  useEffect(() => {
    setSoundOn(isSoundEnabled());
    unlockNotificationSound();
    void loadRecent();
  }, [loadRecent]);

  async function markRead(id: string) {
    const now = new Date().toISOString();
    setRecent((prev) =>
      prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)),
    );
    await createClient()
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id)
      .is("read_at", null);
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setRecent((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await createClient()
      .from("notifications")
      .update({ read_at: now })
      .is("read_at", null);
  }

  function openNotification(n: Notification) {
    if (!n.read_at) void markRead(n.id);
    router.push(n.conversation_id ? "/inbox?c=" + n.conversation_id : "/notifications");
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playNotificationSound(); // vista previa (el clic desbloquea el audio)
  }

  const label =
    unread > 0 ? "Notificaciones (" + unread + " sin leer)" : "Notificaciones";

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void loadRecent();
      }}
    >
      <DropdownMenuTrigger
        aria-label={label}
        title={label}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none data-popup-open:bg-muted/70 data-popup-open:text-foreground"
      >
        <Bell className={cn("size-5", ringing && "animate-bounce")} />
        {unread > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-background",
              ringing && "animate-pulse",
            )}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-80 bg-popover p-0 text-popover-foreground ring-border sm:w-96"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">Notificaciones</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" />
              Marcar leídas
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0 bg-border" />

        {recent.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            Aún no tienes notificaciones.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {recent.map((n) => {
              const isUnread = !n.read_at;
              return (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className="flex items-start gap-3 rounded-none px-3 py-2.5"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      isUnread ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    <UserPlus className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          isUnread ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {n.title}
                      </span>
                      {isUnread && (
                        <span className="size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </span>
                    {n.body && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {n.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}

        <DropdownMenuSeparator className="m-0 bg-border" />
        <DropdownMenuItem
          render={<Link href="/notifications" />}
          className="rounded-none px-3 py-2.5 text-sm text-popover-foreground"
        >
          <Bell className="size-4" />
          Ver todas las notificaciones
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={toggleSound}
          className="rounded-none px-3 py-2.5 text-sm text-popover-foreground"
        >
          {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          Sonido: {soundOn ? "activado" : "desactivado"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
