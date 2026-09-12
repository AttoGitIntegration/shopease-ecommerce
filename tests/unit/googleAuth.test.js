const request = require('supertest');
const app = require('../../src/app');

describe('Google SSO API', () => {
  test('GET /login - not configured returns 500', async () => {
    const res = await request(app).get('/api/auth/google/login');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /callback - missing code and state', async () => {
    const res = await request(app).get('/api/auth/google/callback');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Missing code or state');
  });

  test('GET /callback - provider error surfaced', async () => {
    const res = await request(app).get('/api/auth/google/callback').query({ error: 'access_denied' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Google error/);
  });

  test('GET /callback - invalid or expired state rejected', async () => {
    const res = await request(app).get('/api/auth/google/callback').query({ code: 'abc', state: 'unknown-state' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid or expired state');
  });

  test('POST /refresh - requires refreshToken', async () => {
    const res = await request(app).post('/api/auth/google/refresh').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'refreshToken required');
  });
});
