import type { Metadata } from "next";
import { fetchPlugin } from "@/lib/api";
import { PluginPageClient } from "./_components/PluginPageClient";

interface PluginPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PluginPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const plugin = await fetchPlugin(slug);
    const title = plugin.name;
    const description =
      plugin.short_description ??
      `${plugin.name} — a community plugin for the Pumpkin MC server.`;

    return {
      title,
      description,
      openGraph: {
        type: "website",
        title: `${plugin.name} — Pumpkin Hub`,
        description,
        url: `/plugins/${plugin.slug}`,
      },
      twitter: {
        card: "summary",
        title: `${plugin.name} — Pumpkin Hub`,
        description,
      },
    };
  } catch {
    return {
      title: "Plugin not found",
      description: "This plugin could not be found on Pumpkin Hub.",
    };
  }
}

export default async function PluginPage({ params }: PluginPageProps) {
  const { slug } = await params;

  return <PluginPageClient slug={slug} />;
}
