const router = require('express').Router();
const { getCart, addItem, updateItem, removeItem, clearCart } = require('../controllers/cartController');
router.get('/',          getCart);
router.post('/add',      addItem);
router.put('/update',    updateItem);
router.delete('/remove', removeItem);
router.delete('/clear',  clearCart);
module.exports = router;
