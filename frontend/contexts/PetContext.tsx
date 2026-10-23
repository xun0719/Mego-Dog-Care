/** 用途：集中管理毛孩清單、目前選取毛孩與重新整理狀態。 */
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from './AuthContext';
import * as petService from '../services/petService';
import { deleteAttachment, uploadPetAvatarImage } from '../services/attachmentService';
import { Pet, PetFormData, PetMemorialData } from '../types';

/** 預設選取還在照顧中的毛孩；全部都在回憶中時才選第一隻。 */
const defaultPetId = (pets: Pet[]) => (pets.find((pet) => !pet.memorial) ?? pets[0])?.id ?? null;

interface PetContextValue {
  pets: Pet[];
  selectedPet: Pet | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  selectPet: (petId: string) => void;
  refreshPets: () => Promise<void>;
  createPet: (data: PetFormData) => Promise<Pet>;
  updateSelectedPet: (data: PetFormData, petId?: string) => Promise<void>;
  deleteSelectedPet: () => Promise<void>;
  /** 回傳被停止的提醒數量。 */
  memorializeSelectedPet: (data: PetMemorialData, petId?: string) => Promise<number>;
  restoreSelectedPet: (petId?: string) => Promise<void>;
}

const PetContext = createContext<PetContextValue | undefined>(undefined);

export function PetProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [pets, setPets] = useState<Pet[]>(session?.pets ?? []);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(
    defaultPetId(session?.pets ?? []),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [petsOwner, setPetsOwner] = useState(session);
  const visiblePets = useMemo(
    () => (petsOwner === session ? pets : (session?.pets ?? [])),
    [petsOwner, session, pets],
  );
  const loadRequestId = useRef(0);
  const owner = useRef({ session, generation: 0 });
  if (owner.current.session !== session)
    owner.current = { session, generation: owner.current.generation + 1 };
  const captureOwner = useCallback(() => {
    const captured = owner.current;
    return () => owner.current === captured && captured.session?.userId === session?.userId;
  }, [session]);

  useEffect(() => {
    // Invalidate refreshes before replacing one account's pet list with another's.
    loadRequestId.current += 1;
    const nextPets = session?.pets ?? [];
    setPetsOwner(session);
    setPets(nextPets);
    setSelectedPetId(defaultPetId(nextPets));
    setIsLoading(false);
    setIsRefreshing(false);
    setError(null);
  }, [session]);

  const loadPets = useCallback(
    async (refreshing = false) => {
      if (!session?.userId) return;
      const requestId = ++loadRequestId.current;
      const userId = session.userId;
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      try {
        const result = await petService.listPets(userId);
        if (requestId !== loadRequestId.current) return;
        setPets(result);
        setSelectedPetId((current) =>
          result.some((pet) => pet.id === current) ? current : defaultPetId(result),
        );
      } catch (requestError) {
        if (requestId === loadRequestId.current)
          setError((requestError as Error).message || '無法載入毛孩資料');
      } finally {
        if (requestId === loadRequestId.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [session?.userId],
  );

  const selectedPet =
    visiblePets.find(
      (pet) => pet.id === (petsOwner === session ? selectedPetId : defaultPetId(visiblePets)),
    ) ??
    visiblePets[0] ??
    null;

  const value = useMemo<PetContextValue>(
    () => ({
      pets: visiblePets,
      selectedPet,
      isLoading,
      isRefreshing,
      error,
      selectPet: setSelectedPetId,
      refreshPets: () => loadPets(true),
      createPet: async (data) => {
        if (!session?.userId) throw new Error('找不到登入使用者');
        const isCurrent = captureOwner();
        let pet = await petService.createPet(session.userId, {
          ...data,
          avatarUri: '',
          avatarAttachmentId: undefined,
        });
        if (data.avatarUri && isCurrent()) {
          try {
            const avatar = await uploadPetAvatarImage(session.userId, pet.id, data.avatarUri);
            pet = await petService.updatePet(session.userId, pet.id, {
              ...data,
              avatarUri: '',
              avatarAttachmentId: avatar.id,
            });
          } catch (error) {
            if (isCurrent())
              await petService.deletePet(session.userId, pet.id).catch(() => undefined);
            throw new Error(`毛孩照片上傳失敗，尚未完成新增：${(error as Error).message}`);
          }
        }
        if (isCurrent()) {
          setPets((current) => [...current, pet]);
          setSelectedPetId(pet.id);
        }
        return pet;
      },
      updateSelectedPet: async (data, petId) => {
        const targetPet = petId ? pets.find((pet) => pet.id === petId) : selectedPet;
        if (!session?.userId || !targetPet) return;
        const isCurrent = captureOwner();
        let avatarAttachmentId = data.avatarAttachmentId;
        let uploadedAvatar: Awaited<ReturnType<typeof uploadPetAvatarImage>> | null = null;
        if (data.avatarUri && isCurrent()) {
          uploadedAvatar = await uploadPetAvatarImage(session.userId, targetPet.id, data.avatarUri);
          avatarAttachmentId = uploadedAvatar.id;
        }
        let updated: Pet;
        try {
          updated = await petService.updatePet(session.userId, targetPet.id, {
            ...data,
            avatarUri: '',
            avatarAttachmentId,
          });
        } catch (error) {
          if (uploadedAvatar)
            await deleteAttachment(session.userId, uploadedAvatar).catch(() => undefined);
          throw error;
        }
        if (isCurrent())
          setPets((current) => current.map((pet) => (pet.id === updated.id ? updated : pet)));
      },
      memorializeSelectedPet: async (data, petId) => {
        const targetPet = petId ? pets.find((pet) => pet.id === petId) : selectedPet;
        if (!session?.userId || !targetPet) return 0;
        const isCurrent = captureOwner();
        const { pet, stoppedReminderCount } = await petService.setPetMemorial(
          session.userId,
          targetPet.id,
          data,
        );
        if (isCurrent())
          setPets((current) => current.map((item) => (item.id === pet.id ? pet : item)));
        return stoppedReminderCount;
      },
      restoreSelectedPet: async (petId) => {
        const targetPet = petId ? pets.find((pet) => pet.id === petId) : selectedPet;
        if (!session?.userId || !targetPet) return;
        const isCurrent = captureOwner();
        const pet = await petService.clearPetMemorial(session.userId, targetPet.id);
        if (isCurrent())
          setPets((current) => current.map((item) => (item.id === pet.id ? pet : item)));
      },
      deleteSelectedPet: async () => {
        if (!session?.userId || !selectedPet) return;
        const isCurrent = captureOwner();
        await petService.deletePet(session.userId, selectedPet.id);
        if (isCurrent()) {
          setPets((current) => current.filter((pet) => pet.id !== selectedPet.id));
          setSelectedPetId(null);
        }
      },
    }),
    [
      pets,
      visiblePets,
      selectedPet,
      isLoading,
      isRefreshing,
      error,
      session?.userId,
      loadPets,
      captureOwner,
    ],
  );

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

export function usePet() {
  const context = useContext(PetContext);
  if (!context) throw new Error('usePet 必須在 PetProvider 內使用');
  return context;
}
