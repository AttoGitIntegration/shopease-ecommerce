const router = require('express').Router();
const {
  listMethods,
  createIntent,
  capture,
  verify,
  getPayment,
  listPayments,
  markFailed,
  refund,
  listRefunds
} = require('../controllers/paymentController');

router.get('/methods',          listMethods);
router.get('/',                 listPayments);
router.post('/intent',          createIntent);
router.post('/:id/capture',     capture);
router.post('/:id/fail',        markFailed);
router.post('/:id/refund',      refund);
router.get('/refunds',          listRefunds);
router.get('/:id/verify',       verify);
router.get('/:id',              getPayment);

module.exports = router;
