import { describe, it, expect } from "vitest";
import {
  validatePluginName,
  validateOptionalLength,
  validateOptionalUrl,
  validateCategoryIds,
  validatePluginForm,
  PLUGIN_RULES,
} from "./validation";
import type { PluginFormData } from "./validation";

// ── validatePluginName ──────────────────────────────────────────────────────

describe("validatePluginName", () => {
  it("accepts a valid name", () => {
    expect(validatePluginName("My Plugin")).toBeNull();
  });

  it("rejects name shorter than 3 characters", () => {
    expect(validatePluginName("ab")).toContain("at least");
  });

  it("accepts exactly 3 characters", () => {
    expect(validatePluginName("abc")).toBeNull();
  });

  it("accepts exactly 100 characters", () => {
    expect(validatePluginName("a".repeat(100))).toBeNull();
  });

  it("rejects name longer than 100 characters", () => {
    expect(validatePluginName("a".repeat(101))).toContain("at most");
  });

  it("rejects special characters", () => {
    expect(validatePluginName("plugin@v1")).not.toBeNull();
  });

  it("allows spaces, hyphens, and underscores", () => {
    expect(validatePluginName("My Plugin-Name_v2")).toBeNull();
  });

  it("trims whitespace before validation", () => {
    expect(validatePluginName("  abc  ")).toBeNull();
  });
});

// ── validateOptionalLength ──────────────────────────────────────────────────

describe("validateOptionalLength", () => {
  it("returns null for undefined value", () => {
    expect(validateOptionalLength(undefined, "field", 100)).toBeNull();
  });

  it("returns null for value within limit", () => {
    expect(validateOptionalLength("short", "field", 100)).toBeNull();
  });

  it("returns error for value exceeding limit", () => {
    expect(validateOptionalLength("a".repeat(101), "Field", 100)).toContain(
      "at most 100",
    );
  });
});

// ── validateOptionalUrl ─────────────────────────────────────────────────────

describe("validateOptionalUrl", () => {
  it("returns null for undefined", () => {
    expect(validateOptionalUrl(undefined, "URL")).toBeNull();
  });

  it("accepts https URL", () => {
    expect(
      validateOptionalUrl("https://github.com/user/repo", "URL"),
    ).toBeNull();
  });

  it("accepts http URL", () => {
    expect(validateOptionalUrl("http://localhost:3000", "URL")).toBeNull();
  });

  it("rejects URL without scheme", () => {
    expect(validateOptionalUrl("example.com", "URL")).toContain("http");
  });

  it("rejects URL exceeding max length", () => {
    expect(
      validateOptionalUrl(`https://example.com/${"a".repeat(500)}`, "URL"),
    ).toContain("at most");
  });
});

// ── validateCategoryIds ─────────────────────────────────────────────────────

describe("validateCategoryIds", () => {
  it("accepts empty array", () => {
    expect(validateCategoryIds([])).toBeNull();
  });

  it("accepts up to 5 categories", () => {
    expect(validateCategoryIds(["1", "2", "3", "4", "5"])).toBeNull();
  });

  it("rejects more than 5 categories", () => {
    expect(
      validateCategoryIds(["1", "2", "3", "4", "5", "6"]),
    ).toContain("at most");
  });

  it("rejects duplicate IDs", () => {
    expect(validateCategoryIds(["1", "1"])).toContain("Duplicate");
  });
});

// ── validatePluginForm (integration of all validators) ──────────────────────

describe("validatePluginForm", () => {
  const validForm: PluginFormData = {
    name: "My Plugin",
    shortDescription: "A test plugin",
    description: "Full description here",
    repositoryUrl: "https://github.com/user/repo",
    documentationUrl: "",
    license: "MIT",
    categoryIds: [],
  };

  it("returns no errors for valid data", () => {
    expect(validatePluginForm(validForm)).toHaveLength(0);
  });

  it("returns error for invalid name", () => {
    const errors = validatePluginForm({ ...validForm, name: "ab" });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("name");
  });

  it("returns error for invalid repository URL", () => {
    const errors = validatePluginForm({
      ...validForm,
      repositoryUrl: "not-a-url",
    });
    expect(errors.some((e) => e.field === "repositoryUrl")).toBe(true);
  });

  it("returns multiple errors for multiple invalid fields", () => {
    const errors = validatePluginForm({
      ...validForm,
      name: "ab",
      repositoryUrl: "not-a-url",
      license: "x".repeat(51),
    });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it("validates category count", () => {
    const errors = validatePluginForm({
      ...validForm,
      categoryIds: ["1", "2", "3", "4", "5", "6"],
    });
    expect(errors.some((e) => e.field === "categoryIds")).toBe(true);
  });
});

// ── PLUGIN_RULES constants ──────────────────────────────────────────────────

describe("PLUGIN_RULES constants", () => {
  it("has correct boundary values matching backend", () => {
    expect(PLUGIN_RULES.NAME_MIN_LENGTH).toBe(3);
    expect(PLUGIN_RULES.NAME_MAX_LENGTH).toBe(100);
    expect(PLUGIN_RULES.SHORT_DESCRIPTION_MAX_LENGTH).toBe(255);
    expect(PLUGIN_RULES.DESCRIPTION_MAX_LENGTH).toBe(50_000);
    expect(PLUGIN_RULES.LICENSE_MAX_LENGTH).toBe(50);
    expect(PLUGIN_RULES.URL_MAX_LENGTH).toBe(500);
    expect(PLUGIN_RULES.MAX_CATEGORIES).toBe(5);
  });
});
