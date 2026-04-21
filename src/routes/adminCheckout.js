const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const c = require('../controllers/adminCheckoutController');

router.use(adminAuth);

router.post('/initiate',    c.initiate);
router.get('/',             c.getSession);
router.post('/shipping',    c.setShipping);
router.post('/discount',    c.applyDiscount);
router.post('/tax-exempt',  c.setTaxExempt);
router.post('/payment',     c.setPayment);
router.post('/confirm',     c.confirm);
router.delete('/',          c.cancel);

router.post('/items',                    c.addItem);
router.patch('/items/:productId',        c.updateItem);
router.delete('/items/:productId',       c.removeItem);

router.post('/hold',                     c.holdSession);
router.get('/drafts',                    c.listDrafts);
router.post('/drafts/:id/resume',        c.resumeDraft);
router.delete('/drafts/:id',             c.deleteDraft);

router.get('/orders',                    c.listOrders);
router.get('/orders/:id',                c.getOrder);
router.post('/orders/:id/ship',          c.shipOrder);
router.post('/orders/:id/deliver',       c.deliverOrder);
router.post('/orders/:id/cancel',        c.cancelOrder);
router.post('/orders/:id/refund',        c.refundOrder);

router.post('/quotes',                   c.createQuote);
router.get('/quotes',                    c.listQuotes);
router.get('/quotes/:id',                c.getQuote);
router.post('/quotes/:id/convert',       c.convertQuote);
router.delete('/quotes/:id',             c.deleteQuote);

router.get('/reports/summary',           c.summary);

module.exports = router;
