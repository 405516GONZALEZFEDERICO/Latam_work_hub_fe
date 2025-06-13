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
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';

// Importar ngx-charts para gráficos
import { NgxChartsModule } from '@swimlane/ngx-charts';

// Importar el servicio
import { 
  AdminDashboardService,
  KpiCardsDto,
  MonthlyRevenueDto,
  ReservationsBySpaceTypeDto,
  PeakHoursDto,
  TopSpacesDto
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
    MatTooltipModule,
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
  
  // Variable para rastrear si estamos mostrando datos de reservas o contratos
  isShowingReservationsData: boolean = true;
  
  // Datos de ejemplo para el gráfico cuando no hay datos reales
  sampleSpaceTypeData: any[] = [
    { name: 'Oficina', value: 0 },
    { name: 'Sala de Reuniones', value: 0 },
    { name: 'Espacio Coworking', value: 0 },
    { name: 'Sala de Conferencias', value: 0 },
    { name: 'Estudio', value: 0 }
  ];
  
  // Datos de horas pico
  peakHoursData: any[] = [];
  
  // Datos del top 5 de espacios
  topSpacesData: any[] = [];
  
  // Datos de contratos por tipo de espacio
  contractsBySpaceTypeData: any[] = [];
  
  // Control de navegación para gráficos drill-down
  showSpaceTypeDetails = false;
  showContractTypeDetails = false;
  selectedSpaceType = '';
  selectedContractType = '';
  

  
  // Nuevo sistema de navegación para vistas expandidas
  currentView: 'overview' | 'monthlyRevenue' | 'spaceTypes' | 'peakHours' | 'contractTypes' | 'topSpaces' = 'overview';
  expandedChartData: any = null;
  expandedChartTitle = '';
  
  // Estados de carga
  loading = {
    kpi: false,
    monthlyRevenue: false,
    spaceType: false,
    peakHours: false,
    topSpaces: false,
    contractsBySpaceType: false
  };
  
  // Estados de error
  error = {
    kpi: null as string | null,
    monthlyRevenue: null as string | null,
    spaceType: null as string | null,
    peakHours: null as string | null,
    topSpaces: null as string | null,
    contractsBySpaceType: null as string | null
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
  yAxisLabel = 'Ingresos Brutos';
  
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
    this.loadTop5Spaces();
    this.loadRentalContractsBySpaceType();
  }

  loadKpiData(): void {
    this.loading.kpi = true;
    this.dashboardService.getKpiCards().subscribe({
      next: (data) => {
        console.log('KPIs de administrador cargados exitosamente:', data);
        this.kpiData = data;
        this.loading.kpi = false;
        

        console.log('Carga de KPIs de administrador finalizada');
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
        // Usar los datos reales mensuales, no valores fijos de KPI cards
        this.monthlyRevenueData = [{
          name: 'Ingresos Brutos',
          series: data.map(item => ({
            name: item.monthYear,
            value: item.revenue || 0 // ✅ Usar el valor real de cada mes
          }))
        }];
        
        console.log('📈 [DEBUG] Gráfico cargado con datos mensuales reales (Admin):', data);
        
        // Si estamos en vista expandida de ingresos mensuales, actualizar también los datos expandidos
        if (this.currentView === 'monthlyRevenue') {
          this.expandedChartData = [...this.monthlyRevenueData];
        }
        
        this.loading.monthlyRevenue = false;
        
        // Forzar detección de cambios para actualizar el gráfico en vista normal
        this.cdr.detectChanges();
        
        console.log('✅ [DEBUG] Carga de ingresos mensuales finalizada (Admin)');
      },
      error: (err) => {
        console.error('Error cargando ingresos mensuales:', err);
        this.error.monthlyRevenue = 'No se pudo cargar el gráfico de ingresos.';
        this.loading.monthlyRevenue = false;
        this.cdr.detectChanges();
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
        
        // Si no hay datos de reservas, cargar datos de contratos
        if (this.spaceTypeData.length === 0 || this.spaceTypeData.every(item => item.value === 0)) {
          this.isShowingReservationsData = false;
          this.loadContractDataForSpaceTypeChart();
        } else {
          this.isShowingReservationsData = true;
          this.loading.spaceType = false;
        }
      },
      error: (err) => {
        console.error('Error cargando reservas por tipo de espacio:', err);
        // Si hay error cargando reservas, intentar cargar contratos
        this.isShowingReservationsData = false;
        this.loadContractDataForSpaceTypeChart();
      }
    });
  }

  // Método auxiliar para cargar datos de contratos cuando no hay reservas
  loadContractDataForSpaceTypeChart(): void {
    this.dashboardService.getRentalContractsBySpaceType().subscribe({
      next: (contractData) => {
        this.spaceTypeData = contractData.map(item => ({
          name: item.spaceTypeName,
          value: item.reservationCount // En este contexto representa contratos
        }));
        this.loading.spaceType = false;
      },
      error: (err) => {
        console.error('Error cargando contratos por tipo de espacio:', err);
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

  loadTop5Spaces(): void {
    this.loading.topSpaces = true;
    this.dashboardService.getTop5Spaces().subscribe({
      next: (data) => {
        // Ordenar por suma total de reservas + alquileres (descendente)
        this.topSpacesData = data.sort((a, b) => {
          const totalA = (a.reservationCount || 0) + (a.rentalCount || 0);
          const totalB = (b.reservationCount || 0) + (b.rentalCount || 0);
          return totalB - totalA; // Orden descendente
        });
        
        console.log('🏆 [DEBUG] Top 5 espacios ordenados:', this.topSpacesData.map(space => ({
          name: space.spaceName,
          reservas: space.reservationCount,
          alquileres: space.rentalCount,
          total: (space.reservationCount || 0) + (space.rentalCount || 0)
        })));
        
        this.loading.topSpaces = false;
      },
      error: (err) => {
        console.error('Error cargando top 5 espacios:', err);
        this.error.topSpaces = 'No se pudo cargar el top 5 de espacios.';
        this.loading.topSpaces = false;
      }
    });
  }

  loadRentalContractsBySpaceType(): void {
    this.loading.contractsBySpaceType = true;
    this.dashboardService.getRentalContractsBySpaceType().subscribe({
      next: (data) => {
        // Formatear los datos para gráfico de barras
        this.contractsBySpaceTypeData = data.map(item => ({
          name: item.spaceTypeName,
          value: item.reservationCount
        }));
        this.loading.contractsBySpaceType = false;
      },
      error: (err) => {
        console.error('Error cargando contratos por tipo de espacio:', err);
        this.error.contractsBySpaceType = 'No se pudo cargar el gráfico de contratos por tipo.';
        this.loading.contractsBySpaceType = false;
      }
    });
  }

  onMonthsChange(): void {
    this.loadMonthlyRevenue(this.selectedMonths);
  }

  onMonthsChangeEvent(event: any): void {
    // event es un MatSelectChange, necesitamos obtener el valor
    const months = event.value;
    this.selectedMonths = months;
    console.log('🔍 [DEBUG] Cambiando a:', months, 'meses');
    this.onMonthsChange();
  }

  // Función auxiliar para formatear montos como pesos
  formatCurrency(value: number): string {
    return value ? `$${value.toLocaleString('es-AR')}` : '$0';
  }

  // Métodos para navegación drill-down originales
  onSpaceTypeSelect(event: any): void {
    this.selectedSpaceType = event.name;
    this.showSpaceTypeDetails = true;
    // Aquí podrías cargar datos detallados del tipo seleccionado
    console.log('Tipo de espacio seleccionado:', event.name);
  }

  onContractTypeSelect(event: any): void {
    this.selectedContractType = event.name;
    this.showContractTypeDetails = true;
    // Aquí podrías cargar datos detallados del tipo seleccionado
    console.log('Tipo de contrato seleccionado:', event.name);
  }

  goBackToSpaceTypes(): void {
    this.showSpaceTypeDetails = false;
    this.selectedSpaceType = '';
  }

  goBackToContractTypes(): void {
    this.showContractTypeDetails = false;
    this.selectedContractType = '';
  }

  // Nuevos métodos para navegación de vistas expandidas
  expandChart(chartType: string): void {
    switch (chartType) {
      case 'monthlyRevenue':
        this.currentView = 'monthlyRevenue';
        this.expandedChartTitle = 'Ingresos Brutos Mensuales - Vista Expandida';
        this.expandedChartData = this.monthlyRevenueData;
        break;
      
      case 'spaceTypes':
        this.currentView = 'spaceTypes';
        this.expandedChartData = this.spaceTypeData.length > 0 ? this.spaceTypeData : this.sampleSpaceTypeData;
        this.expandedChartTitle = this.expandedSpaceTypeChartTitle;
        break;
      
      case 'peakHours':
        this.currentView = 'peakHours';
        this.expandedChartData = this.peakHoursData;
        this.expandedChartTitle = 'Horarios de Mayor Demanda - Vista Expandida';
        break;
      
      case 'contractTypes':
        this.currentView = 'contractTypes';
        this.expandedChartData = this.contractsBySpaceTypeData;
        this.expandedChartTitle = 'Contratos por Tipo de Espacio - Vista Expandida';
        break;
      
      case 'topSpaces':
        this.currentView = 'topSpaces';
        this.expandedChartData = this.topSpacesData;
        this.expandedChartTitle = 'Top 5 Espacios - Vista Expandida';
        break;
    }
  }

  goBackToOverview(): void {
    this.currentView = 'overview';
    this.expandedChartData = null;
    this.expandedChartTitle = '';
    // También resetear drill-down states
    this.showSpaceTypeDetails = false;
    this.showContractTypeDetails = false;
    this.selectedSpaceType = '';
    this.selectedContractType = '';
  }

  // Método para detectar clicks en gráficos para expandir
  onChartClick(event: any, chartType: string): void {
    // Deshabilitar drill-down en vistas expandidas para evitar confusión
    // Solo expandir si estamos en vista general
    if (this.currentView === 'overview') {
      this.expandChart(chartType);
    }
    // Remover el drill-down automático en vistas expandidas
    // Los usuarios pueden usar botones específicos si necesitan detalles
  }

  // Método auxiliar para verificar si estamos en vista general
  isOverviewMode(): boolean {
    return this.currentView === 'overview';
  }

  // Método auxiliar para verificar si estamos en una vista expandida específica
  isExpandedView(viewType: string): boolean {
    return this.currentView === viewType;
  }

  // Getter para el título dinámico del gráfico de reservas/contratos por tipo de espacio
  get spaceTypeChartTitle(): string {
    return this.isShowingReservationsData ? 'Reservas por Tipo de Espacio' : 'Contratos por Tipo de Espacio';
  }

  // Getter para el título dinámico de la vista expandida
  get expandedSpaceTypeChartTitle(): string {
    return this.isShowingReservationsData ? 'Reservas por Tipo de Espacio - Vista Expandida' : 'Contratos por Tipo de Espacio - Vista Expandida';
  }


} 