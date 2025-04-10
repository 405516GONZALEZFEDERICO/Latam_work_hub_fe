import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { securityWardGuard } from './security-ward.guard';

describe('securityWardGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => securityWardGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
