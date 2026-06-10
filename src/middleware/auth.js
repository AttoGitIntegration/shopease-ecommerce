const { activeTokens } = require('../controllers/authController');
module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  if (!activeTokens.has(token)) return res.status(401).json({ error: 'Invalid or expired token' });
  req.token = token;
  next();
};
