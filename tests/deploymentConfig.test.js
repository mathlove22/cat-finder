import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("deployment config", () => {
  test("uses relative build assets for GitHub Pages", () => {
    const viteConfig = readFileSync("vite.config.js", "utf8");

    expect(viteConfig).toContain('base: "./"');
  });

  test("deploys the built game to GitHub Pages", () => {
    const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");

    expect(workflow).toContain("actions/configure-pages@v5");
    expect(workflow).toContain("actions/upload-pages-artifact@v3");
    expect(workflow).toContain("actions/deploy-pages@v4");
    expect(workflow).toContain("run: npm test");
    expect(workflow).toContain("run: npm run build");
    expect(workflow).toContain("path: ./dist");
  });
});
