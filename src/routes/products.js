const router = require('express').Router();
const { getAll, getById, search } = require('../controllers/productController');
router.get('/',       getAll);
router.get('/search', search);
router.get('/:id',    getById);
module.exports = router;
