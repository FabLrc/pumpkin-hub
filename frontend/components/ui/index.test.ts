import { describe, expect, it } from "vitest";
import * as ui from "./index";

describe("components/ui index", () => {
  it("re-exports core UI building blocks", () => {
    expect(ui.Badge).toBeDefined();
    expect(ui.Button).toBeDefined();
    expect(ui.FormField).toBeDefined();
    expect(ui.Pagination).toBeDefined();
    expect(ui.PluginCard).toBeDefined();
    expect(ui.PluginIcon).toBeDefined();
  });
});
