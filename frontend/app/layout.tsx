import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pumpkin Hub — Plugin Registry",
  description:
    "The community registry for plugins and resources for the Pumpkin MC Minecraft server, powered by Rust.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen scanline antialiased">{children}</body>
    </html>
  );
}
