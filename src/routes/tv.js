const router = require('express').Router();
const { list, search, getById, quickBuy, getOrders } = require('../controllers/tvController');
router.get('/',       list);
router.get('/search', search);
router.get('/orders', getOrders);
router.get('/:id',    getById);
router.post('/buy',   quickBuy);
module.exports = router;
