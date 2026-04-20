const router = require('express').Router();
const { list, getById, cancel } = require('../controllers/mobileController');
router.get('/',            list);
router.get('/:id',         getById);
router.put('/:id/cancel',  cancel);
module.exports = router;
