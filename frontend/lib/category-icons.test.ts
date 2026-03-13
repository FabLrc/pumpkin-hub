import { describe, expect, it } from "vitest";
import { Tag } from "lucide-react";
import { CATEGORY_ICON_MAP, getCategoryIcon } from "./category-icons";

describe("category-icons", () => {
  it("exposes expected icon mapping keys", () => {
    expect(CATEGORY_ICON_MAP["shield"]).toBeDefined();
    expect(CATEGORY_ICON_MAP["gamepad-2"]).toBeDefined();
    expect(CATEGORY_ICON_MAP["arrow-right-left"]).toBeDefined();
  });

  it("returns mapped icon for known identifier", () => {
    const icon = getCategoryIcon("shield");
    expect(icon).toBe(CATEGORY_ICON_MAP.shield);
  });

  it("returns Tag fallback for null or unknown identifiers", () => {
    expect(getCategoryIcon(null)).toBe(Tag);
    expect(getCategoryIcon("does-not-exist")).toBe(Tag);
  });
});
