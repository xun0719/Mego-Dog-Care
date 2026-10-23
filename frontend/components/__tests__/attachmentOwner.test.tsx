Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create } from 'react-test-renderer';
import AttachmentPicker from '../AttachmentPicker';
import { pickAndUploadAttachments } from '../../services/attachmentService';
jest.mock('react-native', () => ({
  ActivityIndicator: 'Busy',
  Alert: { alert: jest.fn() },
  ScrollView: 'Scroll',
  Text: 'Text',
  TouchableOpacity: 'Button',
  View: 'View',
  StyleSheet: { create: (value: object) => value },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../AuthorizedAttachmentImage', () => 'Image');
jest.mock('../RecordActionButton', () => ({ RecordActionButton: 'Action' }));
jest.mock('../../services/attachmentService', () => ({
  pickAndUploadAttachments: jest.fn(),
  uploadAttachmentAssets: jest.fn(),
}));
test('changing upload owner unlocks the new picker and ignores late old-owner results', async () => {
  let finishA!: (value: object[]) => void, finishB!: (value: object[]) => void;
  (pickAndUploadAttachments as jest.Mock)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishA = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishB = resolve;
        }),
    );
  const onChange = jest.fn();
  let screen!: ReturnType<typeof create>;
  const props = {
    userId: 'u1',
    sourceType: 'health_event' as const,
    value: [],
    limit: 3,
    onChange,
  };
  await act(async () => {
    screen = create(<AttachmentPicker {...props} petId="A" />);
  });
  const camera = () => screen.root.findAllByType('Button' as never)[0];
  let pendingA!: Promise<void>, pendingB!: Promise<void>;
  await act(async () => {
    pendingA = camera().props.onPress();
  });
  await act(async () => screen.update(<AttachmentPicker {...props} petId="B" />));
  expect(camera().props.disabled).toBe(false);
  await act(async () => {
    pendingB = camera().props.onPress();
  });
  await act(async () => {
    finishA([{ id: 'A-photo' }]);
    await pendingA;
  });
  expect(onChange).not.toHaveBeenCalled();
  expect(camera().props.disabled).toBe(true);
  await act(async () => {
    finishB([{ id: 'B-photo' }]);
    await pendingB;
  });
  expect(onChange).toHaveBeenCalledWith([{ id: 'B-photo' }]);
  expect(camera().props.disabled).toBe(false);
  await act(async () => screen.unmount());
});
