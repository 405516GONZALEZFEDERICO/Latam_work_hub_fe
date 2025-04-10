import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewSelectRolComponent } from './view-select-rol.component';

describe('ViewSelectRolComponent', () => {
  let component: ViewSelectRolComponent;
  let fixture: ComponentFixture<ViewSelectRolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewSelectRolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewSelectRolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
