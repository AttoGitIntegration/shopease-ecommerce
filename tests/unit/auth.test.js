const request = require('supertest');
const app = require('../../src/app');
describe('Auth API', () => {
  test('POST /register - success', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@shopease.com', password: 'Pass@123' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId');
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
  test('POST /logout - success', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});
