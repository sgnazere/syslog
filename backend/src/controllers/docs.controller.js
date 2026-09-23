const path       = require('path');
const fs         = require('fs');
const { marked } = require('marked');
const HTMLtoDOCX = require('html-to-docx');

// Chemin vers le manuel Markdown (à la racine du projet Syslog)
// __dirname = backend/src/controllers → remonter 3 niveaux
const MANUAL_PATH = path.join(__dirname, '../../../MANUEL_UTILISATEUR.md');

/**
 * GET /api/docs/manual
 * Génère et retourne le manuel utilisateur au format Word (.docx)
 */
const downloadManual = async (req, res, next) => {
  try {
    // ── Lire le fichier Markdown ──────────────────────────────
    if (!fs.existsSync(MANUAL_PATH)) {
      return res.status(404).json({ error: 'Manuel introuvable sur le serveur.' });
    }
    const markdown = fs.readFileSync(MANUAL_PATH, 'utf-8');

    // ── Convertir Markdown → HTML ──────────────────────────────
    const htmlBody = marked.parse(markdown);

    // HTML complet avec styles inline pour le DOCX
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body      { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.5; }
    h1        { font-size: 22pt; color: #0f1f3d; border-bottom: 3px solid #1a4f8a; padding-bottom: 6pt; margin-top: 24pt; }
    h2        { font-size: 16pt; color: #1a4f8a; border-bottom: 1px solid #c5d8f0; padding-bottom: 4pt; margin-top: 20pt; page-break-before: always; }
    h2:first-of-type { page-break-before: avoid; }
    h3        { font-size: 13pt; color: #1a3a6e; margin-top: 14pt; }
    h4        { font-size: 11pt; color: #2c5282; font-weight: bold; margin-top: 10pt; }
    p         { margin: 6pt 0; text-align: justify; }
    table     { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
    th        { background-color: #1a4f8a; color: white; padding: 6pt 8pt; text-align: left; font-weight: bold; }
    td        { padding: 5pt 8pt; border: 1px solid #cbd5e0; vertical-align: top; }
    tr:nth-child(even) td { background-color: #f0f5ff; }
    code      { font-family: "Courier New", monospace; background: #f1f5f9; padding: 1pt 4pt; border-radius: 2pt; font-size: 10pt; color: #1e3a5f; }
    pre       { background: #1e293b; color: #e2e8f0; padding: 10pt; border-radius: 4pt; font-size: 9pt; overflow-x: auto; }
    pre code  { background: none; color: #e2e8f0; padding: 0; }
    blockquote { border-left: 4px solid #1a4f8a; margin: 8pt 0; padding: 6pt 12pt; background: #eff6ff; color: #1e40af; font-style: italic; }
    ul, ol    { margin: 6pt 0; padding-left: 20pt; }
    li        { margin: 3pt 0; }
    strong    { color: #1a2744; }
    hr        { border: none; border-top: 2px solid #e2e8f0; margin: 16pt 0; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;

    // ── En-tête du document Word ───────────────────────────────
    const headerHTML = `
<html><body>
  <table style="width:100%; border-bottom: 2px solid #1a4f8a; margin-bottom: 6pt;">
    <tr>
      <td style="font-family:Calibri; font-size:9pt; color:#1a4f8a; font-weight:bold;">
        SysLog — Manuel Utilisateur v1.0.0
      </td>
      <td style="text-align:right; font-family:Calibri; font-size:9pt; color:#64748b;">
        ONG Espace Confiance · Gesmalync © 2026
      </td>
    </tr>
  </table>
</body></html>`;

    // ── Pied de page du document Word ─────────────────────────
    const footerHTML = `
<html><body>
  <table style="width:100%; border-top: 1px solid #cbd5e0; margin-top: 6pt;">
    <tr>
      <td style="font-family:Calibri; font-size:8pt; color:#94a3b8;">
        Document confidentiel — Gesmalync · Serges Alain GNAZERE
      </td>
      <td style="text-align:right; font-family:Calibri; font-size:8pt; color:#94a3b8;">
        Page
      </td>
    </tr>
  </table>
</body></html>`;

    // ── Options de génération DOCX ─────────────────────────────
    const options = {
      title:       'Manuel Utilisateur SysLog v1.0.0',
      subject:     'Documentation officielle SysLog — ONG Espace Confiance',
      creator:     'Gesmalync — Serges Alain GNAZERE',
      description: 'Manuel utilisateur complet du système de gestion logistique SysLog',
      keywords:    ['SysLog', 'manuel', 'logistique', 'Espace Confiance', 'Gesmalync'],
      lastModifiedBy: 'Gesmalync',
      table: { row: { cantSplit: true } },
      header:      true,
      footer:      true,
      pageNumber:  true,
      font:        'Calibri',
      fontSize:    22,       // en demi-points → 11pt
      margins: {
        top:    720,   // 1.27 cm
        right:  900,   // 1.59 cm
        bottom: 720,
        left:   900,
      },
    };

    // ── Générer le buffer DOCX ─────────────────────────────────
    const docxBuffer = await HTMLtoDOCX(htmlContent, headerHTML, options, footerHTML);

    // ── Envoyer en téléchargement ──────────────────────────────
    const filename = `SysLog_Manuel_Utilisateur_v1.0.0.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);
    res.send(docxBuffer);

  } catch (err) {
    console.error('[docs] Erreur génération DOCX:', err.message);
    next(err);
  }
};

module.exports = { downloadManual };
