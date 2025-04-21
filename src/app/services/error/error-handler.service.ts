import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  constructor(private snackBar: MatSnackBar) {}

  isOptimisticLockingError(error: HttpErrorResponse): boolean {
    return (
      error.status === 409 ||
      (error.error && 
       typeof error.error === 'object' && 
       error.error.message && 
       (error.error.message.includes('ObjectOptimisticLockingFailureException') ||
        error.error.message.includes('StaleObjectStateException') ||
        error.error.message.includes('Row was updated or deleted by another transaction')))
    );
  }


  handleOptimisticLockingRetry(error: HttpErrorResponse, retryCount: number): Observable<number> {
    if (this.isOptimisticLockingError(error)) {
      console.log(`Reintentando operación tras error de concurrencia (intento ${retryCount})`);
      // Esperar un tiempo incremental antes de reintentar (300ms, 600ms, 900ms)
      return timer(300 * retryCount);
    }
    
    return throwError(() => error);
  }


  showErrorMessage(error: any, defaultMessage: string = 'Ha ocurrido un error'): void {
    let message = defaultMessage;
    
    if (error instanceof HttpErrorResponse) {
      if (error.error && error.error.message) {
        message = error.error.message;
      } else if (error.message) {
        message = error.message;
      } else if (error.statusText) {
        message = `Error ${error.status}: ${error.statusText}`;
      }
    } else if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['snackbar-error']
    });
  }
} 