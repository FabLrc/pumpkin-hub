"use client";

import { useState, useCallback } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import type { VersionFormData, FieldError } from "@/lib/validation";
import { validateVersionForm, VERSION_RULES } from "@/lib/validation";
import { usePumpkinVersions } from "@/lib/hooks";

interface VersionFormProps {
  onSubmit: (data: VersionFormData) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

const EMPTY_FORM: VersionFormData = {
  version: "",
  changelog: "",
  pumpkinVersionMin: "",
  pumpkinVersionMax: "",
};

export function VersionForm({
  onSubmit,
  isSubmitting,
  onCancel,
}: VersionFormProps) {
  const [form, setForm] = useState<VersionFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: pumpkinVersions, isLoading: versionsLoading } = usePumpkinVersions();

  const fieldError = useCallback(
    (field: string) => errors.find((e) => e.field === field)?.message ?? null,
    [errors],
  );

  function updateField<K extends keyof VersionFormData>(
    field: K,
    value: VersionFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => prev.filter((e) => e.field !== field));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateVersionForm(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await onSubmit(form);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      const match = message.match(/"error":\s*"([^"]+)"/);
      setServerError(match ? match[1] : message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="flex items-start gap-2 p-3 border border-error/30 bg-error/5 text-error text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Version */}
      <FormField
        label="Version"
        htmlFor="version"
        error={fieldError("version")}
        required
        hint="Semantic version (e.g. 1.0.0)"
      >
        <input
          id="version"
          type="text"
          value={form.version}
          onChange={(e) => updateField("version", e.target.value)}
          required
          maxLength={VERSION_RULES.VERSION_MAX_LENGTH}
          className={inputClasses(fieldError("version"))}
          placeholder="1.0.0"
        />
      </FormField>

      {/* Pumpkin compatibility range */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Pumpkin Version Min"
          htmlFor="pumpkinVersionMin"
          error={fieldError("pumpkinVersionMin")}
          hint="Optional"
        >
          <div className="relative">
            <select
              id="pumpkinVersionMin"
              aria-label="Pumpkin Version Min"
              value={form.pumpkinVersionMin}
              onChange={(e) => updateField("pumpkinVersionMin", e.target.value)}
              disabled={versionsLoading}
              className={`${inputClasses(fieldError("pumpkinVersionMin"))} pr-8 cursor-pointer appearance-none`}
            >
              <option value="">— Any —</option>
              {pumpkinVersions?.map((v) => (
                <option key={v.version} value={v.version}>
                  {v.version}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
          </div>
        </FormField>

        <FormField
          label="Pumpkin Version Max"
          htmlFor="pumpkinVersionMax"
          error={fieldError("pumpkinVersionMax")}
          hint="Optional"
        >
          <div className="relative">
            <select
              id="pumpkinVersionMax"
              aria-label="Pumpkin Version Max"
              value={form.pumpkinVersionMax}
              onChange={(e) => updateField("pumpkinVersionMax", e.target.value)}
              disabled={versionsLoading}
              className={`${inputClasses(fieldError("pumpkinVersionMax"))} pr-8 cursor-pointer appearance-none`}
            >
              <option value="">— Any —</option>
              {pumpkinVersions?.map((v) => (
                <option key={v.version} value={v.version}>
                  {v.version}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
          </div>
        </FormField>
      </div>

      {/* Changelog */}
      <FormField
        label="Changelog"
        htmlFor="changelog"
        error={fieldError("changelog")}
        hint="Markdown supported"
      >
        <textarea
          id="changelog"
          value={form.changelog}
          onChange={(e) => updateField("changelog", e.target.value)}
          maxLength={VERSION_RULES.CHANGELOG_MAX_LENGTH}
          rows={6}
          className={`${inputClasses(fieldError("changelog"))} resize-y min-h-[100px]`}
          placeholder="## What's new&#10;- Added feature X&#10;- Fixed bug Y"
        />
      </FormField>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 bg-accent hover:bg-accent-dark text-black font-mono text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? "Publishing…" : "Publish Version"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="font-mono text-xs border border-border-default text-text-dim hover:text-text-primary px-4 py-2 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── FormField ─────────────────────────────────────────────────────────────

function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error: string | null;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label
          htmlFor={htmlFor}
          className="block font-mono text-xs text-text-muted uppercase tracking-widest"
        >
          {label}
          {required && <span className="text-accent ml-1">*</span>}
        </label>
        {hint && (
          <span className="font-mono text-xs text-text-muted">{hint}</span>
        )}
      </div>
      {children}
      {error && (
        <p className="mt-1 font-mono text-xs text-error flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Style Helpers ─────────────────────────────────────────────────────────

function inputClasses(error: string | null): string {
  return `w-full px-3 py-2 bg-bg-surface border ${
    error ? "border-error" : "border-border-default focus:border-accent"
  } outline-none font-mono text-sm text-text-primary placeholder:text-text-dim transition-colors`;
}
