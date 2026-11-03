const { Router } = require('express');
const controller = require('./reports.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const ROLES = require('../../constants/roles');

// UC016 – Báo cáo thống kê: Thủ thư và Admin (Admin tự động kế thừa quyền Thủ thư)
const router = Router();
router.use(authenticate, authorize(ROLES.LIBRARIAN));

router.get('/loans', controller.loans);
router.get('/overdue', controller.overdue);
router.get('/fines', controller.fines);
router.get('/:type/export', controller.exportFile);

module.exports = router;

