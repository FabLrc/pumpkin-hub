import { describe, it, expect } from "vitest";
import { StarRating, ReviewCard, ReviewForm, RatingOverview, ReportModal, ReviewSection } from "./index";

describe("reviews barrel exports", () => {
  it("exports all review components", () => {
    expect(StarRating).toBeDefined();
    expect(ReviewCard).toBeDefined();
    expect(ReviewForm).toBeDefined();
    expect(RatingOverview).toBeDefined();
    expect(ReportModal).toBeDefined();
    expect(ReviewSection).toBeDefined();
  });
});
