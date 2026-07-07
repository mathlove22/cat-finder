import { describe, expect, test } from "vitest";
import {
  CAT_TARGETS,
  INITIAL_LIVES,
  createInitialCatFinderState,
  resolveCatFinderClick,
} from "../src/catFinderGame.js";

describe("cat finder game rules", () => {
  test("keeps answer markers centered on the visible cats in the puzzle image", () => {
    expect(CAT_TARGETS).toEqual([
      expect.objectContaining({ id: "calico", x: 13.4, y: 73.0 }),
      expect.objectContaining({ id: "black", x: 28.2, y: 60.1 }),
      expect.objectContaining({ id: "gray-tabby", x: 73.7, y: 58.9 }),
      expect.objectContaining({ id: "orange-tabby", x: 53.1, y: 71.5 }),
    ]);
  });

  test("counts a cat click once and adds an O marker", () => {
    const state = createInitialCatFinderState();
    const target = CAT_TARGETS[0];

    const next = resolveCatFinderClick(state, { x: target.x, y: target.y });

    expect(next.foundTargetIds).toEqual([target.id]);
    expect(next.lives).toBe(INITIAL_LIVES);
    expect(next.status).toBe("playing");
    expect(next.markers).toMatchObject([{ kind: "hit", x: target.x, y: target.y }]);
  });

  test("does not count the same cat twice", () => {
    const state = createInitialCatFinderState();
    const target = CAT_TARGETS[0];
    const first = resolveCatFinderClick(state, { x: target.x, y: target.y });

    const second = resolveCatFinderClick(first, { x: target.x + 0.4, y: target.y + 0.4 });

    expect(second.foundTargetIds).toEqual([target.id]);
    expect(second.lives).toBe(INITIAL_LIVES);
    expect(second.markers).toHaveLength(1);
  });

  test("wrong clicks add an X marker and remove one life", () => {
    const state = createInitialCatFinderState();

    const next = resolveCatFinderClick(state, { x: 50, y: 50 });

    expect(next.foundTargetIds).toEqual([]);
    expect(next.lives).toBe(INITIAL_LIVES - 1);
    expect(next.status).toBe("playing");
    expect(next.markers).toMatchObject([{ kind: "miss", x: 50, y: 50 }]);
  });

  test("uses forgiving cat target zones for touch screens", () => {
    const state = createInitialCatFinderState();
    const target = CAT_TARGETS[0];

    const next = resolveCatFinderClick(state, { x: target.x + 4.2, y: target.y });

    expect(target.radius).toBeGreaterThanOrEqual(4.5);
    expect(next.foundTargetIds).toEqual([target.id]);
    expect(next.lives).toBe(INITIAL_LIVES);
  });

  test("finding all cats wins the game", () => {
    const state = CAT_TARGETS.reduce(
      (current, target) => resolveCatFinderClick(current, { x: target.x, y: target.y }),
      createInitialCatFinderState(),
    );

    expect(state.foundTargetIds).toHaveLength(CAT_TARGETS.length);
    expect(state.status).toBe("won");
    expect(state.lives).toBe(INITIAL_LIVES);
  });

  test("running out of lives loses the game and locks further clicks", () => {
    let state = createInitialCatFinderState();

    state = resolveCatFinderClick(state, { x: 50, y: 50 });
    state = resolveCatFinderClick(state, { x: 51, y: 50 });
    state = resolveCatFinderClick(state, { x: 52, y: 50 });

    const afterLoss = resolveCatFinderClick(state, {
      x: CAT_TARGETS[0].x,
      y: CAT_TARGETS[0].y,
    });

    expect(state.status).toBe("lost");
    expect(state.lives).toBe(0);
    expect(afterLoss).toBe(state);
  });
});
