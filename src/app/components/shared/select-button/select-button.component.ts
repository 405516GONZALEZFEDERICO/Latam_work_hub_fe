import {
  Component,
  OnInit,
  HostListener,
  Output,
  Input,
  EventEmitter,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface OptionItem {
  label: string;
  selected: boolean;
  disabled?: boolean;
  value: any;
}

@Component({
  selector: 'app-select-button',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './select-button.component.html',
  styleUrls: ['./select-button.component.scss']
})
export class SelectButtonComponent implements OnInit {
  
  @Input() options: OptionItem[] = [
    { label: 'Opción 1', selected: false, value: 'option1' },
    { label: 'Opción 2', selected: false, value: 'option2' },
    { label: 'Opción 3', selected: false, value: 'option3' },
    { label: 'Opción 4', selected: false, disabled: true, value: 'option4' },
    { label: 'Opción 5', selected: false, value: 'option5' },
    { label: 'Opción 6', selected: false, value: 'option6' }
  ];

  @Input() placeholder: string = 'Seleccionar opciones';

  @Output() selectionChange = new EventEmitter<any[]>();

  selectedOption: string = '';
  isDropdownOpen: boolean = false;

  get isAnyOptionSelected(): boolean {
    return this.options.some(opt => opt.selected);
  }

  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    this.updateSelectedText();
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleOption(option: OptionItem): void {
    if (option.disabled) return;

    option.selected = !option.selected;
    this.updateSelectedText();

    setTimeout(() => {
      this.selectionChange.emit(this.getSelectedValues());
    }, 0);
  }

  updateSelectedText(): void {
    const selectedOptions = this.options.filter(opt => opt.selected);

    if (selectedOptions.length === 0) {
      this.selectedOption = '';
    } else if (selectedOptions.length === 1) {
      this.selectedOption = selectedOptions[0].label;
    } else {
      this.selectedOption = `${selectedOptions.length} seleccionados`;
    }
  }

  getSelectedValues(): any[] {
    return this.options.filter(opt => opt.selected).map(opt => opt.value);
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    if (isPlatformBrowser(this.platformId)) {
      const target = event.target as HTMLElement;
      if (!target.closest('.select-button-container')) {
        this.isDropdownOpen = false;
      }
    }
  }
} 