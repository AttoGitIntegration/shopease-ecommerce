const crypto = require('crypto');
const { createSession, revokeSession, upsertFederatedUser, users } = require('./authController');

/*
 * Single Sign-On (SSO) via OAuth 2.0 Authorization Code flow + OpenID Connect.
 *
 * Security properties implemented here:
 *   - PKCE (RFC 7636, S256) to protect the code exchange.
 *   - `state` parameter for CSRF protection on the redirect (single-use, expiring).
 *   - `nonce` bound into the ID token to prevent replay.
 *   - ID token validation: issuer, audience, expiry/iat (with clock skew),
 *     nonce, and RS256 signature verification against the IdP JWKS.
 *   - Confidential-client authentication via HTTP Basic (client_secret_basic).
 *   - Opaque, high-entropy, expiring session tokens delivered in an httpOnly,
 *     SameSite cookie (and returned in the body for API clients).
 *   - Optional email-domain allowlist for authorising who may sign in.
 *
 * All IdP coordinates and secrets come from environment variables so nothing
 * sensitive is committed. See .env.example.
 */

const PROVIDER = 'sso';
const STATE_TTL_MS = 10 * 60 * 1000; // authorization request is valid for 10 minutes
const CLOCK_SKEW_SEC = 300; // tolerate 5 minutes of clock drift on token timestamps

const config = {
  clientId: process.env.SSO_CLIENT_ID || '',
  clientSecret: process.env.SSO_CLIENT_SECRET || '',
  redirectUri: process.env.SSO_REDIRECT_URI || 'http://localhost:3000/api/auth/sso/callback',
  issuer: process.env.SSO_ISSUER || '',
  authorizationEndpoint: process.env.SSO_AUTHORIZATION_ENDPOINT || '',
  tokenEndpoint: process.env.SSO_TOKEN_ENDPOINT || '',
  userInfoEndpoint: process.env.SSO_USERINFO_ENDPOINT || '',
  jwksUri: process.env.SSO_JWKS_URI || '',
  scope: process.env.SSO_SCOPE || 'openid profile email',
  // Comma-separated list, e.g. "shopease.com,partner.com". Empty = allow any verified user.
  allowedDomains: (process.env.SSO_ALLOWED_DOMAINS || '')
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean),
  // Where to send the browser after a successful login. If unset, the callback
  // responds with JSON (useful for API clients and tests).
  postLoginRedirect: process.env.SSO_POST_LOGIN_REDIRECT || '',
  // Where to send the browser on failure. If unset, the callback responds with JSON.
  loginPageUrl: process.env.SSO_LOGIN_PAGE_URL || '',
  sessionTtlMs: parseInt(process.env.SSO_SESSION_TTL_MS || '', 10) || 60 * 60 * 1000,
  buttonLabel: process.env.SSO_BUTTON_LABEL || 'Login with SSO',
};

exports.config = config;

// state -> { nonce, codeVerifier, createdAt }
const pendingAuth = new Map();

function isConfigured() {
  return Boolean(
    config.clientId &&
    config.clientSecret &&
    config.authorizationEndpoint &&
    config.tokenEndpoint
  );
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function purgeExpiredStates(now = Date.now()) {
  for (const [state, entry] of pendingAuth) {
    if (now - entry.createdAt > STATE_TTL_MS) pendingAuth.delete(state);
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

// GET /api/auth/sso/config  — public; lets the login page decide whether to
// render the SSO button without exposing any secret.
exports.status = (req, res) => {
  res.json({
    enabled: isConfigured(),
    provider: PROVIDER,
    loginUrl: '/api/auth/sso/login',
    buttonLabel: config.buttonLabel,
  });
};

// GET /api/auth/sso/login — start the flow and redirect to the IdP.
exports.initiate = (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'SSO is not configured' });
  }

  purgeExpiredStates();

  const state = base64url(crypto.randomBytes(32));
  const nonce = base64url(crypto.randomBytes(32));
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());

  pendingAuth.set(state, { nonce, codeVerifier, createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  res.redirect(302, `${config.authorizationEndpoint}?${params.toString()}`);
};

// GET /api/auth/sso/callback — handle the IdP redirect.
exports.callback = async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // The IdP signalled an error (e.g. user denied consent).
  if (error) {
    return fail(res, 401, `Identity provider error: ${error}`, error_description);
  }
  if (!code || !state) {
    return fail(res, 400, 'Missing authorization code or state');
  }

  // Validate and consume the state (single-use, CSRF protection).
  const entry = pendingAuth.get(state);
  pendingAuth.delete(state);
  if (!entry) {
    return fail(res, 400, 'Invalid or expired state');
  }
  if (Date.now() - entry.createdAt > STATE_TTL_MS) {
    return fail(res, 400, 'Authentication request expired, please try again');
  }

  try {
    const tokens = await exchangeCodeForTokens(code, entry.codeVerifier);
    if (!tokens || !tokens.id_token) {
      return fail(res, 401, 'Identity provider did not return an ID token');
    }

    const claims = await validateIdToken(tokens.id_token, entry.nonce);

    // Map IdP claims to a user profile, optionally enriching from /userinfo.
    let { sub, email, name } = extractProfile(claims);
    if (!email && config.userInfoEndpoint && tokens.access_token) {
      const info = await fetchUserInfo(tokens.access_token).catch(() => null);
      if (info) {
        email = email || info.email;
        name = name || info.name;
      }
    }

    // Authorisation: enforce the email-domain allowlist (if configured).
    if (!isAuthorized(email)) {
      return fail(res, 403, 'Your account is not authorized to access this application');
    }

    const { user, created } = upsertFederatedUser({ provider: PROVIDER, sub, email, name });
    const sessionToken = createSession(user, { provider: PROVIDER, ttlMs: config.sessionTtlMs });
    setSessionCookie(res, sessionToken, config.sessionTtlMs);

    // Browser flow: redirect to the app. The session travels in the httpOnly
    // cookie, so the token is never placed in the URL.
    if (config.postLoginRedirect) {
      return res.redirect(302, config.postLoginRedirect);
    }

    return res.json({
      message: 'SSO login successful',
      token: sessionToken,
      userId: user.id,
      provider: PROVIDER,
      isNewUser: created,
      profile: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    // Never leak token-endpoint internals/secrets to the client.
    return fail(res, 502, 'SSO authentication failed', err.message);
  }
};

// GET /api/auth/sso/me — current SSO session identity (auth middleware required).
exports.me = (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, provider: user.provider || 'local' });
};

