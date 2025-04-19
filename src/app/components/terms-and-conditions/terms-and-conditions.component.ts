import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-terms-and-conditions',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    MatButtonModule, 
    MatIconModule, 
    MatCardModule, 
    MatDividerModule
  ],
  templateUrl: './terms-and-conditions.component.html',
  styleUrls: ['./terms-and-conditions.component.css']
})
export class TermsAndConditionsComponent {
  acceptTerms: any;
  goBack() {
    window.history.back();
  }
}
