import { useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
export function useFormPet(petId?: string) {
  const { session } = useAuth();
  const { selectedPet, pets } = usePet();
  const identity = useRef({
    userId: session?.userId,
    petId: petId ?? selectedPet?.id,
    pet: selectedPet,
  });
  if (identity.current.userId !== session?.userId) return null;
  return (
    (pets ? pets.find((pet) => pet.id === identity.current.petId) : identity.current.pet) ?? null
  );
}
