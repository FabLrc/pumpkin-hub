"use client";

import { useState, useCallback } from "react";
import { AlertCircle, X } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";
import { useCategories } from "@/lib/hooks";
import type { PluginFormData, FieldError } from "@/lib/validation";
import { validatePluginForm, PLUGIN_RULES } from "@/lib/validation";
import type { CategoryResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { formatMarkdown } from "@/lib/markdown";

interface PluginFormProps {
  readonly initialData?: PluginFormData;
  readonly onSubmit: (data: PluginFormData) => Promise<void>;
  readonly submitLabel: string;
  readonly isSubmitting: boolean;
}

const EMPTY_FORM: PluginFormData = {
  name: "",
  shortDescription: "",
  description: "",
  repositoryUrl: "",
  documentationUrl: "",
  license: "",
  categoryIds: [],
};

export function PluginForm({
  initialData,
  onSubmit,
  submitLabel,
  isSubmitting,
}: PluginFormProps) {
  const [form, setForm] = useState<PluginFormData>(initialData ?? EMPTY_FORM);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [descPreview, setDescPreview] = useState(false);
  const { data: categories } = useCategories();

  const fieldError = useCallback(
    (field: string) => errors.find((e) => e.field === field)?.message ?? null,
    [errors],
  );

  function updateField<K extends keyof PluginFormData>(
    field: K,
    value: PluginFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => prev.filter((e) => e.field !== field));
  }

  function toggleCategory(categoryId: string) {
    setForm((prev) => {
      const isSelected = prev.categoryIds.includes(categoryId);
      const next = isSelected
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId];
      return { ...prev, categoryIds: next };
    });
    setErrors((prev) => prev.filter((e) => e.field !== "categoryIds"));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validatePluginForm(form);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await onSubmit(form);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      const match = /"error":\s*"([^"]+)"/.exec(message);
      setServerError(match ? match[1] : message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="flex items-start gap-2 p-3 border border-error/30 bg-error/5 text-error text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Name */}
      <FormField
        label="Plugin Name"
        htmlFor="name"
        error={fieldError("name")}
        required
        hint={`${form.name.trim().length}/${PLUGIN_RULES.NAME_MAX_LENGTH} — alphanumeric, spaces, hyphens, underscores`}
      >
        <input
          id="name"
          type="text"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          required
          minLength={PLUGIN_RULES.NAME_MIN_LENGTH}
          maxLength={PLUGIN_RULES.NAME_MAX_LENGTH}
          className={inputClasses(fieldError("name"))}
          placeholder="My Awesome Plugin"
        />
      </FormField>

      {/* Short Description */}
      <FormField
        label="Short Description"
        htmlFor="shortDescription"
        error={fieldError("shortDescription")}
        hint={`${form.shortDescription.length}/${PLUGIN_RULES.SHORT_DESCRIPTION_MAX_LENGTH}`}
      >
        <input
          id="shortDescription"
          type="text"
          value={form.shortDescription}
          onChange={(e) => updateField("shortDescription", e.target.value)}
          maxLength={PLUGIN_RULES.SHORT_DESCRIPTION_MAX_LENGTH}
          className={inputClasses(fieldError("shortDescription"))}
          placeholder="A brief summary shown in search results"
        />
      </FormField>

      {/* Description with Edit/Preview toggle */}
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <label
            htmlFor="description"
            className="block font-mono text-xs text-text-muted uppercase tracking-widest"
          >
            Description
          </label>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setDescPreview(false)}
              className={`font-mono text-xs px-2.5 py-0.5 border transition-colors cursor-pointer ${
                descPreview
                  ? "border-border-default text-text-dim hover:text-text-primary"
                  : "border-accent bg-accent/10 text-accent"
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setDescPreview(true)}
              className={`font-mono text-xs px-2.5 py-0.5 border transition-colors cursor-pointer ${
                descPreview
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border-default text-text-dim hover:text-text-primary"
              }`}
            >
              Preview
            </button>
          </div>
        </div>
        {descPreview ? (
          <div
            className="md-content w-full px-3 py-2 bg-bg-surface border border-border-default min-h-[120px]"
            dangerouslySetInnerHTML={{
              __html: form.description
                ? formatMarkdown(form.description)
                : `<p class="text-text-dim">Nothing to preview yet.</p>`,
            }}
          />
        ) : (
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            maxLength={PLUGIN_RULES.DESCRIPTION_MAX_LENGTH}
            rows={8}
            className={`${inputClasses(fieldError("description"))} resize-y min-h-[120px]`}
            placeholder="Detailed description of your plugin — what it does, how to use it, configuration examples…"
          />
        )}
        {fieldError("description") && (
          <p className="mt-1 font-mono text-xs text-error flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {fieldError("description")}
          </p>
        )}
      </div>

      {/* Categories */}
      <FormField
        label="Categories"
        htmlFor="categories"
        error={fieldError("categoryIds")}
        hint={`${form.categoryIds.length}/${PLUGIN_RULES.MAX_CATEGORIES} selected`}
      >
        <CategoryPicker
          categories={categories ?? []}
          selectedIds={form.categoryIds}
          onToggle={toggleCategory}
          maxReached={form.categoryIds.length >= PLUGIN_RULES.MAX_CATEGORIES}
        />
      </FormField>

      {/* License */}
      <FormField
        label="License"
        htmlFor="license"
        error={fieldError("license")}
      >
        <input
          id="license"
          type="text"
          value={form.license}
          onChange={(e) => updateField("license", e.target.value)}
          maxLength={PLUGIN_RULES.LICENSE_MAX_LENGTH}
          className={inputClasses(fieldError("license"))}
          placeholder="MIT, GPL-3.0, Apache-2.0…"
        />
      </FormField>

      {/* Repository URL */}
      <FormField
        label="Repository URL"
        htmlFor="repositoryUrl"
        error={fieldError("repositoryUrl")}
      >
        <input
          id="repositoryUrl"
          type="url"
          value={form.repositoryUrl}
          onChange={(e) => updateField("repositoryUrl", e.target.value)}
          maxLength={PLUGIN_RULES.URL_MAX_LENGTH}
          className={inputClasses(fieldError("repositoryUrl"))}
          placeholder="https://github.com/you/your-plugin"
        />
      </FormField>

      {/* Documentation URL */}
      <FormField
        label="Documentation URL"
        htmlFor="documentationUrl"
        error={fieldError("documentationUrl")}
      >
        <input
          id="documentationUrl"
          type="url"
          value={form.documentationUrl}
          onChange={(e) => updateField("documentationUrl", e.target.value)}
          maxLength={PLUGIN_RULES.URL_MAX_LENGTH}
          className={inputClasses(fieldError("documentationUrl"))}
          placeholder="https://docs.example.com/your-plugin"
        />
      </FormField>

      {/* Submit */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Processing…" : submitLabel}
        </Button>
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
  readonly label: string;
  readonly htmlFor: string;
  readonly error: string | null;
  readonly hint?: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
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

// ── CategoryPicker ────────────────────────────────────────────────────────

function CategoryPicker({
  categories,
  selectedIds,
  onToggle,
  maxReached,
}: {
  readonly categories: CategoryResponse[];
  readonly selectedIds: string[];
  readonly onToggle: (id: string) => void;
  readonly maxReached: boolean;
}) {
  if (categories.length === 0) {
    return (
      <div className="font-mono text-xs text-text-dim py-2">
        Loading categories…
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isSelected = selectedIds.includes(cat.id);
        const isDisabled = !isSelected && maxReached;
        const Icon = getCategoryIcon(cat.icon);
        let categoryStateClasses: string;
        if (isSelected) {
          categoryStateClasses = "border-accent bg-accent/10 text-accent";
        } else if (isDisabled) {
          categoryStateClasses = "border-border-default text-text-dim opacity-50 cursor-not-allowed";
        } else {
          categoryStateClasses = "border-border-default text-text-muted hover:border-border-hover hover:text-text-primary";
        }
        return (
          <button
            key={cat.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onToggle(cat.id)}
            title={cat.description ?? undefined}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer
              border
              ${categoryStateClasses}
            `}
          >
            <Icon className="w-3 h-3" />
            {cat.name}
            {isSelected && <X className="w-3 h-3" />}
          </button>
        );
      })}
    </div>
  );
}

// ── Style Helpers ─────────────────────────────────────────────────────────

function inputClasses(error: string | null): string {
  return `w-full px-3 py-2 bg-bg-surface border ${
    error ? "border-error" : "border-border-default focus:border-accent"
  } outline-none font-mono text-sm text-text-primary placeholder:text-text-dim transition-colors`;
}
