import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-default-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Bienvenido a FlexRent</h1>
      <p class="text-gray-600">
        Tu espacio de trabajo está siendo configurado...
      </p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DefaultSectionComponent {} 