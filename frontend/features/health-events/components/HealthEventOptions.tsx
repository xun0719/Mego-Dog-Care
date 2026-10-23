import React from 'react';
import { SelectionChip, SelectionGroup } from '../../../components/SelectionChip';

export function HealthEventOptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: Array<[T, string]>;
  value?: T;
  onChange: (value: T) => void;
}) {
  return (
    <SelectionGroup label={label}>
      {options.map(([key, label]) => (
        <HealthEventToggle
          key={key}
          text={label}
          active={value === key}
          multiple={false}
          onPress={() => onChange(key)}
        />
      ))}
    </SelectionGroup>
  );
}

export function HealthEventOptionsWrap({ children }: { children: React.ReactNode }) {
  return <SelectionGroup multiple>{children}</SelectionGroup>;
}

export function HealthEventToggle({
  text,
  active,
  onPress,
  multiple = true,
}: {
  text: string;
  active: boolean;
  onPress: () => void;
  multiple?: boolean;
}) {
  return (
    <SelectionChip
      size="form"
      multiple={multiple}
      label={text}
      selected={active}
      onPress={onPress}
    />
  );
}
