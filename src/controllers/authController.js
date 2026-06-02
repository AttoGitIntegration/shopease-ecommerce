const crypto = require('crypto');

const users = [];
const activeTokens = new Set();

// token -> { userId, provider, createdAt, expiresAt }
// Holds metadata for tokens that participate in managed session expiry (e.g. SSO).
// Legacy password-login tokens intentionally have no session entry and never
// expire, preserving existing behaviour.
const sessions = new Map();

const DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

exports.users = users;
exports.activeTokens = activeTokens;
exports.sessions = sessions;

exports.register = (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' });
  const user = { id: users.length + 1, name, email, password };
  users.push(user);
  res.status(201).json({ message: 'Registration successful', userId: user.id });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = `fake-jwt-${user.id}-${Date.now()}`;
  activeTokens.add(token);
  res.json({ message: 'Login successful', token, userId: user.id });
};

exports.logout = (req, res) => {
  revokeSession(req.token);
  res.json({ message: 'Logged out successfully' });
};

/**
 * Create a managed, expiring session for a user and return an opaque token.
 * The token is a high-entropy random value (not a guessable/derivable string),
 * which is the secure way to mint session tokens for this in-memory store.
 */
function createSession(user, { provider = 'local', ttlMs = DEFAULT_SESSION_TTL_MS } = {}) {
  const token = `${provider}-${crypto.randomBytes(32).toString('hex')}`;
  const now = Date.now();
  activeTokens.add(token);
  sessions.set(token, {
    userId: user.id,
    provider,
    createdAt: now,
    expiresAt: now + ttlMs,
  });
  return token;
}

/** Revoke a token, removing it from both the active set and the session store. */
function revokeSession(token) {
  if (!token) return;
  activeTokens.delete(token);
  sessions.delete(token);
}

/** Resolve the userId a token belongs to, whether it is a managed session
 *  token or a legacy `fake-jwt-{userId}-{timestamp}` password-login token. */
function tokenUserId(token) {
  const session = sessions.get(token);
  if (session) return session.userId;
  if (token.startsWith('fake-jwt-')) {
    const id = parseInt(token.split('-')[2], 10);
    return Number.isInteger(id) ? id : null;
  }
  return null;
}

/**
 * Revoke every active token belonging to a user, immediately invalidating all
 * of their logins (password and managed/SSO sessions alike). Returns the number
 * of tokens revoked.
 */
function revokeUserSessions(userId) {
  let revoked = 0;
  for (const token of [...activeTokens]) {
    if (tokenUserId(token) === userId) {
      revokeSession(token);
      revoked += 1;
    }
  }
  return revoked;
}

/**
 * Revoke all logins for the user account linked to an email address (the link
 * between an employee record and an auth account). Returns the number of tokens
 * revoked; 0 if no account matches the email.
 */
function revokeLoginByEmail(email) {
  if (!email) return 0;
  const normalized = String(email).toLowerCase();
  const user = users.find(u => u.email && u.email.toLowerCase() === normalized);
  if (!user) return 0;
  return revokeUserSessions(user.id);
}

/**
 * Find an existing user by federated identity (provider + subject) or by email,
 * otherwise provision a new federated user. Returns { user, created }.
 * SSO users have no password; they authenticate exclusively via the IdP.
 */
function upsertFederatedUser({ provider, sub, email, name }) {
  const normalizedEmail = email ? String(email).toLowerCase() : null;
  let user = users.find(u =>
    (u.provider === provider && u.providerSub === sub) ||
    (normalizedEmail && u.email && u.email.toLowerCase() === normalizedEmail)
  );

  if (user) {
    // Link the federated identity to a pre-existing (e.g. password) account and
    // refresh mapped attributes from the IdP, the authoritative source.
    user.provider = user.provider || provider;
    user.providerSub = user.providerSub || sub;
    if (name) user.name = name;
    if (!user.email && email) user.email = email;
    return { user, created: false };
  }

  user = {
    id: users.length + 1,
    name: name || email || `sso-user-${sub}`,
    email: email || null,
    password: null,
    provider,
    providerSub: sub,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return { user, created: true };
}

exports.createSession = createSession;
exports.revokeSession = revokeSession;
exports.revokeUserSessions = revokeUserSessions;
exports.revokeLoginByEmail = revokeLoginByEmail;
exports.upsertFederatedUser = upsertFederatedUser;
