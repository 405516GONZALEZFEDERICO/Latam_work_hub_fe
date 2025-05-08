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
      display: block; 
      padding: 24px; 
    }
    h2[mat-dialog-title] {
      margin-bottom: 20px; 
      font-size: 1.25rem; 
    }
    mat-dialog-content {
      padding: 0; 
      margin-bottom: 24px; 
      overflow-wrap: break-word; 
    }
    mat-dialog-content p {
      margin: 0; 
      line-height: 1.6;
    }
    mat-dialog-actions {
      padding: 0; 
      justify-content: flex-end; 
      gap: 8px; 
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
      confirmText?: string;  
      cancelText?: string;  
    }
  ) {}

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }
} 