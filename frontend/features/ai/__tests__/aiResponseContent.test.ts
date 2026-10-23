import { responseGenerationLabel } from '../aiResponseContent';

test('generation labels distinguish LLM, deterministic rules and unknown messages', () => {
  expect(responseGenerationLabel('llm')).toBe('MEGO AI 回覆');
  expect(responseGenerationLabel('deterministic')).toBe('系統整理（非 AI）');
  expect(responseGenerationLabel()).toBe('MEGO 回覆');
  expect(responseGenerationLabel('unknown')).toBe('MEGO 回覆');
});
