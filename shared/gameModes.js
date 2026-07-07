export const GAME_MODES = {
  full: "full",
  minority: "minority",
};

export const GROUP_SIZE_OPTIONS = [2, 3, 4];

export function isGameMode(value) {
  return Object.values(GAME_MODES).includes(value);
}

export function isGroupSizeOption(value) {
  return GROUP_SIZE_OPTIONS.includes(value);
}
