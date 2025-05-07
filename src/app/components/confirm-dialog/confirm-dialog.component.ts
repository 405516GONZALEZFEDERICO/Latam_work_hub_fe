import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <h2 mat-dialog-title>{{data.title}}</h2>
    <mat-dialog-content>
      <p>{{data.message}}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onNoClick()">{{ data.cancelText || 'Cancelar' }}</button>
      <button mat-raised-button color="warn" (click)="onYesClick()">{{ data.confirmText || 'Confirmar' }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block; /* Needed for padding to apply correctly to the host element */
      padding: 24px; /* Add padding to the dialog container itself */
    }
    h2[mat-dialog-title] {
      margin-bottom: 20px; /* Add space below the title */
      font-size: 1.25rem; /* Slightly larger title */
    }
    mat-dialog-content {
      padding: 0; /* Remove default padding if any, we control it on :host or p */
      margin-bottom: 24px; /* Space before actions */
      overflow-wrap: break-word; /* Help prevent overflow from long words */
    }
    mat-dialog-content p {
      margin: 0; /* Remove default paragraph margins */
      line-height: 1.6; /* Improve readability */
    }
    mat-dialog-actions {
      padding: 0; /* Remove default padding, we control spacing with justify/gap */
      justify-content: flex-end; /* Ensure buttons are at the end */
      gap: 8px; /* Add space between action buttons */
    }
  `],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
  standalone: true
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      title: string; 
      message: string; 
      confirmText?: string;  // Made optional
      cancelText?: string;   // Made optional
    }
  ) {}

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }
} 