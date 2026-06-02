const router = require('express').Router();
const auth = require('../middleware/auth');
const { status, initiate, callback, me, logout } = require('../controllers/ssoController');

router.get('/config', status);     // is SSO enabled? (public, used by the login page)
router.get('/login', initiate);    // begin flow -> redirect to IdP
router.get('/callback', callback); // IdP redirect target
router.get('/me', auth, me);       // current SSO session identity
router.post('/logout', auth, logout);

module.exports = router;
