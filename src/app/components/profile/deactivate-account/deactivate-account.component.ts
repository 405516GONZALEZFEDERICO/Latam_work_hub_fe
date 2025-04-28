import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './deactivate-account.component.html',
  styleUrls: ['./deactivate-account.component.scss']
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