export const SLOT_RE = /(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g;

export function parseSlots(template: string): string[] {
  const seen = new Set<string>();
  const slots: string[] = [];
  for (const m of template.matchAll(SLOT_RE)) {
    const name = m[1];
    if (name && !seen.has(name)) {
      seen.add(name);
      slots.push(name);
    }
  }
  return slots;
}
