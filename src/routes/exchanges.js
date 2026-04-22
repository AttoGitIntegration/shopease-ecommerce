const router = require('express').Router();
const {
  requestExchange,
  listExchanges,
  getExchange,
  approveExchange,
  rejectExchange,
  shipReplacement,
  completeExchange,
  cancelExchange,
  getExchangeStatus
} = require('../controllers/exchangeController');

router.post('/',                 requestExchange);
router.get('/',                  listExchanges);
router.get('/:id/status',        getExchangeStatus);
router.get('/:id',               getExchange);
router.put('/:id/approve',       approveExchange);
router.put('/:id/reject',        rejectExchange);
router.put('/:id/ship',          shipReplacement);
router.put('/:id/complete',      completeExchange);
router.put('/:id/cancel',        cancelExchange);

module.exports = router;
