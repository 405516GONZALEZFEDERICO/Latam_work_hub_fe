import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

// Importar ngx-charts para gráficos
import { NgxChartsModule } from '@swimlane/ngx-charts';

// Importar el servicio
import { 
  AdminDashboardService,
  KpiCardsDto,
  MonthlyRevenueDto,
  ReservationsBySpaceTypeDto,
  PeakHoursDto
} from '../../services/dashboard/admin-dashboard.service';

@Component({
  selector: 'app-admin-dashboard-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatGridListModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    NgxChartsModule
  ],
  templateUrl: './admin-dashboard-view.component.html',
  styleUrls: ['./admin-dashboard-view.component.css']
})
export class AdminDashboardViewComponent implements OnInit, AfterViewInit {
  // Datos KPI
  kpiData: KpiCardsDto | null = null;
  
  // Datos de ingresos mensuales
  monthlyRevenueData: any[] = [];
  
  // Datos de reservas por tipo de espacio
  spaceTypeData: any[] = [];
  
  // Datos de horas pico
  peakHoursData: any[] = [];
  
  // Estados de carga
  loading = {
    kpi: false,
    monthlyRevenue: false,
    spaceType: false,
    peakHours: false
  };
  
  // Estados de error
  error = {
    kpi: null as string | null,
    monthlyRevenue: null as string | null,
    spaceType: null as string | null,
    peakHours: null as string | null
  };
  
  // Opciones generales para los gráficos
  colorScheme: any = {
    name: 'vivid',
    selectable: true,
    group: 'Ordinal',
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA', '#42A5F5', '#7B1FA2', '#FF9800']
  };
  
  // Opciones para el gráfico de líneas
  showXAxis = true;
  showYAxis = true;
  showLegend = true;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = 'Mes';
  yAxisLabel = 'Ingresos';
  
  // Selector de meses para el gráfico de ingresos
  selectedMonths = 12;
  monthsOptions = [3, 6, 12, 24, 36];

  constructor(
    private dashboardService: AdminDashboardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  ngAfterViewInit(): void {
    // Detectar cambios después de que la vista se inicialice para evitar errores
    setTimeout(() => this.cdr.detectChanges(), 100);
  }

  loadAllData(): void {
    this.loadKpiData();
    this.loadMonthlyRevenue();
    this.loadReservationsBySpaceType();
    this.loadPeakHours();
  }

  loadKpiData(): void {
    this.loading.kpi = true;
    this.dashboardService.getKpiCards().subscribe({
      next: (data) => {
        this.kpiData = data;
        this.loading.kpi = false;
      },
      error: (err) => {
        console.error('Error cargando KPIs:', err);
        this.error.kpi = 'No se pudieron cargar los indicadores. Intente más tarde.';
        this.loading.kpi = false;
      }
    });
  }

  loadMonthlyRevenue(months: number = this.selectedMonths): void {
    this.loading.monthlyRevenue = true;
    this.dashboardService.getMonthlyRevenue(months).subscribe({
      next: (data) => {
        // Formatear los datos para ngx-charts
        this.monthlyRevenueData = [{
          name: 'Ingresos Mensuales',
          series: data.map(item => ({
            name: item.monthYear,
            value: item.revenue
          }))
        }];
        this.loading.monthlyRevenue = false;
      },
      error: (err) => {
        console.error('Error cargando ingresos mensuales:', err);
        this.error.monthlyRevenue = 'No se pudo cargar el gráfico de ingresos.';
        this.loading.monthlyRevenue = false;
      }
    });
  }

  loadReservationsBySpaceType(): void {
    this.loading.spaceType = true;
    this.dashboardService.getReservationsBySpaceType().subscribe({
      next: (data) => {
        // Formatear los datos para ngx-charts
        this.spaceTypeData = data.map(item => ({
          name: item.spaceTypeName,
          value: item.reservationCount
        }));
        this.loading.spaceType = false;
      },
      error: (err) => {
        console.error('Error cargando reservas por tipo de espacio:', err);
        this.error.spaceType = 'No se pudo cargar el gráfico de tipos de espacio.';
        this.loading.spaceType = false;
      }
    });
  }

  loadPeakHours(): void {
    this.loading.peakHours = true;
    this.dashboardService.getPeakReservationHours().subscribe({
      next: (data) => {
        // Formatear los datos para gráfico de barras
        this.peakHoursData = data.map(item => ({
          name: `${item.hourOfDay}:00 - ${item.hourOfDay + 1}:00`,
          value: item.reservationCount
        }));
        this.loading.peakHours = false;
      },
      error: (err) => {
        console.error('Error cargando horas pico:', err);
        this.error.peakHours = 'No se pudo cargar el histograma de horas.';
        this.loading.peakHours = false;
      }
    });
  }

  onMonthsChange(): void {
    this.loadMonthlyRevenue(this.selectedMonths);
  }

  // Función auxiliar para formatear montos como pesos
  formatCurrency(value: number): string {
    return value ? `$${value.toLocaleString('es-AR')}` : '$0';
  }
} 