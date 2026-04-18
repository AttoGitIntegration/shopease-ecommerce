const router = require('express').Router();
const { getAll, getById, search, select } = require('../controllers/productController');
router.get('/',             getAll);
router.get('/search',       search);
router.get('/:id',          getById);
router.post('/:id/select',  select);
module.exports = router;
