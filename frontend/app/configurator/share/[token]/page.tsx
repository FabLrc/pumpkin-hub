import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerConfigByShareToken } from "@/lib/api";
import type { ServerConfigResponse } from "@/lib/types";
import { SharedConfigPageClient } from "./SharedConfigPageClient";

interface SharedConfigPageProps {
  readonly params: Promise<{ token: string }>;
}

export const revalidate = 300;

async function loadSharedConfig(
  token: string,
): Promise<ServerConfigResponse | null> {
  try {
    return await getServerConfigByShareToken(token);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("API 404")) {
      return null;
    }

    throw error;
  }
}

export async function generateMetadata({
  params,
}: SharedConfigPageProps): Promise<Metadata> {
  const { token } = await params;
  const config = await loadSharedConfig(token);

  if (!config) {
    return {
      title: "Server build not found",
      description: "This shared server build does not exist or is no longer available.",
      openGraph: {
        title: "Server build unavailable - PumpkinHub",
      },
    };
  }

  const shareTitle = `Server Build ${config.name} — PumpkinHub`;
  const description =
    "Shared ready-to-run Pumpkin server build with platform and .wasm plugin stack.";

  return {
    title: `Server Build ${config.name}`,
    description,
    openGraph: {
      type: "website",
      title: shareTitle,
      description,
      url: `/server-builder/share/${config.share_token}`,
    },
    twitter: {
      card: "summary",
      title: shareTitle,
      description,
    },
  };
}

export default async function SharedConfigPage({ params }: SharedConfigPageProps) {
  const { token } = await params;
  const config = await loadSharedConfig(token);

  if (!config) {
    notFound();
  }

  return <SharedConfigPageClient config={config} />;
}
