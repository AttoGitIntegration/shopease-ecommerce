const router = require('express').Router();
const { register, login, logout, whoAmI } = require('../controllers/adminAuthController');
const adminAuth = require('../middleware/adminAuth');
router.post('/register', register);
router.post('/login',    login);
router.post('/logout',   adminAuth, logout);
router.get('/me',        adminAuth, whoAmI);
module.exports = router;
