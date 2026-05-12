import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import useSWR from "swr";
import { SWRProvider } from "./SWRProvider";
import { toast } from "sonner";
import { ApiError } from "@/lib/types";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

function FetchingChild({ url }: { url: string }) {
  const { error } = useSWR(url, () => Promise.reject(new Error("Network failure")));
  return <div>{error ? "error" : "loading"}</div>;
}

describe("SWRProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children", () => {
    render(
      <SWRProvider>
        <div data-testid="child">hello</div>
      </SWRProvider>,
    );
    expect(screen.getByTestId("child")).toHaveTextContent("hello");
  });

  it("shows toast for network errors via onError handler", async () => {
    render(
      <SWRProvider>
        <FetchingChild url="/api/test" />
      </SWRProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("error")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network failure");
    });
  });

  it("does not call toast for ApiError with status < 500", async () => {
    const apiError = new ApiError(404, "Not found");
    function ChildWith404() {
      useSWR("/api/404", () => Promise.reject(apiError));
      return <div>rendered</div>;
    }
    render(
      <SWRProvider>
        <ChildWith404 />
      </SWRProvider>,
    );
    await waitFor(() => {
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
