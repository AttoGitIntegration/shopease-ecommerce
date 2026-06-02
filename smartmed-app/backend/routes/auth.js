const router = require('express').Router();
const { register, login, addAddress, getProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getProfile);
router.post('/addresses', requireAuth, addAddress);

module.exports = router;
