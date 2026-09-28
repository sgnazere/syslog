const { buildUserGuideDocx, DOCX_NAME } = require('../services/userGuide.service');

/**
 * GET /api/docs/manual
 * Génère et retourne le guide utilisateur au format Word (.docx).
 */
const downloadManual = async (req, res, next) => {
  try {
    const docx = await buildUserGuideDocx();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${DOCX_NAME}"`);
    res.setHeader('Content-Length', docx.length);
    res.send(docx);
  } catch (err) {
    next(err);
  }
};

module.exports = { downloadManual };
