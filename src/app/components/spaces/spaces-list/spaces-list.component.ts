import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Space } from '../../../models/space';
import { SpaceService } from '../../../services/space/space.service';

@Component({
  selector: 'app-spaces-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatBadgeModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './spaces-list.component.html',
  styleUrls: ['./spaces-list.component.css']
})
export class SpacesListComponent implements OnInit {
  spaces: Space[] = [];

  filterForm = new FormGroup({
    name: new FormControl(''),
    type: new FormControl(''),
    status: new FormControl('')
  });

  spaceTypes = ['All', 'Studio', 'Meeting Room', 'Office', 'Coworking'];
  statusOptions = ['All', 'Active', 'Inactive'];

  filteredSpaces: Space[] = [];

  constructor(
    private router: Router,
    private spaceService: SpaceService
  ) {}

  ngOnInit(): void {
    this.loadSpaces();

    // Subscribe to form value changes to apply filters
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  loadSpaces(): void {
    this.spaceService.getSpaces().subscribe(
      (spaces: Space[]) => {
        this.spaces = spaces;
        this.filteredSpaces = [...this.spaces];
      },
      (error) => {
        console.error('Error loading spaces:', error);
      }
    );
  }

  applyFilters(): void {
    const nameFilter = this.filterForm.get('name')?.value?.toLowerCase() || '';
    const typeFilter = this.filterForm.get('type')?.value || 'All';
    const statusFilter = this.filterForm.get('status')?.value || 'All';

    this.filteredSpaces = this.spaces.filter(space => {
      const matchesName = space.name.toLowerCase().includes(nameFilter);
      const matchesType = typeFilter === 'All' || space.type === typeFilter;
      const matchesStatus = statusFilter === 'All' || 
                           (statusFilter === 'Active' && space.active) ||
                           (statusFilter === 'Inactive' && !space.active);
      
      return matchesName && matchesType && matchesStatus;
    });
  }

  navigateToCreate(): void {
    this.router.navigate(['/home/spaces/create']);
  }

  navigateToView(id: number): void {
    this.router.navigate([`/home/spaces/${id}`]);
  }

  navigateToEdit(id: number): void {
    this.router.navigate([`/home/spaces/${id}/edit`]);
  }
} 