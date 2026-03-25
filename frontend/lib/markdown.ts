/**
 * Minimal Markdown → HTML converter used for plugin descriptions and changelogs.
 * Handles: headings (h2/h3), paragraphs, unordered lists, code blocks, inline code.
 * All output is XSS-safe via escapeHtml.
 */

export function formatMarkdown(raw: string): string {
  const lines = raw.split("\n");
  const htmlParts: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        htmlParts.push(`<pre>${escapeHtml(codeBuffer.join("\n"))}</pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (trimmed === "") continue;

    if (trimmed.startsWith("### ")) {
      htmlParts.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      htmlParts.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      htmlParts.push(`<ul><li>${inlineFormat(trimmed.slice(2))}</li></ul>`);
      continue;
    }

    htmlParts.push(`<p>${inlineFormat(trimmed)}</p>`);
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    htmlParts.push(`<pre>${escapeHtml(codeBuffer.join("\n"))}</pre>`);
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

function inlineFormat(text: string): string {
  return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
}
