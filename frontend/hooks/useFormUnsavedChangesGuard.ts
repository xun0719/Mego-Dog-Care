import { useCallback, useEffect, useRef, useState } from 'react';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

/** Form state only: dates serialize consistently; UI loading/expanded flags stay outside. */
function formSnapshot(value: unknown) {
  return JSON.stringify(value);
}

export function useFormUnsavedChangesGuard<T>(
  values: T,
  restore: (baseline: T) => void,
  enabled = true,
  submitting = false,
) {
  const [baseline, setBaseline] = useState(values);
  const valuesRef = useRef(values);
  const restoreRef = useRef(restore);
  valuesRef.current = values;
  restoreRef.current = restore;
  const dirty = enabled && formSnapshot(values) !== formSnapshot(baseline);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const discard = useCallback(() => restoreRef.current(baseline), [baseline]);
  useUnsavedChangesGuard(dirty, discard, submitting);

  const [continuation, setContinuation] = useState<(() => void) | null>(null);
  const markSaved = useCallback((saved?: T, proceed?: () => void) => {
    setBaseline(saved ?? valuesRef.current);
    if (proceed) setContinuation(() => proceed);
  }, []);
  // Navigation runs after the new baseline and remove guard have committed.
  useEffect(() => {
    if (!continuation) return;
    setContinuation(null);
    continuation();
  }, [continuation]);

  return { dirty, dirtyRef, markSaved };
}
