import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RatingOverview } from "./RatingOverview";
import type { RatingDistribution } from "@/lib/types";

const distribution: RatingDistribution = {
  star_5: 10,
  star_4: 5,
  star_3: 3,
  star_2: 1,
  star_1: 1,
};

describe("RatingOverview", () => {
  it("renders average rating when reviews exist", () => {
    render(
      <RatingOverview averageRating={4.2} total={20} distribution={distribution} />,
    );
    expect(screen.getByText("4.2")).toBeInTheDocument();
    expect(screen.getByText("20 reviews")).toBeInTheDocument();
  });

  it("renders em dash when there are no reviews", () => {
    const emptyDistribution: RatingDistribution = {
      star_5: 0,
      star_4: 0,
      star_3: 0,
      star_2: 0,
      star_1: 0,
    };
    render(
      <RatingOverview averageRating={0} total={0} distribution={emptyDistribution} />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("0 reviews")).toBeInTheDocument();
  });

  it("renders singular 'review' when total is 1", () => {
    render(
      <RatingOverview averageRating={5.0} total={1} distribution={{ ...distribution, star_5: 1 }} />,
    );
    expect(screen.getByText("1 review")).toBeInTheDocument();
  });

  it("renders distribution bar labels", () => {
    render(
      <RatingOverview averageRating={4.0} total={20} distribution={distribution} />,
    );
    // Bar labels 5 down to 1
    ["5", "4", "3", "2", "1"].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
  });
});
