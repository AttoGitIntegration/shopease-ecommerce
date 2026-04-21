const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const {
  initiate, getSession, setShipping, applyDiscount, setTaxExempt,
  setPayment, confirm, cancel, listOrders, getOrder,
} = require('../controllers/adminCheckoutController');

router.use(adminAuth);
router.post('/initiate',    initiate);
router.get('/',             getSession);
router.post('/shipping',    setShipping);
router.post('/discount',    applyDiscount);
router.post('/tax-exempt',  setTaxExempt);
router.post('/payment',     setPayment);
router.post('/confirm',     confirm);
router.delete('/',          cancel);
router.get('/orders',       listOrders);
router.get('/orders/:id',   getOrder);
module.exports = router;
