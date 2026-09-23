const router  = require('express').Router();
const c       = require('../controllers/maintenance.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { auditLog } = require('../middlewares/audit.middleware');

const managerPlus = [authenticate, authorize('manager', 'admin')];

router.get('/',              ...managerPlus, c.getAll);
router.post('/',             ...managerPlus, auditLog('CREATE', 'maintenance'), c.create);
router.put('/:id',           ...managerPlus, auditLog('UPDATE', 'maintenance'), c.update);
router.patch('/:id/close',   ...managerPlus, auditLog('CLOSE',  'maintenance'), c.close);
router.delete('/:id',        authenticate, authorize('admin'), auditLog('DELETE', 'maintenance'), c.remove);

module.exports = router;
