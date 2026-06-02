const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const { create, list, getById } = require('../controllers/employeeController');

router.post('/',    adminAuth, create);
router.get('/',     adminAuth, list);
router.get('/:id',  adminAuth, getById);

module.exports = router;
