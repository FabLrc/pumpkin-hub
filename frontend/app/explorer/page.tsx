import { Suspense } from "react";
import { ExplorerContent } from "./_components/ExplorerContent";
import { Navbar, Footer } from "@/components/layout";

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
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-28 bg-bg-surface border border-border-default" />
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


