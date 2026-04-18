const router = require('express').Router();
const { list, getById, quickBuy, getOrders } = require('../controllers/headphonesController');
router.get('/',          list);
router.get('/orders',    getOrders);
router.get('/:id',       getById);
router.post('/buy',      quickBuy);
module.exports = router;
