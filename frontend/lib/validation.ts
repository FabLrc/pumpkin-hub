// ── Plugin Validation ──────────────────────────────────────────────────────
// Client-side validation mirroring backend rules (api/src/routes/plugins/dto.rs).

export const PLUGIN_RULES = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  SHORT_DESCRIPTION_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 50_000,
  LICENSE_MAX_LENGTH: 50,
  URL_MAX_LENGTH: 500,
  MAX_CATEGORIES: 5,
  NAME_PATTERN: /^[a-zA-Z0-9 \-_]+$/,
} as const;

export interface FieldError {
  field: string;
  message: string;
}

export function validatePluginName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < PLUGIN_RULES.NAME_MIN_LENGTH) {
    return `Name must be at least ${PLUGIN_RULES.NAME_MIN_LENGTH} characters`;
  }
  if (trimmed.length > PLUGIN_RULES.NAME_MAX_LENGTH) {
    return `Name must be at most ${PLUGIN_RULES.NAME_MAX_LENGTH} characters`;
  }
  if (!PLUGIN_RULES.NAME_PATTERN.test(trimmed)) {
    return "Name must contain only alphanumeric characters, spaces, hyphens or underscores";
  }
  return null;
}

export function validateOptionalLength(
  value: string | undefined,
  fieldLabel: string,
  maxLength: number,
): string | null {
  if (value && value.length > maxLength) {
    return `${fieldLabel} must be at most ${maxLength} characters`;
  }
  return null;
}

export function validateOptionalUrl(
  value: string | undefined,
  fieldLabel: string,
): string | null {
  if (!value) return null;
  if (value.length > PLUGIN_RULES.URL_MAX_LENGTH) {
    return `${fieldLabel} must be at most ${PLUGIN_RULES.URL_MAX_LENGTH} characters`;
  }
  if (!value.startsWith("https://") && !value.startsWith("http://")) {
    return `${fieldLabel} must start with http:// or https://`;
  }
  return null;
}

export function validateCategoryIds(ids: string[]): string | null {
  if (ids.length > PLUGIN_RULES.MAX_CATEGORIES) {
    return `You can select at most ${PLUGIN_RULES.MAX_CATEGORIES} categories`;
  }
  if (new Set(ids).size !== ids.length) {
    return "Duplicate categories are not allowed";
  }
  return null;
}

export interface PluginFormData {
  name: string;
  shortDescription: string;
  description: string;
  repositoryUrl: string;
  documentationUrl: string;
  license: string;
  categoryIds: string[];
}

export function validatePluginForm(data: PluginFormData): FieldError[] {
  const errors: FieldError[] = [];

  const nameError = validatePluginName(data.name);
  if (nameError) errors.push({ field: "name", message: nameError });

  const shortDescError = validateOptionalLength(
    data.shortDescription || undefined,
    "Short description",
    PLUGIN_RULES.SHORT_DESCRIPTION_MAX_LENGTH,
  );
  if (shortDescError)
    errors.push({ field: "shortDescription", message: shortDescError });

  const descError = validateOptionalLength(
    data.description || undefined,
    "Description",
    PLUGIN_RULES.DESCRIPTION_MAX_LENGTH,
  );
  if (descError) errors.push({ field: "description", message: descError });

  const repoError = validateOptionalUrl(
    data.repositoryUrl || undefined,
    "Repository URL",
  );
  if (repoError) errors.push({ field: "repositoryUrl", message: repoError });

  const docsError = validateOptionalUrl(
    data.documentationUrl || undefined,
    "Documentation URL",
  );
  if (docsError)
    errors.push({ field: "documentationUrl", message: docsError });

  const licenseError = validateOptionalLength(
    data.license || undefined,
    "License",
    PLUGIN_RULES.LICENSE_MAX_LENGTH,
  );
  if (licenseError) errors.push({ field: "license", message: licenseError });

  const catError = validateCategoryIds(data.categoryIds);
  if (catError) errors.push({ field: "categoryIds", message: catError });

  return errors;
}
