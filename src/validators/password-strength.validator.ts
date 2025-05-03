import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // No validar valores vacíos, dejarlo para el validador 'required'
    }

    // Chequear longitud mínima de 8 caracteres
    const hasMinLength = value.length >= 8;

    // Chequear si contiene al menos un número
    const hasNumber = /\d/.test(value);

    // Chequear si contiene al menos un caracter especial
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]+/.test(value);

    const passwordValid = hasMinLength && hasNumber && hasSpecial;

    // Si no es válido, retornar un objeto de error
    if (!passwordValid) {
      return {
        passwordStrength: {
          hasMinLength: hasMinLength,
          hasNumber: hasNumber,
          hasSpecial: hasSpecial
        }
      };
    }

    // Si es válido, retornar null
    return null;
  };
} 