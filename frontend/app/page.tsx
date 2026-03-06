"use client";

import { usePlugins } from "@/lib/hooks";
import { Navbar, Footer } from "@/components/layout";
import { HeroSection } from "./_components/HeroSection";
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

  const plugins = pluginsData?.data ?? [];
  const totalPlugins = pluginsData?.pagination.total ?? 0;

  return (
    <>
      <Navbar />
      <Ticker />
      <HeroSection totalPlugins={totalPlugins} />
      <TrendingSection plugins={plugins} />
      <FeaturesSection />
      <CtaSection />
      <Footer />
    </>
  );
}
