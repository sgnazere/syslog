import * as XLSX from 'xlsx';

export const exportToXlsx = (data: any[], fileName: string, sheetName?: string, columnWidths?: number[]) => {
  if (!data || data.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(data);
  if (columnWidths) {
    ws['!cols'] = columnWidths.map(w => ({ wch: w }));
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Données');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const exportMultiSheetXlsx = (sheets: { name: string; data: any[]; columnWidths?: number[] }[], fileName: string) => {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data, columnWidths }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    if (columnWidths) {
      ws['!cols'] = columnWidths.map(w => ({ wch: w }));
    }
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};