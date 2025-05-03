import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-deactivate-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <div class="deactivate-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="warning-icon">warning</mat-icon>
        <span>¿Estás seguro?</span>
      </h2>

      <mat-dialog-content>
        <p class="dialog-text">
          Esta acción es irreversible. Tu cuenta será desactivada permanentemente.
        </p>
        <p class="confirm-instructions">
          Escribe <strong>desactivar cuenta</strong> para confirmar:
        </p>

        <mat-form-field class="confirm-input" appearance="outline">
          <input matInput [(ngModel)]="confirmText" 
                 placeholder="Escribe aquí para confirmar">
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          Cancelar
        </button>
        <button mat-flat-button color="warn" 
                [disabled]="!canConfirm()" 
                (click)="onConfirm()">
          Desactivar cuenta
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .deactivate-dialog {
      padding: 16px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      color: #d73a49;
      font-size: 20px;
      margin: 0 0 16px 0;
    }

    .warning-icon {
      color: #d73a49;
      margin-right: 12px;
    }

    .dialog-text {
      color: #24292e;
      margin-bottom: 24px;
      font-size: 14px;
      line-height: 1.5;
    }

    .confirm-instructions {
      color: #24292e;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .confirm-instructions strong {
      color: #d73a49;
      font-weight: 600;
    }

    .confirm-input {
      width: 100%;
    }

    mat-dialog-actions {
      margin: 24px -16px -16px;
      padding: 16px;
      border-top: 1px solid #e1e4e8;
    }

    mat-dialog-actions button {
      margin-left: 8px;
    }
  `]
})
export class ConfirmDeactivateDialogComponent {
  confirmText: string = '';
  expectedText: string = 'desactivar cuenta';
  
  constructor(
    public dialogRef: MatDialogRef<ConfirmDeactivateDialogComponent>
  ) { 
    // Configurar el diálogo para evitar scrollbar
    this.dialogRef.updateSize('500px', 'auto');
    this.dialogRef.disableClose = true;
  }
  
  canConfirm(): boolean {
    return this.confirmText.toLowerCase() === this.expectedText;
  }
  
  onCancel(): void {
    this.dialogRef.close(false);
  }
  
  onConfirm(): void {
    if (this.canConfirm()) {
      this.dialogRef.close(true);
    }
  }
} 