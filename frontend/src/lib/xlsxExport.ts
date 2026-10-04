import * as XLSX from 'xlsx';

/**
 * Neutralise les valeurs qu'un tableur pourrait interpréter comme une formule
 * (= + - @ tabulation, retour chariot) : elles sont préfixées d'une apostrophe
 * et restent du texte, même si la cellule est modifiée ou le fichier converti en CSV.
 * Les nombres ne sont pas concernés.
 */
const FORMULA_START = /^[=+\-@\t\r]/;
export const safeCell = (value: unknown) =>
  typeof value === 'string' && FORMULA_START.test(value) ? `'${value}` : value;

const sanitize = (rows: any[]) =>
  rows.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, safeCell(v)])));

export const exportToXlsx = (data: any[], fileName: string, sheetName?: string, columnWidths?: number[]) => {
  if (!data || data.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(sanitize(data));
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
    const ws = XLSX.utils.json_to_sheet(sanitize(data));
    if (columnWidths) {
      ws['!cols'] = columnWidths.map(w => ({ wch: w }));
    }
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
