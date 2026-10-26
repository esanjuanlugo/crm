import { ImageResponse } from "next/og";

// Replaces the default Next.js favicon with the brand mark — Velvet Suit
// plum rounded square + lapel "V" mark — matching the
// sidebar logo in `src/components/layout/sidebar.tsx`. Next.js renders
// this at build time and auto-injects <link rel="icon"> into <head>.
//
// This route takes precedence over src/app/favicon.ico, which is the
// Next.js default and can stay on disk harmlessly (or be removed).

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#7c3aed,#1e0a3c)",
          borderRadius: 6,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 64 64">
          <path d="M13 14 L28 14 L32 31 L24 31 Z" fill="#f5f3ff" />
          <path d="M51 14 L36 14 L32 31 L40 31 Z" fill="#ddd6fe" />
          <path d="M24 31 L32 52 L40 31 L32 36 Z" fill="#f5f3ff" />
          <circle cx="32" cy="43" r="3" fill="#e7c27d" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
