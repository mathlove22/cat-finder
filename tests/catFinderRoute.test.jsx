import { describe, expect, test } from "vitest";
import { isCatFinderRoute } from "../src/App.jsx";

describe("cat finder routing", () => {
  test.each([
    ["/"],
    ["/cat-finder"],
    ["/cat-finder/"],
  ])("opens the cat finder game for %s", (pathname) => {
    expect(isCatFinderRoute(pathname)).toBe(true);
  });

  test("keeps other paths available for the classroom app", () => {
    expect(isCatFinderRoute("/classroom")).toBe(false);
  });
});
