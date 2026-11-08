import localFont from "next/font/local";

// Lexend: wide, open letterforms that stay readable on a small phone at the front desk.
export const latin = localFont({
  src: [
    { path: "./fonts/lexend-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/lexend-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-latin",
  display: "swap",
});

// Noto Sans Ethiopic for Amharic (Ge'ez script). Latin glyphs fall through to Lexend first.
export const ethiopic = localFont({
  src: [
    { path: "./fonts/noto-sans-ethiopic-ethiopic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-sans-ethiopic-ethiopic-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-ethiopic",
  display: "swap",
  preload: false,
});
