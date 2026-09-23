const { marked } = require('marked');
const fs = require('fs');
const path = require('path');
const HTMLtoDOCX = require('html-to-docx');

const mdPath = path.join(__dirname, '../GUIDE_PRODUCTION.md');
const md = fs.readFileSync(mdPath, 'utf-8');

const styles = `
  body      { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.5; }
  h1        { font-size: 22pt; color: #0f1f3d; border-bottom: 3px solid #1a4f8a; padding-bottom: 6pt; margin-top: 24pt; }
  h2        { font-size: 16pt; color: #1a4f8a; border-bottom: 1px solid #c5d8f0; padding-bottom: 4pt; margin-top: 20pt; page-break-before: always; }
  h3        { font-size: 13pt; color: #1a3a6e; margin-top: 14pt; }
  p         { margin: 6pt 0; text-align: justify; }
  table     { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
  th        { background-color: #1a4f8a; color: white; padding: 6pt 8pt; text-align: left; font-weight: bold; }
  td        { padding: 5pt 8pt; border: 1px solid #cbd5e0; vertical-align: top; }
  tr:nth-child(even) td { background-color: #f0f5ff; }
  code      { font-family: "Courier New", monospace; background: #f1f5f9; padding: 1pt 4pt; font-size: 9pt; color: #1e3a5f; }
  pre       { background: #1e293b; color: #e2e8f0; padding: 10pt; font-size: 9pt; }
  pre code  { background: none; color: #e2e8f0; padding: 0; }
  blockquote { border-left: 4px solid #1a4f8a; margin: 8pt 0; padding: 6pt 12pt; background: #eff6ff; color: #1e40af; font-style: italic; }
  ul, ol    { margin: 6pt 0; padding-left: 20pt; }
  li        { margin: 3pt 0; }
  hr        { border: none; border-top: 2px solid #e2e8f0; margin: 16pt 0; }
`;

const htmlContent = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>${styles}</style></head><body>${marked.parse(md)}</body></html>`;

const headerHTML = `<html><body>
  <table style="width:100%;border-bottom:2px solid #1a4f8a;margin-bottom:6pt;">
    <tr>
      <td style="font-family:Calibri;font-size:9pt;color:#1a4f8a;font-weight:bold;">SysLog — Guide Deploiement Production v1.0.0</td>
      <td style="text-align:right;font-family:Calibri;font-size:9pt;color:#64748b;">ONG Espace Confiance - Gesmalync 2026</td>
    </tr>
  </table>
</body></html>`;

const footerHTML = `<html><body>
  <table style="width:100%;border-top:1px solid #cbd5e0;margin-top:6pt;">
    <tr>
      <td style="font-family:Calibri;font-size:8pt;color:#94a3b8;">Document confidentiel - Gesmalync - Serges Alain GNAZERE</td>
      <td style="text-align:right;font-family:Calibri;font-size:8pt;color:#94a3b8;">Page</td>
    </tr>
  </table>
</body></html>`;

const options = {
  title:      'SysLog - Guide de Deploiement en Production',
  subject:    'Checklist de mise en production - ONG Espace Confiance',
  creator:    'Gesmalync - Serges Alain GNAZERE',
  font:       'Calibri',
  fontSize:   22,
  header:     true,
  footer:     true,
  pageNumber: true,
  margins:    { top: 720, right: 900, bottom: 720, left: 900 },
};

HTMLtoDOCX(htmlContent, headerHTML, options, footerHTML)
  .then(buf => {
    const outPath = path.join(__dirname, '../SysLog_Guide_Deploiement_Production.docx');
    fs.writeFileSync(outPath, buf);
    console.log('Fichier genere :', outPath);
    console.log('Taille :', Math.round(buf.length / 1024), 'Ko');
  })
  .catch(err => {
    console.error('Erreur :', err.message);
    process.exit(1);
  });
