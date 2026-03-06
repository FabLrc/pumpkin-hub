"use client";

import { use, useState } from "react";
import { Navbar, Footer } from "@/components/layout";
import { usePlugin } from "@/lib/hooks";
import { PluginHeader } from "./_components/PluginHeader";
import { PluginContent } from "./_components/PluginContent";
import { PluginSidebar } from "./_components/PluginSidebar";

interface PluginPageProps {
  params: Promise<{ slug: string }>;
}

export default function PluginPage({ params }: PluginPageProps) {
  const { slug } = use(params);
  const { data: plugin, isLoading, error } = usePlugin(slug);
  const [activeTab, setActiveTab] = useState<"overview" | "versions" | "dependencies">("overview");

  if (isLoading) {
    return (
      <>
        <Navbar />
        <LoadingSkeleton />
        <Footer />
      </>
    );
  }

  if (error || !plugin) {
    return (
      <>
        <Navbar />
        <ErrorState slug={slug} />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-6">
        <PluginHeader plugin={plugin} />

        <div className="flex gap-8 py-8">
          <PluginContent
            plugin={plugin}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <PluginSidebar plugin={plugin} />
        </div>
      </div>
      <Footer />
    </>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-pulse">
      <div className="border-b border-border-default pb-6 mb-8">
        <div className="h-3 bg-bg-surface w-48 mb-5" />
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 bg-bg-surface flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-bg-surface w-64" />
            <div className="h-3 bg-bg-surface w-96" />
          </div>
        </div>
      </div>
      <div className="flex gap-8">
        <div className="flex-1 space-y-4">
          <div className="h-4 bg-bg-surface w-32" />
          <div className="h-3 bg-bg-surface w-full" />
          <div className="h-3 bg-bg-surface w-3/4" />
          <div className="h-3 bg-bg-surface w-5/6" />
        </div>
        <div className="w-72 space-y-4">
          <div className="h-48 bg-bg-surface border border-border-default" />
          <div className="h-32 bg-bg-surface border border-border-default" />
        </div>
      </div>
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────

function ErrorState({ slug }: { slug: string }) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center justify-center">
      <div className="w-16 h-16 border border-border-default bg-bg-surface flex items-center justify-center mb-6">
        <span className="font-mono text-2xl text-text-dim">!</span>
      </div>
      <h2 className="font-raleway font-bold text-xl text-text-primary mb-2">
        Plugin not found
      </h2>
      <p className="font-mono text-xs text-text-dim mb-6">
        Could not find a plugin with slug &ldquo;{slug}&rdquo;.
      </p>
      <a
        href="/explorer"
        className="font-mono text-xs bg-accent hover:bg-accent-hover text-bg-base font-bold px-5 py-2.5 transition-colors"
      >
        ← Back to Explorer
      </a>
    </div>
  );
}
