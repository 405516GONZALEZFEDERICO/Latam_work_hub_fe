import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProviderTypeSelectionComponent } from './provider-type-selection.component';

describe('ProviderTypeSelectionComponent', () => {
  let component: ProviderTypeSelectionComponent;
  let fixture: ComponentFixture<ProviderTypeSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderTypeSelectionComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderTypeSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 