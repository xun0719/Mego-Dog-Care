/** Unknown/older messages must not be guessed to be AI or system-generated. */
export function responseGenerationLabel(mode?: string): string {
  if (mode === 'llm') return 'MEGO AI 回覆';
  if (mode === 'deterministic') return '系統整理（非 AI）';
  return 'MEGO 回覆';
}

export const AI_RECORD_SOURCE_HEADING = '使用你的照護紀錄';
export const AI_RECORD_SOURCE_HINT = '來自你在 MEGO 填寫的資料，不是外部文獻。';
export const AI_KNOWLEDGE_SOURCE_HEADING = '照護參考文獻';
export const AI_KNOWLEDGE_SOURCE_HINT = '外部照護資料，點選查看原文。';
export const AI_LOCAL_HISTORY_NOTICE = '對話只保存在這支手機，換機或移除 App 不會自動恢復。';
