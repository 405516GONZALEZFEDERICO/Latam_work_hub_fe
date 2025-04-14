import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-view-login',
  standalone:true,
  templateUrl: './view-login.component.html',
  styleUrl: './view-login.component.scss'
})
export class ViewLoginComponent implements OnInit, OnDestroy {
  constructor(private renderer: Renderer2) {}
  
  ngOnInit() {
    // Añadir la clase auth-styles al body cuando se inicia el componente
    this.renderer.addClass(document.body, 'auth-styles');
    // También añadir otra clase para garantizar estilos específicos
    this.renderer.addClass(document.body, 'login-view');
    // Añadir clase para anular estilos que colapsan mensajes de error
    this.renderer.addClass(document.body, 'show-form-errors');
  }

  ngOnDestroy() {
    // Remover las clases cuando se destruye el componente
    this.renderer.removeClass(document.body, 'auth-styles');
    this.renderer.removeClass(document.body, 'login-view');
    this.renderer.removeClass(document.body, 'show-form-errors');
  }
}
