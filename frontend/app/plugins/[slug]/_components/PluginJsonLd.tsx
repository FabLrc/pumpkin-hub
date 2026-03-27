import type { PluginResponse } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pumpkinhub.com";

interface PluginJsonLdProps {
  readonly plugin: PluginResponse;
}

/**
 * Renders a <script type="application/ld+json"> element with
 * schema.org SoftwareApplication structured data for a plugin.
 */
export function PluginJsonLd({ plugin }: PluginJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: plugin.name,
    description: plugin.short_description ?? plugin.description ?? undefined,
    url: `${SITE_URL}/plugins/${plugin.slug}`,
    applicationCategory: "GamePlugin",
    operatingSystem: "Pumpkin MC Server",
    author: {
      "@type": "Person",
      name: plugin.author.username,
    },
    ...(plugin.license && { license: plugin.license }),
    ...(plugin.repository_url && {
      codeRepository: plugin.repository_url,
    }),
    dateCreated: plugin.created_at,
    dateModified: plugin.updated_at,
    ...(plugin.categories.length > 0 && {
      keywords: plugin.categories.map((c) => c.name).join(", "),
    }),
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: { "@type": "DownloadAction" },
      userInteractionCount: plugin.downloads_total,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c"),
      }}
    />
  );
}
