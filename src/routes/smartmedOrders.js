const router = require('express').Router();
const {
  listMedicines, getMedicine,
  requestOtp, login, logout,
  getCart, addToCart, updateCartItem, removeCartItem, clearCart,
  listAddresses, addAddress,
  uploadPrescription, getPrescription,
  placeOrder, listOrders, getOrder, advanceOrder, cancelOrder, returnOrder,
  createSubscription, cancelSubscription,
  getAuditLog
} = require('../controllers/smartmedOrderController');

router.get('/medicines',                listMedicines);
router.get('/medicines/:id',            getMedicine);

router.post('/auth/otp',                requestOtp);
router.post('/auth/login',              login);
router.post('/auth/logout',             logout);

router.get('/cart',                     getCart);
router.post('/cart/items',              addToCart);
router.put('/cart/items/:medicineId',   updateCartItem);
router.delete('/cart/items/:medicineId',removeCartItem);
router.delete('/cart',                  clearCart);

router.get('/addresses',                listAddresses);
router.post('/addresses',               addAddress);

router.post('/prescriptions',           uploadPrescription);
router.get('/prescriptions/:id',        getPrescription);

router.post('/orders',                  placeOrder);
router.get('/orders',                   listOrders);
router.get('/orders/:id',               getOrder);
router.post('/orders/:id/advance',      advanceOrder);
router.put('/orders/:id/cancel',        cancelOrder);
router.put('/orders/:id/return',        returnOrder);

router.post('/subscriptions',           createSubscription);
router.put('/subscriptions/:id/cancel', cancelSubscription);

router.get('/audit-log',                getAuditLog);

module.exports = router;
