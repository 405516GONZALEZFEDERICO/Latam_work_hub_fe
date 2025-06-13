import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { ClientDashboardService } from '../../services/dashboard/client-dashboard.service';
import { 
  ClientKpiCardsDto, 
  ClientMonthlySpendingDto, 
  ClientBookingsByTypeDto 
} from '../../services/dashboard/client-dashboard.service';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth-service/auth.service';

@Component({
  selector: 'app-client-dashboard-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    NgxChartsModule
  ],
  templateUrl: './client-dashboard-view.component.html',
  styleUrl: './client-dashboard-view.component.css'
})
export class ClientDashboardViewComponent implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();
  private dashboardService = inject(ClientDashboardService);
  private authService = inject(AuthService);
  private changeDetectorRef = inject(ChangeDetectorRef);

  isLoadingKpis = true;
  isLoadingSpending = true;
  isLoadingBookings = true;

  kpiCards: ClientKpiCardsDto | null = null;
  monthlySpending: ClientMonthlySpendingDto[] = [];
  bookingsByType: ClientBookingsByTypeDto[] = [];

  selectedMonths = 12;
  isExpandedSpending = false;
  isExpandedBookings = false;

  spendingChartData: any[] = [];
  bookingsChartData: any[] = [];
  expandedChartData: any[] = [];
  
  // Expanded view properties
  currentExpandedView: string | null = null;
  expandedChartTitle = '';
  showLegend = true;
  
  // Properties for template compatibility
  kpiData: ClientKpiCardsDto | null = null;
  monthlySpendingData: any[] = [
    { name: 'Sin datos', value: 0 }
  ];
  bookingsByTypeData: any[] = [
    { name: 'Sin datos', value: 0 }
  ];
  sampleBookingsByTypeData = [
    { name: 'Sin datos', value: 1 }
  ];
  
  loading = {
    kpi: true,
    monthlySpending: true,
    bookingsByType: true
  };
  
  error = {
    kpi: null as string | null,
    monthlySpending: null as string | null,
    bookingsByType: null as string | null
  };
  
  monthsOptions = [3, 6, 12, 24];
  
  // Chart configuration
  showXAxis = true;
  showYAxis = true;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = 'Mes';
  yAxisLabel = 'Gasto';

  colorScheme: any = {
    domain: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#795548']
  };

  // Para line-chart, necesitamos un formato diferente
  lineChartData: any[] = [{
    name: "Gastos",
    series: []
  }];

  ngOnInit(): void {
    console.log('ClientDashboardViewComponent ngOnInit iniciado');
    console.log('Estados iniciales:');
    console.log('- loading.kpi:', this.loading.kpi);
    console.log('- error.kpi:', this.error.kpi);
    console.log('- kpiData:', this.kpiData);
    console.log('- currentExpandedView:', this.currentExpandedView);
    
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadDashboardData(): Promise<void> {
    try {
      const userUid = await this.getCurrentUserUid();
      if (!userUid) {
        console.error('No se pudo obtener el UID del usuario');
        this.error.kpi = 'No se pudo obtener información del usuario';
        this.error.monthlySpending = 'No se pudo obtener información del usuario';
        this.error.bookingsByType = 'No se pudo obtener información del usuario';
        this.loading.kpi = false;
        this.loading.monthlySpending = false;
        this.loading.bookingsByType = false;
        return;
      }

      console.log('Cargando datos del dashboard...');
      this.loadKpiCards(userUid);
      this.loadMonthlySpending(userUid);
      this.loadBookingsByType(userUid);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      this.error.kpi = 'Error al cargar datos del dashboard';
      this.error.monthlySpending = 'Error al cargar datos del dashboard';
      this.error.bookingsByType = 'Error al cargar datos del dashboard';
      this.loading.kpi = false;
      this.loading.monthlySpending = false;
      this.loading.bookingsByType = false;
    }
  }

  private async getCurrentUserUid(): Promise<string | null> {
    try {
      // Primero intentar obtener el usuario de forma síncrona
      const currentUser = this.authService.getCurrentUserSync();
      if (currentUser?.uid) {
        return currentUser.uid;
      }

      // Si no funciona, intentar de forma asíncrona
      return new Promise((resolve, reject) => {
        this.authService.getCurrentUser().subscribe({
          next: (user) => {
            if (user?.uid) {
              resolve(user.uid);
            } else {
              console.error('Usuario no encontrado o sin UID');
              resolve(null);
            }
          },
          error: (error) => {
            console.error('Error al obtener usuario:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Error en getCurrentUserUid:', error);
      return null;
    }
  }

  private loadKpiCards(userUid: string): void {
    this.loading.kpi = true;
    this.error.kpi = null;
    
    console.log('Cargando KPIs...');
    console.log('Estado inicial loading.kpi:', this.loading.kpi);
    
    this.dashboardService.getKpiCards(userUid)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingKpis = false;
          this.loading.kpi = false;
          console.log('Carga de KPIs finalizada');
          console.log('Estado final loading.kpi:', this.loading.kpi);
          console.log('kpiData después de finalize:', this.kpiData);
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          console.log('KPIs cargados exitosamente:', data);
          this.kpiCards = data;
          this.kpiData = data; // Sync for template
          console.log('Verificando kpiData asignado:', this.kpiData);
          console.log('Verificando kpiCards asignado:', this.kpiCards);
          this.changeDetectorRef.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar KPIs:', err);
          this.error.kpi = 'Error al cargar indicadores. Verifique su conexión.';
          this.changeDetectorRef.detectChanges();
        }
      });
  }

  private loadMonthlySpending(userUid: string): void {
    this.loading.monthlySpending = true;
    this.error.monthlySpending = null;
    
    console.log('Cargando gastos mensuales, meses:', this.selectedMonths);
    
    this.dashboardService.getMonthlySpending(userUid, this.selectedMonths)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingSpending = false;
          this.loading.monthlySpending = false;
          console.log('Carga de gastos mensuales finalizada');
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Gastos mensuales cargados exitosamente:', data);
          this.monthlySpending = data;
          this.monthlySpendingData = data.map(item => ({
            name: item.monthYear,
            value: item.spending || 0
          }));
          this.updateSpendingChartData();
          
          if (this.isExpandedSpending) {
            this.expandedChartData = [...this.spendingChartData];
          }
          
          // Forzar detección de cambios para actualizar el gráfico en vista normal
          this.changeDetectorRef.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar gastos mensuales:', err);
          this.error.monthlySpending = 'Error al cargar gastos mensuales. Verifique su conexión.';
          this.changeDetectorRef.detectChanges();
        }
      });
  }

  private loadBookingsByType(userUid: string): void {
    this.loading.bookingsByType = true;
    this.error.bookingsByType = null;
    
    console.log('Cargando reservas por tipo...');
    
    this.dashboardService.getBookingsBySpaceType(userUid)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingBookings = false;
          this.loading.bookingsByType = false;
          console.log('Carga de reservas por tipo finalizada');
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Reservas por tipo cargadas exitosamente:', data);
          this.bookingsByType = data;
          this.bookingsByTypeData = data.map(item => ({
            name: item.spaceTypeName,
            value: item.bookingCount || 0
          }));
          this.updateBookingsChartData();
          this.changeDetectorRef.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar reservas por tipo:', err);
          this.error.bookingsByType = 'Error al cargar reservas por tipo. Verifique su conexión.';
          this.changeDetectorRef.detectChanges();
        }
      });
  }

  private updateSpendingChartData(): void {
    // Para line-chart necesitamos formato: [{ name: "Serie", series: [{ name, value }] }]
    this.lineChartData = [{
      name: "Gastos",
      series: this.monthlySpending.map(item => ({
        name: item.monthYear,
        value: item.spending || 0
      }))
    }];
    
    // También mantenemos el formato plano para otros usos
    this.spendingChartData = this.monthlySpending.map(item => ({
      name: item.monthYear,
      value: item.spending || 0
    }));
    
    console.log('Datos de line chart actualizados:', this.lineChartData);
  }

  private updateBookingsChartData(): void {
    this.bookingsChartData = this.bookingsByType.map(item => ({
      name: item.spaceTypeName,
      value: item.bookingCount || 0
    }));
  }

  onMonthsChange(months?: number): void {
    const selectedMonths = months || this.selectedMonths;
    this.selectedMonths = selectedMonths;
    this.isLoadingSpending = true;
    
    this.getCurrentUserUid().then(userUid => {
      if (userUid) {
        this.loadMonthlySpending(userUid);
      }
    });
  }

  onMonthsChangeEvent(event: any): void {
    // event es un MatSelectChange, necesitamos obtener el valor
    const months = event.value;
    this.selectedMonths = months;
    console.log('🔍 [DEBUG] Cliente - Cambiando a:', months, 'meses');
    this.onMonthsChange();
  }

  toggleSpendingExpanded(): void {
    this.isExpandedSpending = !this.isExpandedSpending;
    
    if (this.isExpandedSpending) {
      this.expandedChartData = [...this.spendingChartData];
    }
  }

  toggleBookingsExpanded(): void {
    this.isExpandedBookings = !this.isExpandedBookings;
    
    if (this.isExpandedBookings) {
      this.expandedChartData = [...this.bookingsChartData];
    }
  }

  // Expanded view methods
  isExpandedView(viewName: string): boolean {
    return this.currentExpandedView === viewName;
  }

  isOverviewMode(): boolean {
    return this.currentExpandedView === null;
  }

  expandChart(chartType: string): void {
    this.currentExpandedView = chartType;
    
    switch (chartType) {
      case 'monthlySpending':
        this.expandedChartTitle = 'Gasto Mensual - Vista Expandida';
        this.expandedChartData = [...this.spendingChartData];
        break;
      case 'bookingsByType':
        this.expandedChartTitle = 'Reservas por Tipo - Vista Expandida';
        this.expandedChartData = [...this.bookingsChartData];
        break;
    }
  }

  goBackToOverview(): void {
    this.currentExpandedView = null;
    this.expandedChartTitle = '';
    this.expandedChartData = [];
  }

  getKpiIcon(index: number): string {
    const icons = ['bookmark', 'attach_money', 'description', 'schedule', 'check_circle'];
    return icons[index] || 'info';
  }

  formatCurrency(value: number | null | undefined): string {
    try {
      if (value == null || isNaN(value)) {
        return '$0';
      }
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return '$0';
    }
  }

  formatNumber(value: number | null | undefined): string {
    if (value == null || isNaN(value)) {
      return '0';
    }
    return value.toString();
  }
} 