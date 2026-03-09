"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  User,
  Download,
  Package,
  Calendar,
  Shield,
} from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { PluginCard } from "@/components/ui/PluginCard";
import {
  fetchAuthorProfile,
  fetchAuthorPlugins,
} from "@/lib/api";
import type { AuthorProfileResponse, PluginSummary, PaginationMeta } from "@/lib/types";
import { formatDownloads } from "@/components/ui/PluginCard";

const PER_PAGE = 12;

function formatMemberSince(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function roleBadge(role: string) {
  const styles: Record<string, string> = {
    admin: "border-red-500/30 text-red-400 bg-red-500/5",
    moderator: "border-accent/30 text-accent bg-accent/5",
    author: "border-border-default text-text-dim",
  };
  return styles[role] ?? styles.author;
}

export default function AuthorProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const [author, setAuthor] = useState<AuthorProfileResponse | null>(null);
  const [plugins, setPlugins] = useState<PluginSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlugins, setIsLoadingPlugins] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoading(true);
        const [profileData, pluginsData] = await Promise.all([
          fetchAuthorProfile(username),
          fetchAuthorPlugins(username, 1, PER_PAGE),
        ]);
        setAuthor(profileData);
        setPlugins(pluginsData.data);
        setPagination(pluginsData.pagination);
      } catch {
        setError("Author not found");
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [username]);

  useEffect(() => {
    if (page === 1) return;
    async function loadPage() {
      try {
        setIsLoadingPlugins(true);
        const data = await fetchAuthorPlugins(username, page, PER_PAGE);
        setPlugins(data.data);
        setPagination(data.pagination);
      } catch {
        /* keep current data */
      } finally {
        setIsLoadingPlugins(false);
      }
    }
    loadPage();
  }, [username, page]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-bg-primary py-12 px-6">
          <div className="max-w-5xl mx-auto animate-pulse space-y-6">
            <div className="h-6 w-32 bg-bg-surface border border-border-default" />
            <div className="flex gap-6">
              <div className="w-24 h-24 bg-bg-surface border border-border-default" />
              <div className="space-y-3 flex-1">
                <div className="h-8 w-48 bg-bg-surface border border-border-default" />
                <div className="h-4 w-96 bg-bg-surface border border-border-default" />
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-bg-surface border border-border-default" />
            ))}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !author) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-bg-primary flex items-center justify-center">
          <div className="text-center space-y-4">
            <User className="w-16 h-16 text-text-dim mx-auto" />
            <h1 className="font-raleway font-black text-2xl text-text-primary">
              Author Not Found
            </h1>
            <p className="font-mono text-sm text-text-dim">
              No user with username &ldquo;{username}&rdquo; exists.
            </p>
            <Link
              href="/explorer"
              className="inline-block border border-accent text-accent font-mono text-xs px-4 py-2 hover:bg-accent hover:text-bg-primary transition-colors"
            >
              Browse Plugins
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-bg-primary py-12 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Back link */}
          <Link
            href="/explorer"
            className="inline-flex items-center gap-2 font-mono text-xs text-text-dim hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Explorer
          </Link>

          {/* Profile header */}
          <section className="border border-border-default bg-bg-elevated/30 p-6 flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 flex-shrink-0 border border-border-default bg-bg-surface flex items-center justify-center overflow-hidden">
              {author.avatar_url ? (
                <Image
                  src={author.avatar_url}
                  alt={`${author.username}'s avatar`}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-text-dim" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-raleway font-black text-2xl text-text-primary">
                  {author.display_name ?? author.username}
                </h1>
                <span
                  className={`font-mono text-[10px] uppercase px-2 py-0.5 border ${roleBadge(author.role)}`}
                >
                  {author.role}
                </span>
              </div>

              <p className="font-mono text-xs text-text-dim">
                @{author.username}
              </p>

              {author.bio && (
                <p className="font-raleway text-sm text-text-subtle leading-relaxed max-w-2xl">
                  {author.bio}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 flex-wrap pt-1">
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-accent" />
                  <span className="font-mono text-xs text-text-subtle">
                    <span className="font-bold text-text-primary">{author.plugin_count}</span>{" "}
                    {author.plugin_count === 1 ? "plugin" : "plugins"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-accent" />
                  <span className="font-mono text-xs text-text-subtle">
                    <span className="font-bold text-text-primary">
                      {formatDownloads(author.total_downloads)}
                    </span>{" "}
                    total downloads
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-text-dim" />
                  <span className="font-mono text-xs text-text-dim">
                    Member since {formatMemberSince(author.created_at)}
                  </span>
                </div>
                {author.role !== "author" && (
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-accent" />
                    <span className="font-mono text-xs text-accent">
                      Staff
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Plugins section */}
          <section className="space-y-4">
            <h2 className="font-raleway font-black text-lg text-text-primary border-b border-border-default pb-2">
              Published Plugins
            </h2>

            {plugins.length === 0 ? (
              <div className="border border-border-default bg-bg-elevated/30 p-8 text-center">
                <Package className="w-10 h-10 text-text-dim mx-auto mb-3" />
                <p className="font-mono text-sm text-text-dim">
                  This author hasn&apos;t published any plugins yet.
                </p>
              </div>
            ) : (
              <div className={`space-y-2 ${isLoadingPlugins ? "opacity-50" : ""}`}>
                {plugins.map((plugin) => (
                  <PluginCard key={plugin.id} plugin={plugin} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="font-mono text-xs border border-border-default px-3 py-1.5 text-text-dim hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="font-mono text-xs text-text-dim">
                  Page {page} of {pagination.total_pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                  disabled={page >= pagination.total_pages}
                  className="font-mono text-xs border border-border-default px-3 py-1.5 text-text-dim hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
