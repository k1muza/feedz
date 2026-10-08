import localFont from "next/font/local";

// The exact IBM Plex builds bundled with design/FeedSport Prototype.html, so
// the studio's type matches the design glyph for glyph. Sans is variable
// (400–600); Mono ships a file per weight.
export const studioSans = localFont({
  src: [{ path: "./fonts/ibm-plex-sans-latin.woff2", weight: "400 600", style: "normal" }],
  variable: "--font-fs-sans",
  display: "swap",
});

export const studioMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-400-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500-latin.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-fs-mono",
  display: "swap",
});
