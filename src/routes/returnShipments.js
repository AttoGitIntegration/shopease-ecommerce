const router = require('express').Router();
const {
  initiateReturn,
  listReturns,
  getReturn,
  generateLabel,
  markShipped,
  addTrackingCheckpoint,
  markDelivered,
  markLost,
  inspectReturn,
  issueRefund,
  rejectReturn,
  cancelReturn,
  getReturnStatus,
  getReturnTracking,
  getReturnHistory
} = require('../controllers/returnShipmentController');

router.post('/',                  initiateReturn);
router.get('/',                   listReturns);
router.get('/:id/status',         getReturnStatus);
router.get('/:id/tracking',       getReturnTracking);
router.get('/:id/history',        getReturnHistory);
router.get('/:id',                getReturn);
router.put('/:id/label',          generateLabel);
router.put('/:id/ship',           markShipped);
router.put('/:id/track',          addTrackingCheckpoint);
router.put('/:id/deliver',        markDelivered);
router.put('/:id/lost',           markLost);
router.put('/:id/inspect',        inspectReturn);
router.put('/:id/refund',         issueRefund);
router.put('/:id/reject',         rejectReturn);
router.put('/:id/cancel',         cancelReturn);

module.exports = router;
