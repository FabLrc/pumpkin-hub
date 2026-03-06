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
      <body className="min-h-screen scanline antialiased">{children}</body>
    </html>
  );
}
