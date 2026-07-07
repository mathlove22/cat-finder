export const INITIAL_LIVES = 3;

export const CAT_TARGETS = [
  { id: "calico", label: "Calico cat", x: 13.4, y: 73.0, radius: 4.8 },
  { id: "black", label: "Black cat", x: 28.2, y: 60.1, radius: 4.8 },
  { id: "gray-tabby", label: "Gray tabby cat", x: 73.7, y: 58.9, radius: 4.8 },
  { id: "orange-tabby", label: "Orange tabby cat", x: 53.1, y: 71.5, radius: 4.8 },
];

export function createInitialCatFinderState() {
  return {
    foundTargetIds: [],
    lives: INITIAL_LIVES,
    markers: [],
    status: "playing",
  };
}

export function resolveCatFinderClick(state, point) {
  if (state.status !== "playing") {
    return state;
  }

  const target = findTarget(point);
  if (target) {
    if (state.foundTargetIds.includes(target.id)) {
      return state;
    }

    const foundTargetIds = [...state.foundTargetIds, target.id];
    return {
      ...state,
      foundTargetIds,
      markers: [...state.markers, createMarker("hit", point)],
      status: foundTargetIds.length === CAT_TARGETS.length ? "won" : "playing",
    };
  }

  const lives = Math.max(0, state.lives - 1);
  return {
    ...state,
    lives,
    markers: [...state.markers, createMarker("miss", point)],
    status: lives === 0 ? "lost" : "playing",
  };
}

function findTarget(point) {
  return CAT_TARGETS.find((target) => {
    const distance = Math.hypot(point.x - target.x, point.y - target.y);
    return distance <= target.radius;
  });
}

function createMarker(kind, point) {
  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    x: point.x,
    y: point.y,
  };
}
