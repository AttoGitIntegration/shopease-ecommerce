const request = require('supertest');
const app = require('../../src/app');
const { config } = require('../../src/controllers/ssoController');

describe('SSO API (OAuth2 / OIDC)', () => {
  describe('when SSO is not configured', () => {
    test('GET /config reports disabled', async () => {
      const res = await request(app).get('/api/auth/sso/config');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ enabled: false, loginUrl: '/api/auth/sso/login' });
      expect(res.body).toHaveProperty('buttonLabel');
    });

    test('GET /login returns 503', async () => {
      const res = await request(app).get('/api/auth/sso/login');
      expect(res.status).toBe(503);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('callback validation', () => {
    test('IdP error param is surfaced as 401', async () => {
      const res = await request(app)
        .get('/api/auth/sso/callback')
        .query({ error: 'access_denied', error_description: 'User denied consent' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/access_denied/);
    });

    test('missing code/state returns 400', async () => {
      const res = await request(app).get('/api/auth/sso/callback');
      expect(res.status).toBe(400);
    });

    test('unknown state returns 400', async () => {
      const res = await request(app)
        .get('/api/auth/sso/callback')
        .query({ code: 'abc', state: 'never-issued-state' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/state/i);
    });
  });

  describe('protected endpoints', () => {
    test('GET /me without a session returns 401', async () => {
      const res = await request(app).get('/api/auth/sso/me');
      expect(res.status).toBe(401);
    });

    test('POST /logout without a session returns 401', async () => {
      const res = await request(app).post('/api/auth/sso/logout');
      expect(res.status).toBe(401);
    });
  });

  describe('when SSO is configured', () => {
    const original = { ...config };
    beforeAll(() => {
      config.clientId = 'test-client';
      config.clientSecret = 'test-secret';
      config.authorizationEndpoint = 'https://idp.example.com/authorize';
      config.tokenEndpoint = 'https://idp.example.com/token';
      config.issuer = 'https://idp.example.com';
    });
    afterAll(() => { Object.assign(config, original); });

    test('GET /config reports enabled', async () => {
      const res = await request(app).get('/api/auth/sso/config');
      expect(res.body.enabled).toBe(true);
    });

    test('GET /login redirects to the IdP with PKCE + state + nonce', async () => {
      const res = await request(app).get('/api/auth/sso/login');
      expect(res.status).toBe(302);
      const location = res.headers.location;
      expect(location).toContain('https://idp.example.com/authorize');
      const url = new URL(location);
      expect(url.searchParams.get('client_id')).toBe('test-client');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
      expect(url.searchParams.get('state')).toBeTruthy();
      expect(url.searchParams.get('nonce')).toBeTruthy();
      expect(url.searchParams.get('scope')).toContain('openid');
    });

    test('each /login produces a unique state (CSRF token entropy)', async () => {
      const a = new URL((await request(app).get('/api/auth/sso/login')).headers.location);
      const b = new URL((await request(app).get('/api/auth/sso/login')).headers.location);
      expect(a.searchParams.get('state')).not.toBe(b.searchParams.get('state'));
    });
  });
});
