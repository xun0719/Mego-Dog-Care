import type { PetData } from '../types';

export const toPetFormData = (data: PetData) => ({
  name: data.name,
  gender: data.gender,
  breed: data.breed,
  breedType: data.breedType,
  birthDate: data.birthday,
  adoptionDate: data.arrivalDate,
  avatarUri: data.avatarUri,
  avatarAttachmentId: data.avatarAttachmentId,
  neutered: data.neutered,
  allergies: data.allergies,
  chronicDiseases: data.chronicDiseases,
  microchipNumber: data.microchipNumber,
  coatColor: data.coatColor,
  distinctiveFeatures: data.distinctiveFeatures,
});
