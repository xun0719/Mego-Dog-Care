Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create } from 'react-test-renderer';
import { PetProvider, usePet } from '../PetContext';
import {
  createPet,
  updatePet,
  deletePet,
  setPetMemorial,
  clearPetMemorial,
} from '../../services/petService';
let mockSession: object = { userId: 'account-A', pets: [] };
jest.mock('../AuthContext', () => ({ useAuth: () => ({ session: mockSession }) }));
jest.mock('../../services/petService', () => ({
  createPet: jest.fn(),
  updatePet: jest.fn(),
  deletePet: jest.fn(),
  setPetMemorial: jest.fn(),
  clearPetMemorial: jest.fn(),
}));
jest.mock('../../services/attachmentService', () => ({
  deleteAttachment: jest.fn(),
  uploadPetAvatarImage: jest.fn(),
}));
let value: ReturnType<typeof usePet>;
function Probe() {
  value = usePet();
  return null;
}

test.each(['create', 'update', 'delete', 'memorial', 'restore'])(
  'late account A %s never changes account B pets or selection',
  async (operation) => {
    mockSession = {
      userId: 'account-A',
      pets: [{ id: 'pet-A', name: 'A pet', userId: 'account-A' }],
    };
    let resolve!: (pet: unknown) => void;
    const api = {
      create: createPet,
      update: updatePet,
      delete: deletePet,
      memorial: setPetMemorial,
      restore: clearPetMemorial,
    }[operation] as jest.Mock;
    api.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    let screen!: ReturnType<typeof create>;
    await act(async () => {
      screen = create(
        <PetProvider>
          <Probe />
        </PetProvider>,
      );
    });
    let pending!: Promise<unknown>;
    await act(async () => {
      if (operation === 'create')
        pending = value.createPet({ name: 'A pet', avatarUri: '' } as never);
      else if (operation === 'update')
        pending = value.updateSelectedPet({ name: 'A edited', avatarUri: '' } as never);
      else if (operation === 'delete') pending = value.deleteSelectedPet();
      else if (operation === 'memorial')
        pending = value.memorializeSelectedPet({ passedAwayDate: '2026-10-13' } as never);
      else pending = value.restoreSelectedPet();
    });
    mockSession = {
      userId: 'account-B',
      pets: [{ id: 'pet-B', name: 'B pet', userId: 'account-B' }],
    };
    await act(async () =>
      screen.update(
        <PetProvider>
          <Probe />
        </PetProvider>,
      ),
    );
    await act(async () => {
      resolve(
        operation === 'memorial'
          ? { pet: { id: 'pet-A' }, stoppedReminderCount: 2 }
          : { id: 'pet-A', name: 'A edited' },
      );
      await pending;
    });
    expect(value.pets.map((pet) => pet.id)).toEqual(['pet-B']);
    expect(value.selectedPet!.id).toBe('pet-B');
    await act(async () => screen.unmount());
  },
);
