import { ImageResponse } from "next/og";

// Favicon: the Chatwise mark (violet tile, white chat bubble, AI spark),
// matching the sidebar logo in `src/components/brand/chatwise-logo.tsx`.
// Next.js renders this at build time and injects <link rel="icon">.

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
          background: "#6D4AFF",
          borderRadius: 7,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 48 48">
          <path
            d="M12 4h24a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H24l-9 8v-8h-3a8 8 0 0 1-8-8V12a8 8 0 0 1 8-8z"
            fill="#FFFFFF"
          />
          <path
            d="M24 10C24.8 15 26.2 17.2 33 19C26.2 20.8 24.8 23 24 28C23.2 23 21.8 20.8 15 19C21.8 17.2 23.2 15 24 10z"
            fill="#6D4AFF"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}