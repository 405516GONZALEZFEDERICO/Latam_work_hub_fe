import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';

export interface OptionItem {
  label: string;
  selected: boolean;
  disabled?: boolean;
  value: any;
}

@Component({
  selector: 'app-material-select',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule
  ],
  templateUrl: './material-select.component.html',
  styleUrls: ['./material-select.component.scss']
})
export class MaterialSelectComponent implements OnInit {
  
  @Input() options: OptionItem[] = [];
  @Input() placeholder: string = 'Seleccionar opciones';
  @Input() multiple: boolean = true;
  @Output() selectionChange = new EventEmitter<any[]>();

  selectedValues: any[] = [];
  
  constructor() {}

  ngOnInit(): void {
    // Inicializar valores seleccionados
    this.selectedValues = this.options
      .filter(option => option.selected)
      .map(option => option.value);
  }

  onSelectionChange(event: any): void {
    // Actualizar el estado de selección en las opciones originales
    this.options.forEach(option => {
      option.selected = this.selectedValues.includes(option.value);
    });
    
    // Emitir los valores seleccionados
    this.selectionChange.emit(this.selectedValues);
  }
} 