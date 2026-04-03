"use client";

import { usePlugins, usePublicStats } from "@/lib/hooks";
import { Navbar, Footer } from "@/components/layout";
import { HeroSection } from "./_components/HeroSection";
import { ServerBuilderSpotlight } from "./_components/ServerBuilderSpotlight";
import { TrendingSection } from "./_components/TrendingSection";
import { FeaturesSection } from "./_components/FeaturesSection";
import { CtaSection } from "./_components/CtaSection";
import { Ticker } from "./_components/Ticker";

export default function HomePage() {
  const { data: pluginsData } = usePlugins({
    sort_by: "downloads_total",
    order: "desc",
    per_page: 5,
  });
  const { data: statsData } = usePublicStats();

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
      <ServerBuilderSpotlight />
      <TrendingSection plugins={plugins} />
      <FeaturesSection />
      <CtaSection />
      <Footer />
    </>
  );
}
