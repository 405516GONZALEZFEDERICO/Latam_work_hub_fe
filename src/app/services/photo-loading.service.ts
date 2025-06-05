import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PhotoLoadingService {
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();

  setLoading(loading: boolean): void {
    this.isLoadingSubject.next(loading);
  }

  getLoadingState(): boolean {
    return this.isLoadingSubject.value;
  }
} 