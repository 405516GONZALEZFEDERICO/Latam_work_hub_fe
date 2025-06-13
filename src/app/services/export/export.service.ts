import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  // Exportar datos a Excel (XLSX)
  exportToExcel(data: any[], fileName: string): void {
    // Usar los datos tal como vienen del componente (ya preparados)
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    
    // Configurar propiedades del libro
    const workbook: XLSX.WorkBook = { 
      Sheets: { 'data': worksheet }, 
      SheetNames: ['data']
    };
    
    // Personalizar las propiedades del libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Informe');
    
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.saveAsFile(excelBuffer, `${fileName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  // Exportar datos a CSV
  exportToCSV(data: any[], fileName: string): void {
    // Usar los datos tal como vienen del componente (ya preparados)
    if (!data || data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    const header = Object.keys(data[0]);
    
    // Crear filas de CSV sin usar JSON.stringify para evitar comillas
    const csvRows = [
      // Fila de encabezado
      header.join(','),
      // Filas de datos
      ...data.map(row => {
        return header.map(fieldName => {
          const value = row[fieldName];
          // Si el valor contiene comas, comillas o saltos de línea, escaparlo adecuadamente
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            // Escapar comillas duplicándolas y envolver en comillas si es necesario
            return '"' + value.replace(/"/g, '""') + '"';
          } else {
            return value;
          }
        }).join(',');
      })
    ];

    // Unir filas con saltos de línea CRLF (estándar para CSV)
    const csvContent = csvRows.join('\r\n');

    // Crear blob con BOM para que Excel reconozca correctamente los caracteres especiales
    const BOM = '\uFEFF'; // Marca de orden de bytes (BOM) para UTF-8
    const csvBlob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    this.saveAsFile(csvBlob, `${fileName}.csv`, 'text/csv');
  }

  // Exportar datos a PDF usando solución basada en HTML y el servicio de impresión del navegador
  exportToPDF(data: any[], fileName: string, columns: {header: string, dataKey: string}[]): void {
    try {
      if (!data || data.length === 0) {
        alert('No hay datos para exportar');
        return;
      }

      // Crear un elemento HTML temporal para la impresión
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        alert('El navegador ha bloqueado la ventana emergente. Por favor, permita ventanas emergentes para esta página.');
        return;
      }

      // Estilos para la página de impresión
      const styles = `
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
          }
          h1 {
            color: #2980b9;
            font-size: 24px;
            margin-bottom: 10px;
          }
          .timestamp {
            color: #7f8c8d;
            font-size: 12px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background-color: #2980b9;
            color: white;
            font-weight: bold;
            text-align: left;
            padding: 8px;
          }
          td {
            border: 1px solid #ddd;
            padding: 8px;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          @media print {
            body {
              margin: 0;
              padding: 15px;
            }
            button {
              display: none;
            }
            h1 {
              margin-top: 0;
            }
          }
        </style>
      `;

      // Crear el contenido HTML
      let tableHtml = '<table><thead><tr>';
      
      // Cabeceras de la tabla
      columns.forEach(col => {
        tableHtml += `<th>${col.header}</th>`;
      });
      
      tableHtml += '</tr></thead><tbody>';
      
      // Datos de la tabla
      data.forEach(item => {
        tableHtml += '<tr>';
        columns.forEach(col => {
          let value = item[col.dataKey];
          
          // Formatear el valor según su tipo
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            // Es una fecha ISO
            value = new Date(value).toLocaleDateString('es-ES');
          } else if (typeof value === 'number' && 
                    (col.dataKey.includes('amount') || col.dataKey.includes('revenue'))) {
            // Es un valor monetario
            value = `$${value.toFixed(2)}`;
          }
          
          tableHtml += `<td>${value}</td>`;
        });
        tableHtml += '</tr>';
      });
      
      tableHtml += '</tbody></table>';
      
      // Título del documento formateado
      const title = fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/-/g, ' ');
      
      // Contenido completo del documento
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          ${styles}
          <meta charset="UTF-8">
        </head>
        <body>
          <h1>${title}</h1>
          <div class="timestamp">Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}</div>
          ${tableHtml}
          <button onclick="window.print();return false;">Imprimir</button>
        </body>
        </html>
      `;
      
      // Escribir el contenido en la ventana de impresión
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Permitir que se cargue completamente antes de imprimir
      printWindow.onload = function() {
        // La ventana imprimirá automáticamente en dispositivos móviles
        // En escritorio, el usuario puede hacer clic en el botón "Imprimir"
      };
      
    } catch (error: any) {
      console.error('Error al generar vista para imprimir:', error);
      alert(`Error al generar el PDF: ${error.message || 'Error desconocido'}`);
    }
  }

  // Método para preparar los datos para exportación (traducir y formatear)
  private prepareDataForExport(data: any[]): any[] {
    if (!data || data.length === 0) return [];
    
    return data.map(item => {
      const exportItem: any = {};
      
      // Recorrer todas las propiedades del objeto
      Object.entries(item).forEach(([key, value]) => {
        // Traducir las claves al español
        const translatedKey = this.translateKey(key);
        
        // Formatear valores especiales como fechas o moneda
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          // Es una fecha en formato ISO
          exportItem[translatedKey] = new Date(value).toLocaleDateString('es-ES');
        } else if (typeof value === 'number' && (key.includes('amount') || key.includes('revenue'))) {
          // Es un valor monetario
          exportItem[translatedKey] = `$${(value as number).toFixed(2)}`;
        } else if (typeof value === 'string' && ['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED', 'PAID', 'ISSUED'].includes(value)) {
          // Es un estado
          exportItem[translatedKey] = this.translateStatus(value as string);
        } else {
          exportItem[translatedKey] = value;
        }
      });
      
      return exportItem;
    });
  }

  // Método para traducir claves al español
  private translateKey(key: string): string {
    const translations: { [key: string]: string } = {
      'spaceId': 'ID Espacio',
      'spaceName': 'Nombre Espacio',
      'name': 'Nombre',
      'owner': 'Proveedor',
      'providerName': 'Proveedor',
      'bookingCount': 'Reservas',
      'rentalCount': 'Contratos',
      'revenueGenerated': 'Ingresos',
      'status': 'Estado',
      'bookingId': 'ID Reserva',
      'clientName': 'Cliente',
      'startDate': 'Fecha Inicio',
      'endDate': 'Fecha Fin',
      'durationHours': 'Duración (h)',
      'amount': 'Monto',
      'userId': 'ID Usuario',
      'userName': 'Nombre Usuario',
      'email': 'Correo Electrónico',
      'role': 'Rol',
      'activeContracts': 'Contratos Activos',
      'totalSpaces': 'Espacios',
      'totalRevenue': 'Ingresos Totales',
      'totalBookings': 'Reservas Totales',
      'totalSpending': 'Gastos Totales',
      'registrationDate': 'Fecha Registro',
      'lastLoginDate': 'Último Acceso',
      'contractId': 'ID Contrato',
      'tenantName': 'Inquilino',
      'ownerName': 'Propietario',
      'invoiceId': 'ID Factura',
      'issueDate': 'Fecha Emisión',
      'dueDate': 'Fecha Vencimiento',
      'totalAmount': 'Monto Total',
      'paidAmount': 'Monto Pagado',
      'pendingAmount': 'Monto Pendiente',
      'expiryDate': 'Fecha Vencimiento',
      'daysUntilExpiry': 'Días Restantes',
      'daysOverdue': 'Días Vencidos',
      'overdueAmount': 'Monto Vencido'
    };
    
    return translations[key] || key;
  }
  
  // Método para traducir estados al español
  private translateStatus(status: string): string {
    const translations: { [key: string]: string } = {
      'ACTIVE': 'Activo',
      'INACTIVE': 'Inactivo',
      'COMPLETED': 'Completado',
      'CANCELLED': 'Cancelado',
      'PAID': 'Pagado',
      'ISSUED': 'Emitido'
    };
    
    return translations[status] || status;
  }

  // Método auxiliar para guardar el archivo
  private saveAsFile(buffer: any, fileName: string, fileType: string): void {
    const blob = new Blob([buffer], { type: fileType });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(link.href);
      link.remove();
    }, 100);
  }
} 