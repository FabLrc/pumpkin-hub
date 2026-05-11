import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SWRProvider } from "./SWRProvider";

describe("SWRProvider", () => {
  it("renders children", () => {
    render(
      <SWRProvider>
        <div data-testid="child">hello</div>
      </SWRProvider>,
    );
    expect(screen.getByTestId("child")).toHaveTextContent("hello");
  });
});
