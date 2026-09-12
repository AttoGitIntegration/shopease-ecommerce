const https = require('https');
const crypto = require('crypto');
const { URL, URLSearchParams } = require('url');
const { activeTokens } = require('./authController');

const config = {
  clientId: process.env.AZURE_DEVOPS_CLIENT_ID || '',
  clientSecret: process.env.AZURE_DEVOPS_CLIENT_SECRET || '',
  redirectUri: process.env.AZURE_DEVOPS_REDIRECT_URI || 'http://localhost:3000/api/auth/azure-devops/callback',
  scope: process.env.AZURE_DEVOPS_SCOPE || 'vso.profile vso.identity',
  authorizeUrl: 'https://app.vssps.visualstudio.com/oauth2/authorize',
  tokenUrl: 'https://app.vssps.visualstudio.com/oauth2/token',
  profileUrl: 'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.0',
};

const azureUsers = [];
const pendingStates = new Map();

exports.azureUsers = azureUsers;
exports.config = config;

exports.initiate = (req, res) => {
  if (!config.clientId) {
    return res.status(500).json({ error: 'Azure DevOps client not configured' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, Date.now());
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'Assertion',
    state,
    scope: config.scope,
    redirect_uri: config.redirectUri,
  });
  const authorizeUrl = `${config.authorizeUrl}?${params.toString()}`;
  res.json({ authorizeUrl, state });
};

exports.callback = async (req, res) => {
  const { code, state, error: azureError } = req.query;
  if (azureError) return res.status(400).json({ error: `Azure DevOps error: ${azureError}` });
  if (!code || !state) return res.status(400).json({ error: 'Missing code or state' });
  if (!pendingStates.has(state)) return res.status(400).json({ error: 'Invalid or expired state' });
  pendingStates.delete(state);

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    if (!tokenResponse.access_token) {
      return res.status(401).json({ error: 'Failed to obtain access token' });
    }
    const profile = await fetchProfile(tokenResponse.access_token);
    const user = upsertAzureUser(profile, tokenResponse);
    const token = `azure-jwt-${user.id}-${Date.now()}`;
    activeTokens.add(token);
    res.json({
      message: 'Azure DevOps login successful',
      token,
      userId: user.id,
      provider: 'azure-devops',
      profile: { id: user.azureId, displayName: user.name, email: user.email },
    });
  } catch (err) {
    res.status(502).json({ error: 'Azure DevOps authentication failed', details: err.message });
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
    res.status(502).json({ error: 'Azure DevOps refresh failed', details: err.message });
  }
};

function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: config.clientSecret,
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: code,
    redirect_uri: config.redirectUri,
  }).toString();
  return postForm(config.tokenUrl, body);
}

function exchangeRefreshToken(refreshToken) {
  const body = new URLSearchParams({
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: config.clientSecret,
    grant_type: 'refresh_token',
    assertion: refreshToken,
    redirect_uri: config.redirectUri,
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
        headers: { Authorization: `Bearer ${accessToken}` },
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

function upsertAzureUser(profile, tokenResponse) {
  const azureId = profile.id || profile.publicAlias;
  const email = profile.emailAddress || profile.email || '';
  const name = profile.displayName || profile.coreAttributes?.DisplayName?.value || email;
  let user = azureUsers.find((u) => u.azureId === azureId);
  if (!user) {
    user = {
      id: azureUsers.length + 1,
      azureId,
      name,
      email,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      createdAt: new Date().toISOString(),
    };
    azureUsers.push(user);
  } else {
    user.accessToken = tokenResponse.access_token;
    user.refreshToken = tokenResponse.refresh_token;
    user.expiresIn = tokenResponse.expires_in;
  }
  return user;
}
