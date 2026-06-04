const request = require('supertest');
const app = require('../../src/app');
describe('Auth API', () => {
  test('POST /register - success', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@shopease.com', password: 'Pass@123' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId');
    expect(res.body).toHaveProperty('otp');
  });
  test('POST /register - invalid email format returns 400', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Bad', email: 'invalidemail', password: 'Pass@123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid email format');
  });
  test('POST /register - duplicate email', async () => {
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'dup@shopease.com', password: '123' });
    const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'dup@shopease.com', password: '123' });
    expect(res.status).toBe(409);
  });
  test('POST /login - invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
  test('POST /login - unverified user blocked', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Unverified', email: 'unverified@shopease.com', password: 'Pass@123' });
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'unverified@shopease.com', password: 'Pass@123' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Email not verified/);
  });
  test('POST /logout - requires token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
  test('POST /logout - success after login', async () => {
    const reg = await request(app).post('/api/auth/register')
      .send({ name: 'Out User', email: 'out@shopease.com', password: 'Pass@123' });
    await request(app).post('/api/auth/verify-email')
      .send({ email: 'out@shopease.com', otp: reg.body.otp });
    const login = await request(app).post('/api/auth/login')
      .send({ email: 'out@shopease.com', password: 'Pass@123' });
    const token = login.body.token;
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Logged out successfully');
  });
  test('POST /logout - revoked token rejected', async () => {
    const reg = await request(app).post('/api/auth/register')
      .send({ name: 'Twice User', email: 'twice@shopease.com', password: 'Pass@123' });
    await request(app).post('/api/auth/verify-email')
      .send({ email: 'twice@shopease.com', otp: reg.body.otp });
    const login = await request(app).post('/api/auth/login')
      .send({ email: 'twice@shopease.com', password: 'Pass@123' });
    const token = login.body.token;
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
