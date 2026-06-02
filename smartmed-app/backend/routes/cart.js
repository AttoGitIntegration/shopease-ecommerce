const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const {
  viewCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');

router.use(requireAuth);

router.get('/', viewCart);
router.post('/items', addToCart);
router.patch('/items/:medicineId', updateCartItem);
router.delete('/items/:medicineId', removeCartItem);
router.delete('/', clearCart);

module.exports = router;
