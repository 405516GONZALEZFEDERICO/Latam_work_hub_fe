import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service/auth.service';
import { ProfileService } from '../../services/profile/profile.service';

interface FAQItem {
  question: string;
  answer: string;
  role: 'GENERAL' | 'CLIENTE' | 'PROVEEDOR' | 'ADMIN';
  category: string;
  icon: string;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatDividerModule,
    MatToolbarModule,
    MatChipsModule,
    RouterLink
  ],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.css']
})
export class FaqComponent implements OnInit {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);

  userRole: string = '';
  currentUserEmail: string = '';
  
  faqItems: FAQItem[] = [
    // General questions
    {
      question: '¿Cómo creo mi cuenta y contraseña?',
      answer: 'Para crear tu cuenta, ve a la página de registro e ingresa tu email y contraseña. Tu clave se genera automáticamente durante el proceso de registro. Asegúrate de usar una combinación segura de letras mayúsculas, minúsculas, números y símbolos.',
      role: 'GENERAL',
      category: 'Seguridad',
      icon: 'lock'
    },
    {
      question: '¿Cómo recupero mi contraseña?',
      answer: 'Si olvidaste tu contraseña, ve a la página de inicio de sesión y haz clic en "¿Has olvidado tu contraseña?". Ingresa tu email y recibirás un correo con instrucciones para recuperar tu contraseña.',
      role: 'GENERAL',
      category: 'Seguridad',
      icon: 'lock_open'
    },
    {
      question: '¿A qué dirección de mail me puedo contactar para hacer una sugerencia o reclamo?',
      answer: 'Puedes enviar tus consultas, sugerencias o reclamos a no.reply.latamworkhub@gmail.com. Nuestro equipo te responderá en un plazo máximo de 48 horas.',
      role: 'GENERAL',
      category: 'Contacto',
      icon: 'email'
    },
    {
      question: '¿Qué medios de pago aceptan?',
      answer: 'Utilizamos exclusivamente Mercado Pago para procesar todas las transacciones. Mercado Pago acepta tarjetas de crédito, débito, y otros métodos de pago disponibles en su plataforma.',
      role: 'GENERAL',
      category: 'Pagos',
      icon: 'payment'
    },
    {
      question: '¿Latam Work Hub cobra comisiones?',
      answer: 'No, Latam Work Hub no cobra comisiones por el uso de la plataforma. El servicio de conexión entre proveedores y clientes es completamente gratuito. Solo se aplican las comisiones estándar de Mercado Pago por las transacciones.',
      role: 'GENERAL',
      category: 'Pagos',
      icon: 'money_off'
    },
    {
      question: '¿Cuándo puedo usar la plataforma completamente?',
      answer: 'Para acceder a todas las funcionalidades, debes completar tu perfil con datos personales y, si eres proveedor, los datos de tu empresa asociada. Si eres cliente, también necesitas completar los datos de tu compañía asociada para comunicación.',
      role: 'GENERAL',
      category: 'Perfil',
      icon: 'account_circle'
    },

    // Cliente specific questions
    {
      question: '¿Cómo busco espacios disponibles?',
      answer: 'Ve a la sección "Buscar espacios" en el menú lateral. Puedes filtrar por ubicación, tipo de espacio, capacidad, precio y amenidades. Usa los filtros avanzados para encontrar el espacio perfecto para tus necesidades.',
      role: 'CLIENTE',
      category: 'Búsqueda',
      icon: 'search'
    },
    {
      question: '¿Cómo realizo una reserva?',
      answer: 'Después de encontrar un espacio, haz clic en "Ver detalles", selecciona las fechas y horarios deseados, y procede con el pago a través de Mercado Pago. Recibirás una confirmación por email y podrás ver tu reserva en "Mis Reservas".',
      role: 'CLIENTE',
      category: 'Reservas',
      icon: 'event'
    },
    {
      question: '¿Puedo cancelar mi reserva?',
      answer: 'Sí, puedes cancelar tu reserva desde "Mis Reservas". Las políticas de cancelación y reembolso dependen de los términos establecidos por cada proveedor y las políticas de Mercado Pago.',
      role: 'CLIENTE',
      category: 'Reservas',
      icon: 'cancel'
    },
    {
      question: '¿Qué datos necesito completar como cliente?',
      answer: 'Como cliente debes completar tus datos personales y los datos de tu compañía asociada para facilitar la comunicación con los proveedores de espacios.',
      role: 'CLIENTE',
      category: 'Perfil',
      icon: 'business'
    },

    // Proveedor specific questions
    {
      question: '¿Cómo publico mi espacio?',
      answer: 'Ve a "Mis Espacios" y haz clic en "Agregar nuevo espacio". Completa toda la información requerida, sube fotos de calidad y establece tus precios y disponibilidad.',
      role: 'PROVEEDOR',
      category: 'Gestión',
      icon: 'add_business'
    },
    {
      question: '¿Cómo gestiono las reservas de mis espacios?',
      answer: 'En "Mis Espacios" puedes ver todas las reservas activas, pendientes y pasadas. Puedes aceptar, rechazar o modificar reservas según tu disponibilidad y políticas.',
      role: 'PROVEEDOR',
      category: 'Reservas',
      icon: 'event_available'
    },
    {
      question: '¿Cuándo recibo los pagos?',
      answer: 'Los pagos se procesan directamente a través de Mercado Pago según los términos y tiempos establecidos por esta plataforma. Latam Work Hub no interviene en el proceso de pagos.',
      role: 'PROVEEDOR',
      category: 'Pagos',
      icon: 'account_balance'
    },
    {
      question: '¿Qué datos necesito completar como proveedor?',
      answer: 'Como proveedor debes completar tus datos personales y, si estás asociado a una empresa, también los datos de la empresa para poder ofrecer tus espacios en la plataforma.',
      role: 'PROVEEDOR',
      category: 'Perfil',
      icon: 'business'
    },

    // Admin specific questions
    {
      question: '¿Cómo accedo al panel administrativo?',
      answer: 'Como administrador, tienes acceso a "Panel de Control" y "Dashboard" desde el menú lateral. Aquí puedes gestionar usuarios, espacios, transacciones y generar reportes.',
      role: 'ADMIN',
      category: 'Administración',
      icon: 'admin_panel_settings'
    },
    {
      question: '¿Cómo genero reportes del sistema?',
      answer: 'Ve a la sección "Informes" donde puedes generar reportes de usuarios, reservas, y uso de la plataforma. Los reportes pueden exportarse en formato PDF o Excel.',
      role: 'ADMIN',
      category: 'Reportes',
      icon: 'analytics'
    },
    {
      question: '¿Cómo gestiono usuarios suspendidos?',
      answer: 'En "Panel de Control" > "Gestión de Usuarios" puedes ver usuarios suspendidos, revisar las razones de suspensión y reactivar cuentas cuando sea apropiado.',
      role: 'ADMIN',
      category: 'Usuarios',
      icon: 'person_off'
    },
    {
      question: '¿Cómo configuro los parámetros del sistema?',
      answer: 'Ve a "Configuración" > "Parámetros del Sistema" donde puedes ajustar diferentes configuraciones y parámetros de la plataforma.',
      role: 'ADMIN',
      category: 'Configuración',
      icon: 'settings'
    }
  ];

  filteredFAQs: FAQItem[] = [];
  categories: string[] = [];

  ngOnInit() {
    this.loadUserProfile();
    this.filterFAQsByRole();
    this.extractCategories();
  }

  private async loadUserProfile() {
    try {
      const profile = await this.profileService.getProfileData().toPromise();
      this.userRole = profile?.role || '';
      this.currentUserEmail = profile?.email || '';
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  private filterFAQsByRole() {
    this.filteredFAQs = this.faqItems.filter(faq => 
      faq.role === 'GENERAL' || faq.role === this.userRole
    );
  }

  private extractCategories() {
    this.categories = [...new Set(this.filteredFAQs.map(faq => faq.category))];
  }

  getFAQsByCategory(category: string): FAQItem[] {
    return this.filteredFAQs.filter(faq => faq.category === category);
  }

  getRoleColor(role: string): string {
    switch(role) {
      case 'ADMIN': return '#dc3545';
      case 'PROVEEDOR': return '#28a745';
      case 'CLIENTE': return '#007bff';
      default: return '#6c757d';
    }
  }

  getRoleLabel(role: string): string {
    switch(role) {
      case 'ADMIN': return 'Administrador';
      case 'PROVEEDOR': return 'Proveedor';
      case 'CLIENTE': return 'Cliente';
      default: return 'General';
    }
  }
} 