import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RaceChart } from "./RaceChart";
import type { RaceMetric } from "./RaceChart";

const mockMetrics: RaceMetric[] = [
  {
    metric: "Startup Time",
    unit: "ms",
    lanes: [
      { label: "Pumpkin", display: "12ms", raw: 12, best: true },
      { label: "Paper", display: "48ms", raw: 48 },
    ],
  },
  {
    metric: "Memory Usage",
    unit: "MB",
    lanes: [
      { label: "Pumpkin", display: "24MB", raw: 24, best: true },
      { label: "Paper", display: "96MB", raw: 96 },
    ],
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RaceChart", () => {
  it("renders all metric blocks", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<RaceChart metrics={mockMetrics} />);
    expect(screen.getByText("Startup Time")).toBeInTheDocument();
    expect(screen.getByText("Memory Usage")).toBeInTheDocument();
  });

  it("renders 'lower is better' label", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<RaceChart metrics={mockMetrics} />);
    const labels = screen.getAllByText("// lower is better");
    expect(labels).toHaveLength(2);
  });

  it("renders lane labels and display values", () => {
    render(<RaceChart metrics={mockMetrics} />);
    expect(screen.getAllByText("Pumpkin")).toHaveLength(2);
    expect(screen.getAllByText("Paper")).toHaveLength(2);
    expect(screen.getAllByText("12ms")).toHaveLength(1);
    expect(screen.getAllByText("48ms")).toHaveLength(1);
  });

  it("marks best lane with badge", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<RaceChart metrics={mockMetrics} />);
    const badges = screen.getAllByText("best");
    expect(badges).toHaveLength(2);
  });

  it("renders empty metrics gracefully", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<RaceChart metrics={[]} />);
    expect(container.querySelector(".grid")).toBeInTheDocument();
  });

  it("handles maxRaw=0 without division issue", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const zeroMetrics: RaceMetric[] = [
      {
        metric: "Zero",
        unit: "x",
        lanes: [
          { label: "A", display: "0", raw: 0 },
          { label: "B", display: "0", raw: 0 },
        ],
      },
    ];
    render(<RaceChart metrics={zeroMetrics} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});
