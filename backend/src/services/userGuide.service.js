/**
 * Génération du guide utilisateur au format Word (.docx)
 * à partir de docs/DOCUMENTATION_UTILISATEUR.md et des captures de docs/images/.
 * Utilisé par GET /api/docs/manual et par le script « npm run docs:word ».
 */
const path       = require('path');
const fs         = require('fs');
const { marked } = require('marked');
const HTMLtoDOCX = require('html-to-docx');

const DOCS_DIR    = path.join(__dirname, '../../../docs');
const MANUAL_PATH = path.join(DOCS_DIR, 'DOCUMENTATION_UTILISATEUR.md');
const DOCX_NAME   = 'SysLog_Documentation_Utilisateur.docx';

// Largeur maximale d'une capture dans la page (pixels ; ≈ largeur utile A4)
const MAX_IMAGE_WIDTH = 600;

/** Dimensions d'une image JPEG (lecture de l'en-tête SOF). */
const jpegSize = (buf) => {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
};

/** Balise <img> encodée en base64, redimensionnée à la largeur de la page. */
const imageTag = (src, alt, maxWidth) => {
  const file = path.resolve(DOCS_DIR, decodeURIComponent(src));
  if (!file.startsWith(path.join(DOCS_DIR, 'images')) || !/\.jpe?g$/i.test(file) || !fs.existsSync(file)) return '';
  const buf  = fs.readFileSync(file);
  const size = jpegSize(buf) || { width: MAX_IMAGE_WIDTH, height: Math.round(MAX_IMAGE_WIDTH * 0.625) };
  const width  = Math.min(maxWidth, size.width);
  const height = Math.round(size.height * width / size.width);
  // La taille doit être passée en style : les attributs width/height sont ignorés par html-to-docx
  return `<img src="data:image/jpeg;base64,${buf.toString('base64')}" style="width:${width}px;height:${height}px" alt="${alt}">`;
};

/**
 * Remplace les captures par leur contenu encodé et ajoute une légende.
 * Les captures « téléphone » (portrait, placées dans un tableau) sont plus petites.
 */
const embedImages = (html) => html.replace(/<img\s+[^>]*src="([^"]+)"[^>]*>/g, (tag, src) => {
  const alt = (tag.match(/alt="([^"]*)"/) || [])[1] || '';
  const portrait = /mobile/.test(src);
  const img = imageTag(src, alt, portrait ? 230 : MAX_IMAGE_WIDTH);
  if (!img) return '';
  return portrait ? img
    : `${img}</p><p style="text-align: center; font-size: 9pt; color: #64748b; font-style: italic;">Figure — ${alt}`;
});

/** Chaque grande partie (titre de niveau 1) commence sur une nouvelle page. */
const pageBreaks = (html) =>
  html.replace(/<h1>/g, '<div class="page-break" style="page-break-after: always;"></div><h1>');

/** Paragraphes vides (les marges verticales CSS ne sont pas reprises par Word). */
const spacer = (n) => '<p>&nbsp;</p>'.repeat(n);

const coverPage = () => {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `
  ${spacer(5)}
  <p style="text-align: center; font-size: 36pt; font-weight: bold; color: #0f1f3d;">SysLog</p>
  <p style="text-align: center; font-size: 16pt; color: #1a4f8a;">Système de gestion logistique</p>
  ${spacer(2)}
  <p style="text-align: center; font-size: 22pt; font-weight: bold; color: #1a2744;">Guide de l'utilisateur</p>
  <p style="text-align: center; font-size: 12pt; color: #475569;">Formation par type d'utilisateur : utilisateur, manager, administrateur, super-administrateur</p>
  ${spacer(4)}
  <p style="text-align: center; font-size: 12pt; color: #1a2744;">ONG Espace Confiance</p>
  <p style="text-align: center; font-size: 10pt; color: #64748b;">Édition du ${date}</p>
  ${spacer(4)}
  <p style="text-align: center; font-size: 9pt; color: #94a3b8;">Gesmalync © 2026 — Les captures d'écran utilisent des données fictives de démonstration.</p>
  <div class="page-break" style="page-break-after: always;"></div>`;
};

const STYLES = `
  body      { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.4; }
  h1        { font-size: 20pt; color: #0f1f3d; margin-top: 12pt; }
  h2        { font-size: 15pt; color: #1a4f8a; margin-top: 18pt; }
  h3        { font-size: 12pt; color: #1a3a6e; margin-top: 12pt; }
  p         { margin: 5pt 0; }
  table     { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 10pt; }
  th        { background-color: #1a4f8a; color: #ffffff; padding: 5pt 7pt; text-align: left; font-weight: bold; }
  td        { padding: 4pt 7pt; border: 1px solid #cbd5e0; vertical-align: top; }
  code      { font-family: "Courier New", monospace; font-size: 10pt; color: #1e3a5f; }
  blockquote { margin: 8pt 0; padding: 6pt 12pt; background: #eff6ff; color: #1e40af; }
  ul, ol    { margin: 5pt 0; padding-left: 20pt; }
  li        { margin: 2pt 0; }
`;

const HEADER = `
<html><body>
  <table style="width:100%; border-bottom: 2px solid #1a4f8a;">
    <tr>
      <td style="font-family:Calibri; font-size:9pt; color:#1a4f8a; font-weight:bold; border:none;">SysLog — Guide de l'utilisateur</td>
      <td style="text-align:right; font-family:Calibri; font-size:9pt; color:#64748b; border:none;">ONG Espace Confiance</td>
    </tr>
  </table>
</body></html>`;

const FOOTER = `
<html><body>
  <p style="font-family:Calibri; font-size:8pt; color:#94a3b8; text-align:center;">Gesmalync © 2026 — Document interne</p>
</body></html>`;

/** HTML complet du guide (page de garde, captures intégrées). */
const buildUserGuideHtml = () => {
  // Le titre principal du Markdown est remplacé par la page de garde
  const markdown = fs.readFileSync(MANUAL_PATH, 'utf-8').replace(/^# SysLog — Documentation utilisateur\s*\n/, '');
  const body = pageBreaks(embedImages(marked.parse(markdown)));
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>${STYLES}</style></head>
<body>${coverPage()}${body}</body></html>`;
};

/** Construit le document Word (Buffer). */
const buildUserGuideDocx = async () => {
  if (!fs.existsSync(MANUAL_PATH)) {
    const err = new Error('Documentation utilisateur introuvable sur le serveur.');
    err.status = 404;
    err.expose = true;
    throw err;
  }
  return HTMLtoDOCX(buildUserGuideHtml(), HEADER, {
    title:          "SysLog — Guide de l'utilisateur",
    subject:        'Documentation utilisateur SysLog — ONG Espace Confiance',
    creator:        'Gesmalync',
    lastModifiedBy: 'Gesmalync',
    keywords:       ['SysLog', 'guide', 'utilisateur', 'logistique'],
    table:          { row: { cantSplit: true } },
    header:         true,
    footer:         true,
    pageNumber:     true,
    font:           'Calibri',
    fontSize:       22,      // demi-points → 11 pt
    // Toutes les marges doivent être fournies (en twips) : une valeur absente rend le fichier illisible par Word
    margins:        { top: 1000, right: 1000, bottom: 1000, left: 1000, header: 500, footer: 500, gutter: 0 },
  }, FOOTER);
};

module.exports = { buildUserGuideDocx, buildUserGuideHtml, DOCS_DIR, DOCX_NAME, HEADER, FOOTER };
