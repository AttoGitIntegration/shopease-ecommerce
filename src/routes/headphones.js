const router = require('express').Router();
const { list, search, getById, quickBuy, getOrders, cancelOrder } = require('../controllers/headphonesController');
router.get('/',                    list);
router.get('/search',              search);
router.get('/orders',              getOrders);
router.patch('/orders/:id/cancel', cancelOrder);
router.get('/:id',                 getById);
router.post('/buy',                quickBuy);
module.exports = router;
