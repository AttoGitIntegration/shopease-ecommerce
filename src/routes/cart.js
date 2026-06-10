const router = require('express').Router();
const { getCart, getItem, addItem, updateItem, removeItem, clearCart } = require('../controllers/cartController');
router.get('/',          getCart);
router.get('/item/:productId', getItem);
router.post('/add',      addItem);
router.put('/update',    updateItem);
router.delete('/remove', removeItem);
router.delete('/clear',  clearCart);
module.exports = router;
