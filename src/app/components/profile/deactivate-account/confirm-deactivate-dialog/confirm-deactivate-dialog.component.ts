import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MatDialogConfig } from '@angular/material/dialog';
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
  templateUrl: './confirm-deactivate-dialog.component.html',
  styleUrls: ['./confirm-deactivate-dialog.component.scss']
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