import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchSpace } from '../../../models/search-space.model';
import { SearchSpaceService, PagedResponse } from '../../../services/search-space/search-space.service';
import { SpaceCardComponent } from '../space-card/space-card.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-space-grid',
  standalone: true,
  imports: [
    CommonModule,
    SpaceCardComponent,
    MatProgressSpinnerModule
  ],
  templateUrl: './space-grid.component.html',
  styleUrls: ['./space-grid.component.css']
})
export class SpaceGridComponent implements OnInit {
  @Input() spaces: SearchSpace[] = [];
  isLoading = true;

  constructor(private spaceService: SearchSpaceService) { }

  ngOnInit(): void {
    if (this.spaces.length === 0) {
      this.loadSpaces();
    } else {
      this.isLoading = false;
    }
  }

  private loadSpaces(): void {
    this.isLoading = true;
    this.spaceService.getSpaces().subscribe({
      next: (response: PagedResponse<SearchSpace>) => {
        this.spaces = response.content;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading spaces:', error);
        this.isLoading = false;
      }
    });
  }
} 