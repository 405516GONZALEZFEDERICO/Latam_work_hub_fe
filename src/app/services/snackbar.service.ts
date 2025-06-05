import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {

  constructor(private snackBar: MatSnackBar) {}

  showSuccess(message: string, duration: number = 3000): void {
    this.snackBar.open(message, '', {
      duration: duration,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  showError(message: string, duration: number = 3000): void {
    this.snackBar.open(message, '', {
      duration: duration,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  showWarning(message: string, duration: number = 3000): void {
    this.snackBar.open(message, '', {
      duration: duration,
      panelClass: ['warning-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  showInfo(message: string, duration: number = 3000): void {
    this.snackBar.open(message, '', {
      duration: duration,
      panelClass: ['info-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  // Método genérico para casos especiales
  show(message: string, config?: MatSnackBarConfig): void {
    const defaultConfig: MatSnackBarConfig = {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    };
    
    this.snackBar.open(message, '', { ...defaultConfig, ...config });
  }
} 