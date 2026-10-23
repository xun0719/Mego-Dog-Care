Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import PetFormTextField from '../components/PetFormTextField';
import { PET_FORM_FIELDS, petNameLength, limitPetName } from '../petFormContent';
jest.mock('react-native', () => ({
  Text: 'Text',
  TextInput: 'Input',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('../../../components/DatePickerField', () => 'DatePicker');
jest.mock('../../../components/SupplementalNotesField', () => 'Notes');
let screen: ReactTestRenderer;
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test.each(['犬'.repeat(20), 'A'.repeat(20), '🐶'.repeat(20), '犬🐶'.repeat(10)])(
  'retains twenty Unicode characters: %s',
  (name) => {
    expect(petNameLength(name)).toBe(20);
    expect(limitPetName(name)).toBe(name);
  },
);
test.each(['犬'.repeat(21), 'A'.repeat(21), '🐶'.repeat(21)])(
  'limits twenty-one characters without splitting surrogate pairs: %s',
  (name) => {
    expect(petNameLength(limitPetName(name))).toBe(20);
    expect(limitPetName(name)).toBe(Array.from(name).slice(0, 20).join(''));
  },
);
test('name input applies Unicode limit and displays the actual character count', async () => {
  const onChange = jest.fn();
  await act(async () => {
    screen = create(
      <PetFormTextField field={PET_FORM_FIELDS[0]} value={'🐶'.repeat(12)} onChange={onChange} />,
    );
  });
  const input = screen.root.findByType('Input' as never);
  expect(input.props.maxLength).toBe(40);
  await act(async () => input.props.onChangeText('🐶'.repeat(21)));
  expect(onChange).toHaveBeenCalledWith('🐶'.repeat(20));
  expect(
    screen.root
      .findAllByType('Text' as never)
      .map((x) => x.props.children.flat?.().join('') || x.props.children),
  ).toContain('12/20');
});
