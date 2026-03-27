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
      inCodeBlock = toggleCodeBlock(inCodeBlock, codeBuffer, htmlParts);
      if (!inCodeBlock) codeBuffer = [];
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (trimmed !== "") {
      htmlParts.push(formatLine(trimmed));
    }
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    htmlParts.push(`<pre>${escapeHtml(codeBuffer.join("\n"))}</pre>`);
  }

  return htmlParts.join("\n");
}

function toggleCodeBlock(
  inCodeBlock: boolean,
  codeBuffer: string[],
  htmlParts: string[],
): boolean {
  if (inCodeBlock) {
    htmlParts.push(`<pre>${escapeHtml(codeBuffer.join("\n"))}</pre>`);
    return false;
  }
  return true;
}

function formatLine(trimmed: string): string {
  if (trimmed.startsWith("### ")) {
    return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
  }
  if (trimmed.startsWith("## ")) {
    return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
  }
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    return `<ul><li>${inlineFormat(trimmed.slice(2))}</li></ul>`;
  }
  return `<p>${inlineFormat(trimmed)}</p>`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineFormat(text: string): string {
  return escapeHtml(text).replaceAll(/`([^`]+)`/g, "<code>$1</code>");
}
