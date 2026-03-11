"use client";

import { useState, useCallback } from "react";
import { FileText, Edit3, Save, X, Loader2, Github } from "lucide-react";
import { mutate } from "swr";
import type { PluginResponse } from "@/lib/types";
import { useChangelog, useCurrentUser } from "@/lib/hooks";
import { updateChangelog, getChangelogPath } from "@/lib/api";

interface ChangelogTabProps {
  plugin: PluginResponse;
}

export function ChangelogTab({ plugin }: ChangelogTabProps) {
  const { data, isLoading } = useChangelog(plugin.slug);
  const { data: currentUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner =
    currentUser?.id === plugin.author.id || currentUser?.role === "admin";

  const changelog = data;
  const hasContent = changelog && changelog.content.length > 0;

  const handleStartEdit = useCallback(() => {
    setEditContent(changelog?.content ?? "");
    setIsEditing(true);
    setError(null);
  }, [changelog]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent("");
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editContent.trim()) {
      setError("Changelog content cannot be empty");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateChangelog(plugin.slug, { content: editContent });
      mutate(getChangelogPath(plugin.slug));
      setIsEditing(false);
      setEditContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changelog");
    } finally {
      setIsSaving(false);
    }
  }, [plugin.slug, editContent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-dim">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="font-mono text-xs">Loading changelog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with source badge and edit button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-mono text-sm text-text-primary uppercase tracking-widest">
            Changelog
          </h3>
          {hasContent && (
            <SourceBadge source={changelog.source} />
          )}
        </div>
        {isOwner && !isEditing && (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-default hover:border-accent text-text-muted hover:text-text-primary font-mono text-xs transition-colors cursor-pointer"
          >
            <Edit3 size={12} />
            <span>{hasContent ? "Edit" : "Add Changelog"}</span>
          </button>
        )}
      </div>

      {/* Edit mode */}
      {isEditing ? (
        <div className="space-y-3">
          <div className="border border-border-default bg-bg-elevated">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-default bg-bg-surface">
              <span className="font-mono text-xs text-text-dim uppercase tracking-widest">
                Markdown Editor
              </span>
              <span className="font-mono text-[10px] text-text-dim">
                {editContent.length.toLocaleString()} chars
              </span>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[400px] p-4 bg-bg-elevated text-text-secondary font-mono text-sm resize-y focus:outline-none"
              placeholder="# Changelog&#10;&#10;## [1.0.0] - 2026-03-11&#10;&#10;### Added&#10;- Initial release&#10;&#10;### Fixed&#10;- Bug fixes"
              spellCheck={false}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-error/10 border border-error/30 text-error text-xs font-mono">
              <X size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-bg-base font-mono text-xs uppercase tracking-widest hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span>Save</span>
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 border border-border-default text-text-muted hover:text-text-primary font-mono text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              <X size={14} />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : hasContent ? (
        /* Rendered markdown */
        <div className="md-content border border-border-default bg-bg-elevated p-6">
          <div
            dangerouslySetInnerHTML={{
              __html: formatChangelog(changelog.content),
            }}
          />
        </div>
      ) : (
        /* Empty state */
        <div className="text-center py-16 border border-border-default bg-bg-elevated">
          <FileText size={32} className="mx-auto mb-3 text-text-dim" />
          <p className="text-text-muted font-mono text-sm">
            No changelog available
          </p>
          {isOwner && (
            <p className="text-text-dim font-mono text-xs mt-1">
              Add a changelog to track your plugin{"'"}s evolution
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Source Badge ───────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  if (source === "github") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-bg-surface border border-border-default font-mono text-[10px] text-text-dim">
        <Github size={10} />
        <span>SYNCED FROM GITHUB</span>
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 bg-bg-surface border border-border-default font-mono text-[10px] text-text-dim">
      MANUAL
    </span>
  );
}

// ── Changelog Markdown Formatter ──────────────────────────────────────────

/**
 * Converts changelog-style markdown to styled HTML.
 * Handles Keep-a-Changelog format: headings, version sections, lists,
 * code blocks, inline code, links, bold, and italic.
 *
 * Security: All user content is escaped before rendering.
 */
function formatChangelog(raw: string): string {
  const lines = raw.split("\n");
  const htmlParts: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = "";
  let inList = false;

  for (const line of lines) {
    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        const langClass = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : "";
        htmlParts.push(
          `<pre><code${langClass}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`,
        );
        codeBuffer = [];
        codeLanguage = "";
        inCodeBlock = false;
      } else {
        if (inList) {
          htmlParts.push("</ul>");
          inList = false;
        }
        codeLanguage = line.trim().slice(3).trim();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Blank line → close list if open
    if (trimmed === "") {
      if (inList) {
        htmlParts.push("</ul>");
        inList = false;
      }
      continue;
    }

    // Headings (h1–h4)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      if (inList) {
        htmlParts.push("</ul>");
        inList = false;
      }
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      // Version headings get special styling
      const versionPattern = /^\[[\d.]+\]/;
      const extraClass = versionPattern.test(text) ? ' class="changelog-version"' : "";
      htmlParts.push(`<h${level}${extraClass}>${inlineFormat(text)}</h${level}>`);
      continue;
    }

    // List items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        htmlParts.push("<ul>");
        inList = true;
      }
      htmlParts.push(`<li>${inlineFormat(trimmed.slice(2))}</li>`);
      continue;
    }

    // Paragraph
    if (inList) {
      htmlParts.push("</ul>");
      inList = false;
    }
    htmlParts.push(`<p>${inlineFormat(trimmed)}</p>`);
  }

  // Close any open list
  if (inList) {
    htmlParts.push("</ul>");
  }

  // Close unclosed code block
  if (inCodeBlock && codeBuffer.length > 0) {
    htmlParts.push(
      `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`,
    );
  }

  return htmlParts.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Applies inline formatting: bold, italic, inline code, links.
 * All text is escaped first to prevent XSS.
 */
function inlineFormat(text: string): string {
  let result = escapeHtml(text);

  // Inline code
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Links: [text](url) — only allow http(s) URLs
  result = result.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  return result;
}
