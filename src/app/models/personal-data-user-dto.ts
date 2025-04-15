/**
 * DTO para los datos personales del usuario que se envían/reciben de la API
 */
export interface PersonalDataUserDto {
  id?: number;
  fullName: string;
  email: string;
  birthDate?: Date;
  documentType?: string;
  documentNumber?: string;
  jobTitle?: string;
  department?: string;
  photoUrl?: string;
  userId?: number;
} 