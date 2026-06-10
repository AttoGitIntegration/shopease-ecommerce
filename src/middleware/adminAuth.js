const { adminTokens } = require('../controllers/adminAuthController');
module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No admin token provided' });
  if (!adminTokens.has(token)) return res.status(403).json({ error: 'Admin privileges required' });
  const parts = token.split('-');
  req.adminToken = token;
  req.adminId = parseInt(parts[2]);
  next();
};
