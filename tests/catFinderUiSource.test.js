import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("cat finder UI source", () => {
  test("routes the cat finder paths to the cat finder screen", () => {
    const appSource = readFileSync("src/App.jsx", "utf8");

    expect(appSource).toContain('from "./CatFinderGame.jsx"');
    expect(appSource).toContain("isCatFinderRoute(window.location.pathname)");
    expect(appSource).toContain('normalizedPath === "/"');
    expect(appSource).toContain('normalizedPath === "/cat-finder"');
    expect(appSource).toContain("<CatFinderGame />");
  });

  test("renders the puzzle image through the game rules without answer reveal controls", () => {
    const gameSource = readFileSync("src/CatFinderGame.jsx", "utf8");

    expect(gameSource).toContain("../assets/hidden-cats-puppies-dense.webp");
    expect(gameSource).not.toContain("../assets/hidden-cats-puppies-dense.png");
    expect(gameSource).toContain("resolveCatFinderClick");
    expect(gameSource).toContain("catFinderMarker");
    expect(gameSource).not.toContain("showAnswers");
    expect(gameSource).not.toContain("catFinderAnswerMarker");
  });

  test("styles the image canvas and click feedback markers only", () => {
    const css = readFileSync("src/styles.css", "utf8");

    expect(css).toMatch(/\.catFinderCanvas\s*\{[^}]*position:\s*relative;/s);
    expect(css).toMatch(/\.catFinderMarker\.hit\s*\{[^}]*color:\s*#087443;/s);
    expect(css).toMatch(/\.catFinderMarker\.miss\s*\{[^}]*color:\s*#b42318;/s);
    expect(css).not.toContain("catFinderAnswerMarker");
    expect(css).not.toContain("answerToggle");
  });
});
