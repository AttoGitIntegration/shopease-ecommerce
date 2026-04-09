const router = require('express').Router();
const { placeOrder, getOrders, getOrderById, cancelOrder } = require('../controllers/orderController');
router.post('/',          placeOrder);
router.get('/',           getOrders);
router.get('/:id',        getOrderById);
router.put('/:id/cancel', cancelOrder);
module.exports = router;
