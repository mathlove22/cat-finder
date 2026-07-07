export function resolveTeacherTopicPreview({ settingsTopic = "", snapshotTopic = "" } = {}) {
  const localTopic = typeof settingsTopic === "string" ? settingsTopic.trim() : "";
  const savedTopic = typeof snapshotTopic === "string" ? snapshotTopic.trim() : "";
  return localTopic || savedTopic;
}
