const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const { create, list, getById, terminate, updateStatus } = require('../controllers/employeeController');

router.post('/',                  adminAuth, create);
router.get('/',                   adminAuth, list);
router.get('/:id',                adminAuth, getById);
router.patch('/:id/terminate',    adminAuth, terminate);
router.patch('/:id/status',       adminAuth, updateStatus);

module.exports = router;
