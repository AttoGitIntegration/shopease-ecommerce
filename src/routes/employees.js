const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const { create, list, getById, update, remove } = require('../controllers/employeeController');

router.post('/',      adminAuth, create);
router.get('/',       adminAuth, list);
router.get('/:id',    adminAuth, getById);
router.patch('/:id',  adminAuth, update);
router.delete('/:id', adminAuth, remove);

module.exports = router;
