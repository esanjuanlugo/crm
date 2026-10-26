"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCheck } from "lucide-react";

// ---------------------------------------------------------------------------
// Animated chat preview for the modern login (brand panel, bottom-left).
//
// Loop (≈ 12 s):
//   1. customer "typing…" dots  → customer bubble pops in
//   2. AI agent "typing…" dots  → reply is typed out letter by letter
//   3. double check turns to the primary color (message read)
//   4. everything fades out and starts over
//
// Respects `prefers-reduced-motion`: shows the finished conversation, static.
// Keyframes (.login-chat-*) live in globals.css.
// ---------------------------------------------------------------------------

type Phase =
  | "idle"
  | "inTyping"
  | "in"
  | "outTyping"
  | "out"
  | "leaving";

const TYPE_SPEED_MS = 32;

function TypingDots({ className = "" }: { className?: string }) {
  return (
    <span className={`flex h-5 items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="login-chat-dot h-1.5 w-1.5 rounded-full bg-current"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}

export function LoginChatDemo({
  incoming,
  outgoing,
}: {
  incoming: string;
  outgoing: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState(0);
  const [read, setRead] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let cancelled = false;
    const timers = new Set<number>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(() => {
          timers.delete(id);
          resolve();
        }, ms);
        timers.add(id);
      });

    (async () => {
      // Reduced motion: show the finished conversation, no loop.
      if (reduced) {
        setPhase("out");
        setTyped(outgoing.length);
        setRead(true);
        return;
      }

      while (!cancelled) {
        setPhase("idle");
        setTyped(0);
        setRead(false);
        await wait(800);

        setPhase("inTyping");
        await wait(1400);

        setPhase("in");
        await wait(1000);

        setPhase("outTyping");
        await wait(1500);

        setPhase("out");
        for (let i = 1; i <= outgoing.length; i++) {
          setTyped(i);
          await wait(TYPE_SPEED_MS);
        }
        await wait(600);

        setRead(true);
        await wait(4200);

        setPhase("leaving");
        await wait(700);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [incoming, outgoing]);

  const showIncomingTyping = phase === "inTyping";
  const showIncoming =
    phase === "in" ||
    phase === "outTyping" ||
    phase === "out" ||
    phase === "leaving";
  const showOutgoingTyping = phase === "outTyping";
  const showOutgoing = phase === "out" || phase === "leaving";

  return (
    <div
      aria-hidden="true"
      className={`relative flex min-h-[152px] max-w-sm flex-col gap-2 transition-all duration-500 ease-out ${
        phase === "leaving"
          ? "-translate-y-1 opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      {/* Customer: typing dots → message */}
      {showIncomingTyping && (
        <div className="login-chat-pop w-fit origin-bottom-left rounded-2xl rounded-bl-md border border-border/60 bg-card/60 px-4 py-3 text-muted-foreground backdrop-blur">
          <TypingDots />
        </div>
      )}
      {showIncoming && (
        <div className="login-chat-pop w-fit max-w-[85%] origin-bottom-left rounded-2xl rounded-bl-md border border-border/60 bg-card/60 px-4 py-2.5 text-sm text-foreground backdrop-blur">
          {incoming}
        </div>
      )}

      {/* AI agent: typing dots → message typed out */}
      {showOutgoingTyping && (
        <div className="login-chat-pop ml-auto flex w-fit origin-bottom-right items-center gap-2 rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground shadow-lg shadow-primary/20">
          <TypingDots />
          <Bot className="login-chat-bot h-4 w-4 shrink-0 opacity-80" />
        </div>
      )}
      {showOutgoing && (
        <div className="ml-auto flex w-fit max-w-[85%] flex-col items-end gap-1">
          <div className="login-chat-pop flex origin-bottom-right items-center gap-2 rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-lg shadow-primary/20">
            {/* Full text is rendered invisibly so the bubble keeps its final
                size while the visible copy is typed over it. */}
            <span className="relative">
              <span className="invisible">{outgoing}</span>
              <span className="absolute inset-0">{outgoing.slice(0, typed)}</span>
            </span>
            <Bot className="h-4 w-4 shrink-0 opacity-80" />
          </div>
          <CheckCheck
            className={`h-3.5 w-3.5 transition-colors duration-500 ${
              read ? "text-primary" : "text-muted-foreground/50"
            } ${typed < outgoing.length ? "opacity-0" : "opacity-100"}`}
          />
        </div>
      )}
    </div>
  );
}