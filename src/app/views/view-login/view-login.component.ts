import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-view-login',
  standalone:true,
  templateUrl: './view-login.component.html',
  styleUrl: './view-login.component.css'
})
export class ViewLoginComponent implements OnInit, OnDestroy {
  constructor(private renderer: Renderer2) {}
  
  ngOnInit() {
    this.renderer.addClass(document.body, 'auth-styles');
    this.renderer.addClass(document.body, 'login-view');
    this.renderer.addClass(document.body, 'show-form-errors');
  }

  ngOnDestroy() {
    this.renderer.removeClass(document.body, 'auth-styles');
    this.renderer.removeClass(document.body, 'login-view');
    this.renderer.removeClass(document.body, 'show-form-errors');
  }
}
