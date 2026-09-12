const https = require('https');
const crypto = require('crypto');
const { URL, URLSearchParams } = require('url');
const { activeTokens } = require('./authController');

const config = {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback',
  scope: process.env.GITHUB_SCOPE || 'read:user user:email',
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  profileUrl: 'https://api.github.com/user',
};

const githubUsers = [];
const pendingStates = new Map();

exports.githubUsers = githubUsers;
exports.config = config;

exports.initiate = (req, res) => {
  if (!config.clientId) {
    return res.status(500).json({ error: 'GitHub client not configured' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, Date.now());
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    state,
    scope: config.scope,
    redirect_uri: config.redirectUri,
  });
  const authorizeUrl = `${config.authorizeUrl}?${params.toString()}`;
  res.json({ authorizeUrl, state });
};

exports.callback = async (req, res) => {
  const { code, state, error: githubError } = req.query;
  if (githubError) return res.status(400).json({ error: `GitHub error: ${githubError}` });
  if (!code || !state) return res.status(400).json({ error: 'Missing code or state' });
  if (!pendingStates.has(state)) return res.status(400).json({ error: 'Invalid or expired state' });
  pendingStates.delete(state);

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    if (!tokenResponse.access_token) {
      return res.status(401).json({ error: 'Failed to obtain access token' });
    }
    const profile = await fetchProfile(tokenResponse.access_token);
    const user = upsertGithubUser(profile, tokenResponse);
    const token = `github-jwt-${user.id}-${Date.now()}`;
    activeTokens.add(token);
    res.json({
      message: 'GitHub login successful',
      token,
      userId: user.id,
      provider: 'github',
      profile: { id: user.githubId, displayName: user.name, email: user.email },
    });
  } catch (err) {
    res.status(502).json({ error: 'GitHub authentication failed', details: err.message });
  }
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  try {
    const tokenResponse = await exchangeRefreshToken(refreshToken);
    if (!tokenResponse.access_token) {
      return res.status(401).json({ error: 'Failed to refresh token' });
    }
    res.json({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
    });
  } catch (err) {
    res.status(502).json({ error: 'GitHub refresh failed', details: err.message });
  }
};

function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  }).toString();
  return postForm(config.tokenUrl, body);
}

function exchangeRefreshToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }).toString();
  return postForm(config.tokenUrl, body);
}

function postForm(urlString, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const req = https.request(
      {
        method: 'POST',
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          Accept: 'application/json',
          'User-Agent': 'shopease-ecommerce',
        },
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Invalid response: ${data}`)); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function fetchProfile(accessToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.profileUrl);
    const req = https.request(
      {
        method: 'GET',
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'shopease-ecommerce',
          Accept: 'application/vnd.github+json',
        },
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Invalid profile response: ${data}`)); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function upsertGithubUser(profile, tokenResponse) {
  const githubId = profile.id;
  const email = profile.email || '';
  const name = profile.name || profile.login || email;
  let user = githubUsers.find((u) => u.githubId === githubId);
  if (!user) {
    user = {
      id: githubUsers.length + 1,
      githubId,
      name,
      email,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      createdAt: new Date().toISOString(),
    };
    githubUsers.push(user);
  } else {
    user.accessToken = tokenResponse.access_token;
    user.refreshToken = tokenResponse.refresh_token;
    user.expiresIn = tokenResponse.expires_in;
  }
  return user;
}
