const request = require('supertest');
const app = require('../../src/app');

describe('Auth API - Register, Login, Logout', () => {
  const user = { name: 'Test User', email: 'testuser@shopease.com', password: 'Pass@123' };
  let token;
  let signupOtp;

  test('POST /register - success', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Registration successful. Please verify your email.');
    expect(res.body.userId).toBeDefined();
    expect(res.body.otp).toBeDefined();
    signupOtp = res.body.otp;
  });

  test('POST /register - duplicate email returns 409', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });

  test('POST /register - missing fields returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('All fields required');
  });

  test('POST /register - invalid email format returns 400', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Bad Email', email: 'not-an-email', password: 'Pass@123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid email format');
  });

  test('POST /register - email without domain returns 400', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Bad Email', email: 'user@', password: 'Pass@123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid email format');
  });

  test('POST /verify-email - wrong OTP returns 400', async () => {
    const res = await request(app).post('/api/auth/verify-email')
      .send({ email: user.email, otp: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid OTP');
  });

  test('POST /verify-email - missing fields returns 400', async () => {
    const res = await request(app).post('/api/auth/verify-email')
      .send({ email: user.email });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('email and otp required');
  });

  test('POST /login - unverified user returns 403', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Email not verified. Please verify your email before logging in.');
  });

  test('POST /verify-email - success', async () => {
    const res = await request(app).post('/api/auth/verify-email')
      .send({ email: user.email, otp: signupOtp });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Email verified successfully');
  });

  test('POST /verify-email - OTP already used returns 400', async () => {
    const res = await request(app).post('/api/auth/verify-email')
      .send({ email: user.email, otp: signupOtp });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No OTP requested for this email');
  });

  test('POST /login - success returns token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.token).toBeDefined();
    expect(res.body.userId).toBeDefined();
    token = res.body.token;
  });

  test('POST /login - wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('POST /login - unknown email returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@shopease.com', password: 'Pass@123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('POST /login - missing email returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Pass@123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('email and password required');
  });

  test('POST /login - missing password returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('email and password required');
  });

  test('GET /me - returns current user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
    expect(res.body.name).toBe(user.name);
    expect(res.body.id).toBeDefined();
  });

  test('GET /me - no token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('POST /logout - success', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });

  test('POST /logout - token invalidated after logout', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  test('POST /logout - no token returns 401', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });
});
