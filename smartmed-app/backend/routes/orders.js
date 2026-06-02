const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const {
  placeOrder,
  listOrders,
  getOrder,
  cancelOrder,
  uploadPrescription,
} = require('../controllers/orderController');

router.use(requireAuth);

router.post('/', placeOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);
router.post('/:id/cancel', cancelOrder);
router.post('/prescriptions', uploadPrescription);

module.exports = router;
