import { useId } from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type MarkProps = { className?: string; title?: string };

/**
 * Velvet Suit mark: a velvet-plum rounded tile holding a "V" built from
 * two suit lapels, with a gold button at the notch.
 */
export function VelvetSuitMark({ className, title = BRAND.name }: MarkProps) {
  const id = useId();
  const bg = `${id}-bg`;
  const sheen = `${id}-sheen`;
  const gold = `${id}-gold`;
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("h-10 w-10", className)}
    >
      <defs>
        <linearGradient id={bg} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.55" stopColor="#4c1d95" />
          <stop offset="1" stopColor="#1e0a3c" />
        </linearGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2a8" />
          <stop offset="1" stopColor="#c9993f" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${bg})`} />
      <rect width="64" height="64" rx="15" fill={`url(#${sheen})`} />
      {/* Lapels forming a V */}
      <path d="M13 14 L28 14 L32 31 L24 31 Z" fill="#f5f3ff" />
      <path d="M51 14 L36 14 L32 31 L40 31 Z" fill="#ddd6fe" />
      <path d="M24 31 L32 52 L40 31 L32 36 Z" fill="#f5f3ff" opacity="0.95" />
      {/* Button */}
      <circle cx="32" cy="43" r="2.6" fill={`url(#${gold})`} />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

/** Mark + "Velvet Suit" wordmark, for headers and the sidebar. */
export function VelvetSuitLogo({
  className,
  markClassName,
  showWordmark = true,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <VelvetSuitMark className={cn("h-8 w-8", markClassName)} />
      {showWordmark && (
        <span className="leading-none">
          <span className="block text-sm font-semibold tracking-wide text-foreground">
            Velvet <span className="text-primary">Suit</span>
          </span>
        </span>
      )}
    </span>
  );
}
