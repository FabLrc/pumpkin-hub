import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DownloadChart, GranularitySelector } from "./DownloadChart";

describe("DownloadChart", () => {
  it("renders bars and labels for daily data", () => {
    render(
      <DownloadChart
        granularity="daily"
        data={[
          { period: "2026-03-10", downloads: 10 },
          { period: "2026-03-11", downloads: 40 },
          { period: "2026-03-12", downloads: 100 },
        ]}
      />,
    );

    expect(screen.getByText("Mar 10")).toBeInTheDocument();
    expect(screen.getByText("Mar 11")).toBeInTheDocument();
    expect(screen.getByText("Mar 12")).toBeInTheDocument();
  });

  it("renders compact labels for weekly and monthly", () => {
    const { rerender } = render(
      <DownloadChart
        granularity="weekly"
        data={[{ period: "2026-W10", downloads: 7 }]}
      />,
    );
    expect(screen.getByText("W10")).toBeInTheDocument();

    rerender(
      <DownloadChart
        granularity="monthly"
        data={[{ period: "2026-03", downloads: 7000 }]}
      />,
    );

    expect(screen.getByText("Mar")).toBeInTheDocument();
  });

  it("shows only alternating labels when data set is large", () => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      period: `2026-03-${String(i + 1).padStart(2, "0")}`,
      downloads: i + 1,
    }));

    render(<DownloadChart granularity="daily" data={data} />);

    expect(screen.getByText("Mar 1")).toBeInTheDocument();
    expect(screen.queryByText("Mar 2")).not.toBeInTheDocument();
    expect(screen.getByText("Mar 3")).toBeInTheDocument();
  });
});

describe("GranularitySelector", () => {
  it("renders all options and triggers onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<GranularitySelector value="weekly" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Daily" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weekly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Monthly" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Monthly" }));
    expect(onChange).toHaveBeenCalledWith("monthly");
  });
});
