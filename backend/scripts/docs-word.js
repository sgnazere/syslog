/**
 * Génère docs/SysLog_Documentation_Utilisateur.docx à partir du guide Markdown et de ses captures.
 * À relancer après toute modification de docs/DOCUMENTATION_UTILISATEUR.md ou de docs/images/.
 *
 * Usage : npm run docs:word
 */
const fs   = require('fs');
const path = require('path');
const { buildUserGuideDocx, DOCS_DIR, DOCX_NAME } = require('../src/services/userGuide.service');

(async () => {
  try {
    const docx = await buildUserGuideDocx();
    const out  = path.join(DOCS_DIR, DOCX_NAME);
    fs.writeFileSync(out, docx);
    console.log(`Document généré : ${out} (${Math.round(docx.length / 1024)} Ko)`);
  } catch (err) {
    console.error('❌', err.code === 'EBUSY' || err.code === 'EPERM'
      ? `Le fichier ${DOCX_NAME} est ouvert (Word ?) : fermez-le puis relancez la commande.`
      : err.message);
    process.exitCode = 1;
  }
})();
