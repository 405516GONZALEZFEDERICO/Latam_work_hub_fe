// provider-type-selection.component.ts
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service/auth.service';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environment/environment';
import { HostBinding } from '@angular/core';
import { UserRole } from '../../../models/user';

export type ProviderType = 'individual' | 'company' | null;

@Component({
  selector: 'app-provider-type-selection',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  template: `
    <div class="provider-type-container">
      <div class="header-row" *ngIf="canShowBackButton()">
        <button class="back-button" (click)="goBack()">
          <mat-icon>arrow_back_ios</mat-icon>
          Volver
        </button>
      </div>
      
      <h2 class="provider-type-title">Selecciona tu perfil</h2>
      <p class="provider-type-description">Elige el tipo de cuenta que mejor se adapte a ti</p>
      
      <div class="card-container">
        <div 
          class="card" 
          [class.selected]="selectedProviderType === 'individual'"
          (click)="selectProviderType('individual')"
        >
          <div class="card-icon">
            <mat-icon>person</mat-icon>
          </div>
          <h3>Profesional Independiente</h3>
          <p>Para freelancers y profesionales que trabajan por cuenta propia.</p>
          <div class="selection-indicator" *ngIf="selectedProviderType === 'individual'">
            <mat-icon>check_circle</mat-icon>
          </div>
        </div>
        
        <div 
          class="card" 
          [class.selected]="selectedProviderType === 'company'"
          (click)="selectProviderType('company')"
        >
          <div class="card-icon">
            <mat-icon>business</mat-icon>
          </div>
          <h3>Empresa</h3>
          <p>Para negocios, agencias y compañías que ofrecen servicios profesionales.</p>
          <div class="selection-indicator" *ngIf="selectedProviderType === 'company'">
            <mat-icon>check_circle</mat-icon>
          </div>
        </div>
      </div>
      
      <div class="button-container">
        <button 
          class="continue-button" 
          mat-raised-button 
          [disabled]="!selectedProviderType || isLoading"
          (click)="continueToNextStep()"
        >
          <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Continuar
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./provider-type-selection.component.css']
})
export class ProviderTypeSelectionComponent implements OnInit {
  @Input() initialType: ProviderType = null;
  @Input() userRole: UserRole = 'PROVEEDOR';
  @Output() typeSelected = new EventEmitter<ProviderType>();
  @Output() saved = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  
  selectedProviderType: ProviderType = null;
  isLoading = false;
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}
  
  ngOnInit(): void {
    // Si se recibe un tipo inicial, usarlo
    if (this.initialType) {
      this.selectedProviderType = this.initialType;
    }
    console.log('ProviderTypeSelectionComponent inicializado');
    console.log('Rol de usuario:', this.userRole);
    console.log('¿Tiene observadores el back?', this.back.observed);
  }
  
  selectProviderType(type: string): void {
    this.selectedProviderType = type as ProviderType;
    this.typeSelected.emit(this.selectedProviderType);
    console.log('Tipo seleccionado:', type);
  }
  
  isTypeSelected(type: string): boolean {
    return this.selectedProviderType === type;
  }
  
  continueToNextStep(): void {
    if (!this.selectedProviderType) {
      this.snackBar.open('Por favor selecciona un tipo de proveedor', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    
    // Emitir evento para notificar que el usuario quiere continuar
    this.saved.emit();
    console.log('Continuando al siguiente paso con tipo:', this.selectedProviderType);
  }
  
  canShowBackButton(): boolean {
    // No mostrar el botón de volver para PROVEEDOR, solo para otros roles que tengan observadores del evento back
    return this.back.observed === true && this.userRole !== 'PROVEEDOR';
  }
  
  goBack(): void {
    this.back.emit();
    console.log('Volviendo atrás');
  }
}