import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MaterialSelectComponent, OptionItem } from '../components/shared/material-select/material-select.component';

@Component({
  selector: 'app-material-select-example',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MaterialSelectComponent
  ],
  template: `
    <mat-card class="example-card">
      <mat-card-header>
        <mat-card-title>Ejemplo de MaterialSelect</mat-card-title>
        <mat-card-subtitle>Reemplazo para SelectButton usando Angular Material</mat-card-subtitle>
      </mat-card-header>
      
      <mat-card-content>
        <p>Selector único:</p>
        <app-material-select 
          [options]="singleOptions" 
          [multiple]="false"
          placeholder="Seleccionar opción" 
          (selectionChange)="onSingleSelectionChange($event)">
        </app-material-select>
        
        <mat-divider class="my-3"></mat-divider>
        
        <p>Selector múltiple:</p>
        <app-material-select 
          [options]="multipleOptions" 
          [multiple]="true"
          placeholder="Seleccionar opciones" 
          (selectionChange)="onMultipleSelectionChange($event)">
        </app-material-select>
        
        <div *ngIf="selectedSingle">
          <p>Opción seleccionada: {{ selectedSingle }}</p>
        </div>
        
        <div *ngIf="selectedMultiple.length">
          <p>Opciones seleccionadas: {{ selectedMultiple.join(', ') }}</p>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .example-card {
      max-width: 500px;
      margin: 20px auto;
    }
    
    .my-3 {
      margin: 15px 0;
    }
  `]
})
export class MaterialSelectExampleComponent {
  singleOptions: OptionItem[] = [
    { label: 'Opción A', selected: false, value: 'A' },
    { label: 'Opción B', selected: false, value: 'B' },
    { label: 'Opción C', selected: false, value: 'C' },
    { label: 'Opción D', selected: true, value: 'D' },
    { label: 'Opción E (deshabilitada)', selected: false, disabled: true, value: 'E' }
  ];
  
  multipleOptions: OptionItem[] = [
    { label: 'Amenidad 1: Wifi', selected: false, value: 1 },
    { label: 'Amenidad 2: Café', selected: true, value: 2 },
    { label: 'Amenidad 3: Impresora', selected: false, value: 3 },
    { label: 'Amenidad 4: Estacionamiento', selected: true, value: 4 },
    { label: 'Amenidad 5: Aire acondicionado', selected: false, value: 5 }
  ];
  
  selectedSingle: string = 'D';
  selectedMultiple: number[] = [2, 4];
  
  onSingleSelectionChange(selection: any): void {
    this.selectedSingle = selection[0];
    console.log('Selección única:', this.selectedSingle);
  }
  
  onMultipleSelectionChange(selection: any[]): void {
    this.selectedMultiple = selection;
    console.log('Selección múltiple:', this.selectedMultiple);
  }
} 