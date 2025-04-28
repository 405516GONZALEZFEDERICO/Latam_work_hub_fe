import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { DeactivateAccountComponent } from '../../components/profile/deactivate-account/deactivate-account.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    RouterModule,
    DeactivateAccountComponent
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  // Aquí pueden ir propiedades y métodos para la configuración
} 