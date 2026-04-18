const router = require('express').Router();
const { placeOrder, getOrders, getOrderById, cancelOrder, returnOrder } = require('../controllers/orderController');
router.post('/',          placeOrder);
router.get('/',           getOrders);
router.get('/:id',        getOrderById);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/return', returnOrder);
module.exports = router;
