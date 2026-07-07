export const DEFAULT_MODEL_ID = "openai/gpt-5.4-mini";

export const CUSTOM_MODEL_VALUE = "__custom__";

export const MODEL_OPTIONS = [
  {
    id: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    description: "기본 추천",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    description: "최고 품질",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    description: "역할 유지",
  },
  {
    id: "google/gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    description: "빠른 응답",
  },
  {
    id: "google/gemini-3-flash-preview",
    label: "Gemini 3 Flash Preview",
    description: "빠른 실험",
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B",
    description: "저비용 비교",
  },
];

export function isPresetModel(modelId) {
  return MODEL_OPTIONS.some((option) => option.id === modelId);
}
