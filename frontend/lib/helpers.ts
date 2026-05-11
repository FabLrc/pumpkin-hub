/** Shared input styling classes tracking Brutalist design tokens. */
export function inputClasses(error: string | null): string {
  return `w-full px-3 py-2 bg-bg-surface border ${
    error ? "border-error" : "border-border-default focus:border-accent"
  } outline-none font-mono text-sm text-text-primary placeholder:text-text-dim transition-colors`;
}