// POST /api/auth/sso/logout — revoke the session and clear the cookie.
exports.logout = (req, res) => {
  revokeSession(req.token);
  clearSessionCookie(res);
  res.json({ message: 'Logged out successfully' });
};

// ---------------------------------------------------------------------------
// OAuth/OIDC helpers
// ---------------------------------------------------------------------------

async function exchangeCodeForTokens(code, codeVerifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
    client_id: config.clientId,
  });

  const res = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      // Confidential client auth — keep the secret out of the request body.
      Authorization: 'Basic ' +
        Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64'),
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Token endpoint responded ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchUserInfo(accessToken) {
  const res = await fetch(config.userInfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`UserInfo endpoint responded ${res.status}`);
  return res.json();
}

/** Decode a compact JWS into its header and payload (no verification). */
function decodeJwt(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('Malformed ID token');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  return { header, payload, signingInput: `${parts[0]}.${parts[1]}`, signature: parts[2] };
}

/**
 * Validate an ID token end-to-end: RS256 signature against the IdP JWKS (when a
 * JWKS URI is configured) followed by standard OIDC claim checks. Returns the
 * verified claims or throws.
 */
async function validateIdToken(idToken, expectedNonce, now = Date.now()) {
  const { header, payload, signingInput, signature } = decodeJwt(idToken);

  if (config.jwksUri) {
    if (header.alg !== 'RS256') {
      throw new Error(`Unsupported ID token algorithm: ${header.alg}`);
    }
    const publicKey = await getSigningKey(header.kid);
    const ok = crypto.verify(
      'RSA-SHA256',
      Buffer.from(signingInput),
      publicKey,
      Buffer.from(signature, 'base64url')
    );
    if (!ok) throw new Error('ID token signature verification failed');
  }

  verifyClaims(payload, { nonce: expectedNonce, now });
  return payload;
}

/** Pure OIDC claim validation — exported for unit testing. */
function verifyClaims(claims, { nonce, now = Date.now() } = {}) {
  if (config.issuer && claims.iss !== config.issuer) {
    throw new Error('Invalid token issuer');
  }
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(config.clientId)) {
    throw new Error('Invalid token audience');
  }
  const nowSec = Math.floor(now / 1000);
  if (typeof claims.exp === 'number' && claims.exp < nowSec - CLOCK_SKEW_SEC) {
    throw new Error('ID token has expired');
  }
  if (typeof claims.iat === 'number' && claims.iat > nowSec + CLOCK_SKEW_SEC) {
    throw new Error('ID token issued in the future');
  }
  if (nonce && claims.nonce !== nonce) {
    throw new Error('Invalid token nonce');
  }
  if (!claims.sub) {
    throw new Error('ID token missing subject (sub) claim');
  }
  return true;
}

/** Fetch the RSA public key for `kid` from the IdP JWKS and build a KeyObject. */
async function getSigningKey(kid) {
  const res = await fetch(config.jwksUri, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`JWKS endpoint responded ${res.status}`);
  const { keys } = await res.json();
  if (!Array.isArray(keys) || keys.length === 0) throw new Error('JWKS contained no keys');
  const jwk = (kid && keys.find(k => k.kid === kid)) || keys[0];
  if (!jwk) throw new Error(`No matching signing key for kid=${kid}`);
  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

function extractProfile(claims) {
  return {
    sub: claims.sub,
    email: claims.email || null,
    name: claims.name || claims.preferred_username || claims.given_name || null,
  };
}

function isAuthorized(email) {
  if (config.allowedDomains.length === 0) return true; // no allowlist => allow any authenticated user
  if (!email) return false;
  const domain = String(email).split('@')[1]?.toLowerCase();
  return Boolean(domain && config.allowedDomains.includes(domain));
}

// ---------------------------------------------------------------------------
// Cookies & error responses
// ---------------------------------------------------------------------------

function setSessionCookie(res, token, maxAgeMs) {
  res.cookie('sid', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie('sid', { path: '/' });
}

/** Respond to a callback failure — redirect to the login page if configured, else JSON. */
function fail(res, statusCode, message, detail) {
  if (config.loginPageUrl) {
    const sep = config.loginPageUrl.includes('?') ? '&' : '?';
    return res.redirect(302, `${config.loginPageUrl}${sep}error=${encodeURIComponent(message)}`);
  }
  const body = { error: message };
  if (detail) body.detail = String(detail).slice(0, 200);
  return res.status(statusCode).json(body);
}

// Exported for unit tests.
exports.isConfigured = isConfigured;
exports.verifyClaims = verifyClaims;
exports.decodeJwt = decodeJwt;
exports.isAuthorized = isAuthorized;
exports.extractProfile = extractProfile;
exports.base64url = base64url;
