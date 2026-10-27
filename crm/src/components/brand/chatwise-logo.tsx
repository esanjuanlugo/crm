import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type MarkProps = { className?: string; title?: string };

/**
 * Chatwise mark: a violet rounded tile holding a white chat bubble
 * with an AI spark inside.
 */
export function ChatwiseMark({ className, title = BRAND.name }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("h-10 w-10", className)}
    >
      <rect width="64" height="64" rx="15" fill="#6D4AFF" />
      <g transform="translate(8 8)">
        <path
          d="M12 4h24a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H24l-9 8v-8h-3a8 8 0 0 1-8-8V12a8 8 0 0 1 8-8z"
          fill="#FFFFFF"
        />
        <path
          d="M24 10C24.8 15 26.2 17.2 33 19C26.2 20.8 24.8 23 24 28C23.2 23 21.8 20.8 15 19C21.8 17.2 23.2 15 24 10z"
          fill="#6D4AFF"
        />
      </g>
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

/** Mark + "Chatwise" wordmark, for headers and the sidebar. */
export function ChatwiseLogo({
  className,
  markClassName,
  showWordmark = true,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <ChatwiseMark className={cn("h-8 w-8", markClassName)} />
      {showWordmark && (
        <span className="leading-none">
          <span className="block text-sm font-semibold tracking-wide text-foreground">
            Chat<span className="text-primary">wise</span>
          </span>
        </span>
      )}
    </span>
  );
}