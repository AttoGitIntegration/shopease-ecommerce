const router = require('express').Router();
const { placeOrder, getOrders, getOrderById, cancelOrder, getOrdersByUser } = require('../controllers/orderController');
router.post('/',                placeOrder);
router.get('/user/:userId',     getOrdersByUser);
router.get('/',                 getOrders);
router.get('/:id',              getOrderById);
router.put('/:id/cancel',       cancelOrder);
module.exports = router;
