const { activeTokens, sessions, revokeSession } = require('../controllers/authController');

/** Minimal Cookie header parser (avoids pulling in cookie-parser). */
function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}

module.exports = (req, res, next) => {
  // Accept a bearer token (API clients) or the httpOnly session cookie (browser/SSO).
  const token = req.headers.authorization?.split(' ')[1] || readCookie(req, 'sid');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  if (!activeTokens.has(token)) return res.status(401).json({ error: 'Invalid or expired token' });

  // Managed sessions (e.g. SSO) carry an absolute expiry; enforce and reap it.
  const session = sessions.get(token);
  if (session && session.expiresAt <= Date.now()) {
    revokeSession(token);
    return res.status(401).json({ error: 'Session expired' });
  }

  req.token = token;
  if (session) req.userId = session.userId;
  next();
};
