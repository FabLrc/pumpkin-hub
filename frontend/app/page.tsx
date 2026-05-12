"use client";

import { usePlugins, usePublicStats } from "@/lib/hooks";
import { Navbar, Footer } from "@/components/layout";
import { HeroSection } from "./_components/HeroSection";
import { ServerBuilderSpotlight } from "./_components/ServerBuilderSpotlight";
import { TrendingSection } from "./_components/TrendingSection";
import { FeaturesSection } from "./_components/FeaturesSection";
import { CtaSection } from "./_components/CtaSection";
import { Ticker } from "./_components/Ticker";
import { RecentlyPublishedSection } from "./_components/RecentlyPublishedSection";

export default function HomePage() {
  const { data: pluginsData, error: pluginsError, isLoading: pluginsLoading } = usePlugins({
    sort_by: "downloads_total",
    order: "desc",
    per_page: 5,
  });
  const { data: statsData, error: statsError, isLoading: statsLoading } = usePublicStats();

  const plugins = pluginsData?.data ?? [];

  return (
    <>
      <Navbar />
      <Ticker />
      <HeroSection
        totalPlugins={statsData?.total_plugins ?? 0}
        totalAuthors={statsData?.total_authors ?? 0}
        totalDownloads={statsData?.total_downloads ?? 0}
      />
      {statsError && !statsLoading && (
        <section className="border-t border-border-default">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <p className="font-mono text-xs text-error text-center">
              Could not load statistics. Please try again later.
            </p>
          </div>
        </section>
      )}
      <RecentlyPublishedSection />
      <FeaturesSection />
      <TrendingSection plugins={plugins} isLoading={pluginsLoading} error={pluginsError} />
      <ServerBuilderSpotlight />
      <CtaSection authorsCount={statsData?.total_authors ?? 0} />
      <Footer />
    </>
  );
}
