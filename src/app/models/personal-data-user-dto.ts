/**
 * DTO para los datos personales del usuario que se envían/reciben de la API
 */
export interface PersonalDataUserDto {
  id?: number;
  uid?: string;
  fullName: string;
  email: string;
  birthDate?: string;
  documentType?: string;
  documentNumber?: string;
  jobTitle?: string;
  department?: string;
  photoUrl?: string;
  userId?: number;
  name?: string;
  address?: any;
} 