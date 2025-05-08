import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  videoPlaying: boolean = false;
  controlsVisible: boolean = true;
  private videoElement!: HTMLVideoElement;
  private controlsTimeout: any;

  currentYear: number = new Date().getFullYear();

  private onVideoPlayBound!: () => void;
  private onVideoPauseBound!: () => void;
  private onVideoEndedBound!: () => void;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.onVideoPlayBound = () => {
      this.videoPlaying = true;
      this.showControlsThenTimeout();
      this.cdr.detectChanges();
    };
    this.onVideoPauseBound = () => {
      this.videoPlaying = false;
      this.showControlsAndKeepVisible();
      this.cdr.detectChanges();
    };
    this.onVideoEndedBound = () => {
      this.videoPlaying = false;
      if (this.videoPlayer && this.videoPlayer.nativeElement) {
        this.videoPlayer.nativeElement.currentTime = 0;
      }
      this.showControlsAndKeepVisible();
      this.cdr.detectChanges();
    };
  }

  ngAfterViewInit(): void {
    if (this.videoPlayer && this.videoPlayer.nativeElement) {
      this.videoElement = this.videoPlayer.nativeElement;
      this.videoElement.addEventListener('play', this.onVideoPlayBound);
      this.videoElement.addEventListener('pause', this.onVideoPauseBound);
      this.videoElement.addEventListener('ended', this.onVideoEndedBound);
      this.showControlsAndKeepVisible(); // Initially show controls
    } else {
      console.error('Landing page video player element not found.');
    }
  }

  ngOnDestroy(): void {
    if (this.videoElement) {
      this.videoElement.removeEventListener('play', this.onVideoPlayBound);
      this.videoElement.removeEventListener('pause', this.onVideoPauseBound);
      this.videoElement.removeEventListener('ended', this.onVideoEndedBound);
    }
    clearTimeout(this.controlsTimeout);
  }

  handleVideoContainerClick(): void {
    if (!this.controlsVisible) {
      this.showControlsThenTimeout();
    } else {
      this.togglePlay();
    }
  }

  togglePlay(): void {
    if (!this.videoElement) {
      if (this.videoPlayer && this.videoPlayer.nativeElement) {
        this.videoElement = this.videoPlayer.nativeElement;
      } else {
        console.error('Video player element not available to toggle play.');
        return;
      }
    }

    if (this.videoElement.paused || this.videoElement.ended) {
      this.videoElement.muted = false;
      this.videoElement.play().catch(error => console.error('Error trying to play video:', error));
    } else {
      this.videoElement.pause();
    }
  }

  private showControlsThenTimeout(): void {
    clearTimeout(this.controlsTimeout);
    this.controlsVisible = true;
    this.cdr.detectChanges();
    this.controlsTimeout = setTimeout(() => {
      this.controlsVisible = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  private showControlsAndKeepVisible(): void {
    clearTimeout(this.controlsTimeout);
    this.controlsVisible = true;
    this.cdr.detectChanges();
  }
} 