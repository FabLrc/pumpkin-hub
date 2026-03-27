import { Suspense } from "react";
import type { Metadata } from "next";
import { ExplorerContent } from "./_components/ExplorerContent";
import { Navbar, Footer } from "@/components/layout";

export const metadata: Metadata = {
  title: "Explore Plugins",
  description:
    "Browse, search and filter community plugins for the Pumpkin MC Minecraft server. Find the perfect crate for your server.",
  openGraph: {
    title: "Explore Plugins",
    description:
      "Browse, search and filter community plugins for the Pumpkin MC Minecraft server.",
  },
  twitter: {
    card: "summary",
    title: "Explore Plugins",
    description:
      "Browse, search and filter community plugins for the Pumpkin MC Minecraft server.",
  },
};

export default function ExplorerPage() {
  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <div className="flex max-w-full">
            <div className="w-72 flex-shrink-0 hidden md:block border-r border-border-default bg-bg-elevated/30 p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-bg-surface border border-border-default" />
                <div className="h-8 bg-bg-surface border border-border-default w-2/3" />
                <div className="h-8 bg-bg-surface border border-border-default w-1/2" />
              </div>
            </div>
            <main className="flex-1 p-8">
              <div className="animate-pulse space-y-4">
                {["sk-1","sk-2","sk-3","sk-4","sk-5"].map((key) => (
                  <div key={key} className="h-28 bg-bg-surface border border-border-default" />
                ))}
              </div>
            </main>
          </div>
        }
      >
        <ExplorerContent />
      </Suspense>
      <Footer />
    </>
  );
}


