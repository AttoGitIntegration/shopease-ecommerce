const router = require('express').Router();
const {
  requestExchange,
  listExchanges,
  getExchange,
  approveExchange,
  rejectExchange,
  schedulePickup,
  markPickedUp,
  markReceived,
  inspectItem,
  shipReplacement,
  markDelivered,
  settlePriceDifference,
  completeExchange,
  cancelExchange,
  getExchangeStatus,
  getExchangeHistory
} = require('../controllers/exchangeController');

router.post('/',                 requestExchange);
router.get('/',                  listExchanges);
router.get('/:id/status',        getExchangeStatus);
router.get('/:id/history',       getExchangeHistory);
router.get('/:id',               getExchange);
router.put('/:id/approve',       approveExchange);
router.put('/:id/reject',        rejectExchange);
router.put('/:id/schedule-pickup', schedulePickup);
router.put('/:id/pickup',        markPickedUp);
router.put('/:id/receive',       markReceived);
router.put('/:id/inspect',       inspectItem);
router.put('/:id/ship',          shipReplacement);
router.put('/:id/deliver',       markDelivered);
router.put('/:id/settle',        settlePriceDifference);
router.put('/:id/complete',      completeExchange);
router.put('/:id/cancel',        cancelExchange);

module.exports = router;
