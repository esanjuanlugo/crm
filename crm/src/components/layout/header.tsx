"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ChevronDown, LogOut, Menu, Search, Shield, User } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppearanceMenu } from "@/components/layout/appearance-menu";
import { CurrencyMenu } from "@/components/layout/currency-menu";
import { NotificationBell } from "@/components/layout/notification-bell";

const pageTitles: Record<string, string> = {
  "/dashboard": "dashboard",
  "/inbox": "inbox",
  "/notifications": "notifications",
  "/contacts": "contacts",
  "/pipelines": "pipelines",
  "/broadcasts": "broadcasts",
  "/automations": "automations",
  "/settings": "settings",
};

// Paginas que ya muestran su propio titulo: en la barra no se repite.
const PAGES_WITH_OWN_TITLE = new Set([
  "/dashboard",
  "/notifications",
  "/contacts",
  "/pipelines",
  "/broadcasts",
  "/automations",
  "/agents",
  "/settings",
]);

function getPageTitleKey(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path),
  );
  return match ? match[1] : "dashboard";
}

interface HeaderProps {
  /** Wired to the shell's drawer state. Used only on mobile — the
   *  hamburger button is hidden on lg+. */
  onOpenSidebar?: () => void;
}

import { useLocale, useTranslations } from "next-intl";

export function Header({ onOpenSidebar }: HeaderProps) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();
  const searchLabel = locale === "es" ? "Buscar..." : "Search...";
  // Abre la paleta de comandos (misma que Ctrl+K).
  const openPalette = () =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
    );
  const { profile, signOut } = useAuth();
  const titleKey = getPageTitleKey(pathname);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {/* Hamburger — mobile only. 44×44 hit target per Apple HIG. */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label={t("openMenu")}
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        {PAGES_WITH_OWN_TITLE.has(pathname.replace(/\/+$/, "")) ? null : (
          <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
            {t(titleKey as string)}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={openPalette}
          aria-label={searchLabel}
          className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-muted/40 pl-3 pr-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex md:w-56 lg:w-64"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{searchLabel}</span>
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-sans text-[10px] font-medium">
            Ctrl K
          </kbd>
        </button>

        <div className="flex items-center gap-0.5 rounded-xl border border-border bg-muted/40 p-0.5">
          <NotificationBell />
          <CurrencyMenu className="h-9 rounded-lg" />
          <AppearanceMenu className="h-9 w-9 rounded-lg" />
        </div>

        <div className="hidden h-6 w-px bg-border sm:block" />

        <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-1 transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none data-popup-open:bg-muted/70 sm:gap-2.5 sm:pr-2"
          aria-label={t("openAccountMenu")}
        >
          <Avatar className="size-8 ring-2 ring-primary/30">
            {profile?.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.full_name ?? t("defaultAvatar")}
              />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-sm font-semibold text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-col items-start text-left leading-tight sm:flex">
            <span className="max-w-40 truncate text-sm font-medium text-foreground">
              {profile?.full_name ?? t("defaultUser")}
            </span>
            <span className="max-w-40 truncate text-[11px] text-muted-foreground">
              {profile?.email ?? ""}
            </span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="min-w-56 bg-popover text-popover-foreground ring-border"
        >
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium text-foreground">
              {profile?.full_name ?? t("defaultUser")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.email ?? ""}
            </p>
          </div>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            render={
              <Link
                href="/settings?tab=profile"
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              />
            }
          >
            <User className="size-4" />
            {t("menuProfile")}
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link
                href="/settings?tab=security"
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              />
            }
          >
            <Shield className="size-4" />
            {t("menuSecurity")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            onClick={signOut}
            className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
          >
            <LogOut className="size-4" />
            {t("menuSignOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
