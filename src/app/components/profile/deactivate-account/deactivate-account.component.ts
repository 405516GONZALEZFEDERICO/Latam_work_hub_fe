import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { ProfileService } from '../../../services/profile/profile.service';
import { AuthService } from '../../../services/auth-service/auth.service';
import { ConfirmDeactivateDialogComponent } from './confirm-deactivate-dialog/confirm-deactivate-dialog.component';


@Component({
  selector: 'app-deactivate-account',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <div class="deactivate-account-container">
      <mat-card class="danger-zone-card">
        <mat-card-header>
          <mat-icon class="danger-icon">warning</mat-icon>
          <mat-card-title>Zona de peligro</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="warning-text">
            Esta acción es irreversible. Tu cuenta será desactivada permanentemente.
          </p>
          <mat-divider></mat-divider>
          <div class="action-section">
            <div class="action-info">
              <h3>Desactivar cuenta</h3>
              <p>Desactiva permanentemente tu acceso a la plataforma</p>
            </div>
            <button 
              mat-flat-button 
              color="warn" 
              class="action-button"
              [disabled]="isLoading"
              (click)="openDeactivateDialog()">
              <span>Desactivar cuenta</span>
              <mat-icon *ngIf="isLoading" class="loading-icon">refresh</mat-icon>
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .deactivate-account-container {
      margin: 20px auto;
      max-width: 800px;
      padding: 0 16px;
    }

    .danger-zone-card {
      border: 1px solid #ffdce0;
      border-radius: 8px;
      background-color: #fff5f5;
    }

    .danger-icon {
      color: #d73a49;
      margin-right: 16px;
      font-size: 24px;
      height: 24px;
      width: 24px;
    }

    .warning-text {
      color: #666;
      margin: 16px 0;
      line-height: 1.5;
    }

    mat-card-header {
      margin-bottom: 16px;
    }

    mat-card-title {
      color: #d73a49;
      font-size: 20px;
      font-weight: 600;
    }

    mat-divider {
      margin: 16px 0;
    }

    .action-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
    }

    .action-info h3 {
      color: #24292e;
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .action-info p {
      color: #666;
      font-size: 14px;
      margin: 0;
    }

    .action-button {
      background-color: #d73a49;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .loading-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class DeactivateAccountComponent implements OnInit {
  userId: string = '';
  isLoading: boolean = false;
  
  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) { }
  
  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUserSync();
    if (currentUser) {
      this.userId = currentUser.uid;
    }
  }
  
  openDeactivateDialog(): void {
    const dialogRef = this.dialog.open(ConfirmDeactivateDialogComponent, {
      width: '500px',
      maxHeight: '90vh',
      autoFocus: false,
      disableClose: true,
      panelClass: 'no-scroll-dialog'
    });
    
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deactivateAccount();
      }
    });
  }
  
  deactivateAccount(): void {
    if (!this.userId) {
      this.snackBar.open('No hay usuario identificado', 'Cerrar', {
        duration: 3000,
        panelClass: 'error-snackbar',
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }
    
    this.isLoading = true;
    
    this.profileService.desactivateAccount(this.userId).subscribe({
      next: (result) => {
        this.isLoading = false;
        if (result) {
          this.snackBar.open('Su cuenta ha sido desactivada correctamente', 'Cerrar', {
            duration: 5000,
            panelClass: 'success-snackbar',
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
          
          // Cerrar sesión después de desactivar la cuenta
          setTimeout(() => {
            this.authService.logout().then(() => {
              this.router.navigate(['/login']);
            });
          }, 2000);
        } else {
          this.snackBar.open('No se pudo desactivar la cuenta', 'Cerrar', {
            duration: 3000,
            panelClass: 'error-snackbar',
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open(
          `Error al desactivar la cuenta: ${error.message || 'Error desconocido'}`, 
          'Cerrar', 
          {
            duration: 5000,
            panelClass: 'error-snackbar',
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          }
        );
      }
    });
  }
} 