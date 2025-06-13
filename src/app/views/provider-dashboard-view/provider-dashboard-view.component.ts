import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
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
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';

// Importar el servicio
import { 
  ProviderDashboardService,
  ProviderKpiCardsDto,
  ProviderMonthlyRevenueDto,
  ProviderSpacePerformanceDto
} from '../../services/dashboard/provider-dashboard.service';
import { AuthService } from '../../services/auth-service/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-provider-dashboard-view',
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
  templateUrl: './provider-dashboard-view.component.html',
  styleUrls: ['./provider-dashboard-view.component.css']
})
export class ProviderDashboardViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private dashboardService = inject(ProviderDashboardService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  isLoadingKpis = true;
  isLoadingRevenue = true;
  isLoadingPerformance = true;

  kpiCards: ProviderKpiCardsDto | null = null;
  monthlyRevenue: ProviderMonthlyRevenueDto[] = [];
  spacePerformance: ProviderSpacePerformanceDto[] = [];

  selectedMonths = 12;
  isExpandedRevenue = false;
  isExpandedPerformance = false;

  revenueChartData: any[] = [];
  expandedChartData: any[] = [];
  
  // Properties for template compatibility
  kpiData: ProviderKpiCardsDto | null = {
    totalSpaces: 0,
    activeContracts: 0,
    reservationsThisMonth: 0,
    totalGrossRevenueLast30Days: 0,
    totalNetRevenueLast30Days: 0,
    totalRefundsLast30Days: 0,
    totalRevenueLast30Days: 0,
    spacesOccupied: 0,
    spacesAvailable: 0,
    occupancyRate: 0
  };
  
  monthlyRevenueData: any[] = [];
  spacePerformanceData: ProviderSpacePerformanceDto[] = [];
  
  loading = {
    kpi: true,
    monthlyRevenue: true,
    spacePerformance: true
  };
  
  error = {
    kpi: null as string | null,
    monthlyRevenue: null as string | null,
    spacePerformance: null as string | null
  };
  
  monthsOptions = [3, 6, 12, 24];
  
  // Chart configuration
  showXAxis = true;
  showYAxis = true;
  showLegend = false;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = 'Mes';
  yAxisLabel = 'Ingresos Brutos';
  
  // Expanded view properties
  currentExpandedView: string | null = null;
  expandedChartTitle = '';

  colorScheme: Color = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#795548']
  };

  ngOnInit(): void {
    // Initialize with empty data to prevent chart rendering issues
    this.initializeEmptyData();
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
        console.error('No se pudo obtener el UID del usuario en provider dashboard');
        this.error.kpi = 'No se pudo obtener información del usuario';
        this.error.monthlyRevenue = 'No se pudo obtener información del usuario';
        this.error.spacePerformance = 'No se pudo obtener información del usuario';
        this.loading.kpi = false;
        this.loading.monthlyRevenue = false;
        this.loading.spacePerformance = false;
        return;
      }


      this.loadKpiCards(userUid);
      this.loadMonthlyRevenue(userUid);
      this.loadSpacePerformance(userUid);
    } catch (error) {
      console.error('Error al cargar datos del dashboard de proveedor:', error);
      this.error.kpi = 'Error al cargar datos del dashboard';
      this.error.monthlyRevenue = 'Error al cargar datos del dashboard';
      this.error.spacePerformance = 'Error al cargar datos del dashboard';
      this.loading.kpi = false;
      this.loading.monthlyRevenue = false;
      this.loading.spacePerformance = false;
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
              console.error('Usuario no encontrado o sin UID en provider dashboard');
              resolve(null);
            }
          },
          error: (error) => {
            console.error('Error al obtener usuario en provider dashboard:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Error en getCurrentUserUid en provider dashboard:', error);
      return null;
    }
  }

  private loadKpiCards(userUid: string): void {
    this.loading.kpi = true;
    this.error.kpi = null;
    

    
    this.dashboardService.getKpiCards(userUid)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingKpis = false;
          this.loading.kpi = false;
          console.log('Carga de KPIs de proveedor finalizada');
        })
      )
      .subscribe({
        next: (data) => {
          console.log('KPIs de proveedor cargados exitosamente:', data);
          this.kpiCards = data;
          this.kpiData = data; // Sync for template
          

        },
        error: (err) => {
          console.error('Error al cargar KPIs de proveedor:', err);
          this.error.kpi = 'Error al cargar indicadores. Verifique su conexión.';
        }
      });
  }

  private loadMonthlyRevenue(userUid: string): void {
    this.loading.monthlyRevenue = true;
    this.error.monthlyRevenue = null;
    
    console.log('🔍 [DEBUG] Cargando ingresos mensuales, meses:', this.selectedMonths);
    
    this.dashboardService.getMonthlyRevenue(userUid, this.selectedMonths)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingRevenue = false;
          this.loading.monthlyRevenue = false;
          console.log('✅ [DEBUG] Carga de ingresos mensuales finalizada');
        })
      )
      .subscribe({
        next: (data) => {
          console.log('📊 [DEBUG] Datos mensuales recibidos del backend:', data);
          console.log('🔍 [DEBUG] URL consultada:', `${this.dashboardService['apiUrl']}/monthly-revenue`);
          
          this.monthlyRevenue = data || [];
          
          if (data && data.length > 0) {
            // Usar los datos reales mensuales, no el valor fijo de KPI cards
            this.monthlyRevenueData = [{
              name: 'Ingresos Brutos',
              series: data.map(item => ({
                name: item.monthYear || 'Mes',
                value: item.revenue || 0 // ✅ Usar el valor real de cada mes
              }))
            }];
            
            console.log('📈 [DEBUG] Gráfico cargado con datos mensuales reales:', data);
          } else {
            console.log('📭 [DEBUG] No hay datos mensuales disponibles');
            this.monthlyRevenueData = [{
              name: 'Ingresos Brutos',
              series: [
                { name: 'No hay datos', value: 0 }
              ]
            }];
          }
          
          this.updateRevenueChartData();
          
          if (this.isExpandedRevenue || this.currentExpandedView === 'monthlyRevenue') {
            this.expandedChartData = [...this.monthlyRevenueData];
          }
          
          // Forzar detección de cambios para actualizar el gráfico en vista normal
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ [ERROR] Error al cargar ingresos mensuales:', err);
          this.error.monthlyRevenue = 'Error al cargar ingresos mensuales. Inténtalo de nuevo.';
          
          // Mostrar datos vacíos en caso de error
          this.monthlyRevenueData = [{
            name: 'Ingresos Brutos',
            series: [{ name: 'Error en backend', value: 0 }]
          }];
          
          this.cdr.detectChanges();
        }
      });
  }



  private loadSpacePerformance(userUid: string): void {
    this.loading.spacePerformance = true;
    this.error.spacePerformance = null;
    
    console.log('Cargando rendimiento de espacios...');
    
    this.dashboardService.getSpacePerformance(userUid)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingPerformance = false;
          this.loading.spacePerformance = false;
          console.log('Carga de rendimiento de espacios finalizada');
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Rendimiento de espacios cargado exitosamente:', data);
          this.spacePerformance = data;
          this.spacePerformanceData = data; // Sync for template
        },
        error: (err) => {
          console.error('Error al cargar rendimiento de espacios:', err);
          this.error.spacePerformance = 'Error al cargar rendimiento de espacios. Verifique su conexión.';
        }
      });
  }

  private updateRevenueChartData(): void {
    // Usar los datos reales mensuales, no valores fijos de KPI cards
    if (this.monthlyRevenue && this.monthlyRevenue.length > 0) {
      this.revenueChartData = [{
        name: 'Ingresos Brutos',
        series: this.monthlyRevenue.map(item => ({
          name: item.monthYear || 'Mes',
          value: item.revenue || 0 // ✅ Usar el valor real de cada mes
        }))
      }];
    } else {
      this.revenueChartData = [{
        name: 'Ingresos Brutos',
        series: [{ name: 'No hay datos', value: 0 }]
      }];
    }
  }

  onMonthsChange(months?: number): void {
    const selectedMonths = months || this.selectedMonths;
    this.selectedMonths = selectedMonths;
    this.isLoadingRevenue = true;
    
    this.getCurrentUserUid().then(userUid => {
      if (userUid) {
        this.loadMonthlyRevenue(userUid);
      }
    });
  }

  onMonthsChangeEvent(event: any): void {
    // event es un MatSelectChange, necesitamos obtener el valor
    const months = event.value;
    this.selectedMonths = months;
    console.log('🔍 [DEBUG] Proveedor - Cambiando a:', months, 'meses');
    this.onMonthsChange();
  }

  toggleRevenueExpanded(): void {
    this.isExpandedRevenue = !this.isExpandedRevenue;
    
    if (this.isExpandedRevenue) {
      this.expandedChartData = [...this.monthlyRevenueData];
    }
  }

  togglePerformanceExpanded(): void {
    this.isExpandedPerformance = !this.isExpandedPerformance;
  }

  getMonthName(monthNumber: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthNumber - 1] || `Mes ${monthNumber}`;
  }

  getKpiIcon(index: number): string {
    const icons = ['business', 'attach_money', 'description', 'bookmark', 'star', 'trending_up'];
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
      return '$0';
    }
  }

  formatNumber(value: number | null | undefined): string {
    if (value == null || isNaN(value)) {
      return '0';
    }
    return value.toString();
  }

  formatPercentage(value: number | null | undefined): string {
    try {
      if (value == null || isNaN(value)) {
        return '0%';
      }
      return `${value.toFixed(1)}%`;
    } catch (error) {
      return '0%';
    }
  }

  // Expanded view methods
  isOverviewMode(): boolean {
    return this.currentExpandedView === null;
  }

  isExpandedView(viewName: string): boolean {
    return this.currentExpandedView === viewName;
  }

  expandChart(chartType: string): void {
    this.currentExpandedView = chartType;
    
    switch (chartType) {
      case 'monthlyRevenue':
        this.expandedChartTitle = 'Ingresos Brutos Mensuales - Vista Expandida';
        this.expandedChartData = [...this.monthlyRevenueData];
        break;
      case 'spacePerformance':
        this.expandedChartTitle = 'Rendimiento de Espacios - Vista Expandida';
        break;
    }
  }

  goBackToOverview(): void {
    this.currentExpandedView = null;
    this.expandedChartTitle = '';
    this.expandedChartData = [];
  }

  private initializeEmptyData(): void {
    // Initialize with placeholder data for better UX
    this.monthlyRevenueData = [
      { name: 'Cargando...', series: [{ name: 'Ingresos Brutos', value: 0 }] }
    ];
  }
} 