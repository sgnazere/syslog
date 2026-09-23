const router = require('express').Router();
const { downloadManual } = require('../controllers/docs.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Téléchargement du manuel Word — admin uniquement
router.get('/manual', authenticate, authorize('admin', 'manager'), downloadManual);

module.exports = router;
