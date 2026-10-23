Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create } from 'react-test-renderer';
import { Alert } from 'react-native';
import AttachmentPicker from '../AttachmentPicker';
import { deleteAttachment } from '../../services/attachmentService';
import type { Attachment } from '../../types';
jest.mock('react-native', () => ({
  ActivityIndicator: 'Busy',
  Image: 'Image',
  ScrollView: 'Scroll',
  Text: 'Text',
  TouchableOpacity: 'Button',
  View: 'View',
  StyleSheet: { create: (x: object) => x },
  Alert: { alert: jest.fn() },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../RecordActionButton', () => ({ RecordActionButton: 'Action' }));
jest.mock('../../services/api', () => ({
  getValidAccessToken: jest.fn().mockResolvedValue('token'),
}));
jest.mock('../../services/attachmentService', () => ({
  attachmentUri: () => '/image',
  deleteAttachment: jest.fn(),
  pickAndUploadAttachments: jest.fn(),
}));
test('removing an existing photo changes only the form draft, leaving discard reversible', async () => {
  const onChange = jest.fn();
  const photo = { id: 'photo1' } as Attachment;
  let screen: ReturnType<typeof create>;
  await act(async () => {
    screen = create(
      <AttachmentPicker
        userId="u1"
        petId="p1"
        sourceType="weight"
        limit={3}
        value={[photo]}
        onChange={onChange}
      />,
    );
  });
  await act(async () => {
    screen!.root.findByType('Action' as never).props.onPress();
  });
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
  await act(async () => buttons[1].onPress());
  expect(onChange).toHaveBeenCalledWith([]);
  expect(deleteAttachment).not.toHaveBeenCalled();
  expect(photo.id).toBe('photo1');
  await act(async () => screen!.unmount());
});
