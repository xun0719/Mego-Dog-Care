import React from 'react';
import { SelectionChip } from './SelectionChip';

/** 既有篩選入口沿用相同 API，選取外觀由 SelectionChip 統一維護。 */
export default function FilterChip(props: React.ComponentProps<typeof SelectionChip>) {
  return <SelectionChip {...props} />;
}
