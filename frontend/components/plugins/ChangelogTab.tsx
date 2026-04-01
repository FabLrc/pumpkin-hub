"use client";

import { useState, useCallback } from "react";
import { FileText, Edit3, Save, X, Loader2, Github } from "lucide-react";
import { mutate } from "swr";
import type { PluginResponse } from "@/lib/types";
import { useChangelog, useCurrentUser } from "@/lib/hooks";
import { updateChangelog, getChangelogPath } from "@/lib/api";

interface ChangelogTabProps {
  readonly plugin: PluginResponse;
}

interface ChangelogEditorProps {
  readonly editContent: string;
  readonly error: string | null;
  readonly isSaving: boolean;
  readonly onContentChange: (value: string) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

function ChangelogEditor({
  editContent,
  error,
  isSaving,
  onContentChange,
  onSave,
  onCancel,
}: ChangelogEditorProps) {
  return (
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
          onChange={(e) => onContentChange(e.target.value)}
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
          onClick={onSave}
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
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 border border-border-default text-text-muted hover:text-text-primary font-mono text-xs uppercase tracking-widest transition-colors cursor-pointer"
        >
          <X size={14} />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
}

interface ChangelogViewProps {
  readonly content: string;
}

function ChangelogView({ content }: ChangelogViewProps) {
  return (
    <div className="md-content border border-border-default bg-bg-elevated p-6">
      <div
        dangerouslySetInnerHTML={{
          __html: formatChangelog(content),
        }}
      />
    </div>
  );
}

interface EmptyChangelogProps {
  readonly isOwner: boolean;
}

function EmptyChangelog({ isOwner }: EmptyChangelogProps) {
  return (
    <div className="text-center py-16 border border-border-default bg-bg-elevated">
      <FileText size={32} className="mx-auto mb-3 text-text-dim" />
      <p className="text-text-muted font-mono text-sm">No changelog available</p>
      {isOwner && (
        <p className="text-text-dim font-mono text-xs mt-1">
          Add a changelog to track your plugin{"'"}s evolution
        </p>
      )}
    </div>
  );
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

      {isEditing ? (
        <ChangelogEditor
          editContent={editContent}
          error={error}
          isSaving={isSaving}
          onContentChange={setEditContent}
          onSave={handleSave}
          onCancel={handleCancelEdit}
        />
      ) : hasContent ? (
        <ChangelogView content={changelog.content} />
      ) : (
        <EmptyChangelog isOwner={isOwner} />
      )}
    </div>
  );
}

// ── Source Badge ───────────────────────────────────────────────────────────

function SourceBadge({ source }: { readonly source: string }) {
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
interface FormatState {
  htmlParts: string[];
  inCodeBlock: boolean;
  codeBuffer: string[];
  codeLanguage: string;
  inList: boolean;
}

function processListItem(trimmed: string, state: FormatState): void {
  if (!state.inList) {
    state.htmlParts.push("<ul>");
    state.inList = true;
  }
  state.htmlParts.push(`<li>${inlineFormat(trimmed.slice(2))}</li>`);
}

function processParagraph(trimmed: string, state: FormatState): void {
  if (state.inList) {
    state.htmlParts.push("</ul>");
    state.inList = false;
  }
  state.htmlParts.push(`<p>${inlineFormat(trimmed)}</p>`);
}

function formatChangelog(raw: string): string {
  const lines = raw.split("\n");
  const state: FormatState = {
    htmlParts: [],
    inCodeBlock: false,
    codeBuffer: [],
    codeLanguage: "",
    inList: false,
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      const result = processCodeFence(line, state.inCodeBlock, state.codeBuffer, state.codeLanguage, state.inList);
      state.htmlParts.push(...result.parts);
      state.inCodeBlock = result.inCodeBlock;
      state.codeBuffer = result.codeBuffer;
      state.codeLanguage = result.codeLanguage;
      state.inList = result.inList;
      continue;
    }

    if (state.inCodeBlock) {
      state.codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (trimmed === "") {
      if (state.inList) {
        state.htmlParts.push("</ul>");
        state.inList = false;
      }
      continue;
    }

    const headingResult = processHeading(trimmed, state.inList);
    if (headingResult !== null) {
      state.htmlParts.push(...headingResult.parts);
      state.inList = headingResult.inList;
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      processListItem(trimmed, state);
      continue;
    }

    processParagraph(trimmed, state);
  }

  if (state.inList) {
    state.htmlParts.push("</ul>");
  }

  if (state.inCodeBlock && state.codeBuffer.length > 0) {
    state.htmlParts.push(
      `<pre><code>${escapeHtml(state.codeBuffer.join("\n"))}</code></pre>`,
    );
  }

  return state.htmlParts.join("\n");
}

interface CodeFenceResult {
  parts: string[];
  inCodeBlock: boolean;
  codeBuffer: string[];
  codeLanguage: string;
  inList: boolean;
}

function processCodeFence(
  line: string,
  inCodeBlock: boolean,
  codeBuffer: string[],
  codeLanguage: string,
  inList: boolean,
): CodeFenceResult {
  const parts: string[] = [];
  if (inCodeBlock) {
    const langClass = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : "";
    parts.push(`<pre><code${langClass}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
    return { parts, inCodeBlock: false, codeBuffer: [], codeLanguage: "", inList };
  }
  if (inList) {
    parts.push("</ul>");
  }
  return {
    parts,
    inCodeBlock: true,
    codeBuffer: [],
    codeLanguage: line.trim().slice(3).trim(),
    inList: false,
  };
}

interface HeadingResult {
  parts: string[];
  inList: boolean;
}

function processHeading(trimmed: string, inList: boolean): HeadingResult | null {
  const headingPattern = /^(#{1,4})\s+(.+)/;
  const headingMatch = headingPattern.exec(trimmed);
  if (!headingMatch) return null;

  const parts: string[] = [];
  if (inList) {
    parts.push("</ul>");
  }
  const level = headingMatch[1].length;
  const text = headingMatch[2];
  const versionPattern = /^\[[\d.]+\]/;
  const extraClass = versionPattern.test(text) ? ' class="changelog-version"' : "";
  parts.push(`<h${level}${extraClass}>${inlineFormat(text)}</h${level}>`);
  return { parts, inList: false };
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Applies inline formatting: bold, italic, inline code, links.
 * All text is escaped first to prevent XSS.
 */
function inlineFormat(text: string): string {
  let result = escapeHtml(text);

  // Inline code
  result = result.replaceAll(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  result = result.replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic
  result = result.replaceAll(/\*([^*]+)\*/g, "<em>$1</em>");

  // Links: [text](url) — only allow http(s) URLs
  result = result.replaceAll(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  return result;
}
