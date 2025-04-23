import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-amenity-item',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './amenity-item.component.html',
  styles: [`
    .amenity-item {
      border-radius: 8px;
      background-color: #f9f9f9;
      padding: 15px;
      margin-bottom: 15px;
      border: 1px solid #e0e0e0;
    }
    .amenity-item-content {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .amenity-name {
      flex-grow: 1;
    }
    .amenity-price {
      width: 150px;
    }
    .amenity-actions {
      display: flex;
      align-items: center;
    }
    .mat-form-field-wrapper {
      margin-bottom: 0;
    }
    @media (max-width: 768px) {
      .amenity-item-content {
        flex-direction: column;
        align-items: stretch;
      }
      .amenity-price {
        width: 100%;
      }
      .amenity-actions {
        align-self: flex-end;
      }
    }
  `]
})
export class AmenityItemComponent {
  @Input() amenityForm!: FormGroup;
  @Output() remove = new EventEmitter<void>();

  onRemove(): void {
    this.remove.emit();
  }
}