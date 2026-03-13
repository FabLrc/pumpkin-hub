import { describe, expect, it } from "vitest";
import * as layout from "./index";

describe("components/layout index", () => {
  it("re-exports Navbar and Footer", () => {
    expect(layout.Navbar).toBeDefined();
    expect(layout.Footer).toBeDefined();
  });
});
