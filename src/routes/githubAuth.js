const router = require('express').Router();
const { initiate, callback, refresh } = require('../controllers/githubAuthController');
router.get('/login', initiate);
router.get('/callback', callback);
router.post('/refresh', refresh);
module.exports = router;
