import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TimeSpan — Scheduling & routing optimization APIs",
  description:
    "Automate workforce scheduling, vehicle routing and task assignment with TimeSpan's AI optimization platform. Plug production-grade optimization into your software via REST.",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml," + encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><defs><linearGradient id='g' x1='0' y1='0' x2='48' y2='48' gradientUnits='userSpaceOnUse'><stop stop-color='#A78BFA'/><stop offset='.5' stop-color='#7C3AED'/><stop offset='1' stop-color='#22D3EE'/></linearGradient></defs><rect width='48' height='48' rx='10' fill='#0B0B14'/><rect x='8' y='10' width='24' height='6' rx='3' fill='url(#g)'/><rect x='16' y='21' width='24' height='6' rx='3' fill='url(#g)' opacity='.85'/><rect x='8' y='32' width='24' height='6' rx='3' fill='url(#g)'/></svg>`
        ),
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
