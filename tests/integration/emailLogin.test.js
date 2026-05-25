const request = require('supertest');
const app = require('../../src/app');

describe('Login with Email OTP', () => {
  const email = 'emailotp@shopease.com';

  beforeAll(async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'OTP User', email, password: 'Pass@123' });
  });

  test('POST /login/email/send-otp - missing email returns 400', async () => {
    const res = await request(app).post('/api/auth/login/email/send-otp').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('email required');
  });

  test('POST /login/email/send-otp - unknown email returns 404', async () => {
    const res = await request(app)
      .post('/api/auth/login/email/send-otp')
      .send({ email: 'ghost@shopease.com' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No account found with this email');
  });

  test('POST /login/email/send-otp - known email returns OTP', async () => {
    const res = await request(app)
      .post('/api/auth/login/email/send-otp')
      .send({ email });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('OTP sent to email');
    expect(res.body.otp).toMatch(/^\d{6}$/);
    expect(res.body.otpExpiresAt).toBeDefined();
  });

  test('POST /login/email/verify-otp - missing fields returns 400', async () => {
    const res = await request(app).post('/api/auth/login/email/verify-otp').send({ email });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('email and otp required');
  });

  test('POST /login/email/verify-otp - wrong OTP returns 400', async () => {
    await request(app).post('/api/auth/login/email/send-otp').send({ email });
    const res = await request(app)
      .post('/api/auth/login/email/verify-otp')
      .send({ email, otp: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid OTP');
  });

  test('POST /login/email/verify-otp - no OTP requested returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login/email/verify-otp')
      .send({ email: 'norecord@shopease.com', otp: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No OTP requested for this email');
  });

  test('POST /login/email/verify-otp - correct OTP returns token', async () => {
    const sendRes = await request(app)
      .post('/api/auth/login/email/send-otp')
      .send({ email });
    const { otp } = sendRes.body;

    const res = await request(app)
      .post('/api/auth/login/email/verify-otp')
      .send({ email, otp });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.token).toBeDefined();
    expect(res.body.userId).toBeDefined();
  });

  test('POST /login/email/verify-otp - OTP consumed after use', async () => {
    const sendRes = await request(app)
      .post('/api/auth/login/email/send-otp')
      .send({ email });
    const { otp } = sendRes.body;

    await request(app).post('/api/auth/login/email/verify-otp').send({ email, otp });

    const res = await request(app)
      .post('/api/auth/login/email/verify-otp')
      .send({ email, otp });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No OTP requested for this email');
  });

  test('Token from email OTP login works for authenticated routes', async () => {
    const sendRes = await request(app)
      .post('/api/auth/login/email/send-otp')
      .send({ email });
    const verifyRes = await request(app)
      .post('/api/auth/login/email/verify-otp')
      .send({ email, otp: sendRes.body.otp });
    const { token } = verifyRes.body;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
