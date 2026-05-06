const request = require('supertest');
const app = require('../../src/app');

describe('Delivery OTP API', () => {
  let orderId;
  let deliveryOtp;

  beforeAll(async () => {
    const res = await request(app).post('/api/orders').send({
      userId: 10,
      items: [{ productId: 2, name: 'Smart TV', price: 35000, quantity: 1 }],
      address: '45 Indiranagar, Bengaluru, KA 560038'
    });
    orderId = res.body.order.id;
  });

  test('PUT /orders/:id/ship - ships order and returns OTP', async () => {
    const res = await request(app).put(`/api/orders/${orderId}/ship`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Order shipped, delivery OTP generated');
    expect(res.body.orderId).toBe(orderId);
    expect(res.body.deliveryOtp).toMatch(/^\d{6}$/);
    expect(res.body.otpExpiresAt).toBeDefined();
    deliveryOtp = res.body.deliveryOtp;
  });

  test('PUT /orders/:id/ship - cannot ship already shipped order', async () => {
    const res = await request(app).put(`/api/orders/${orderId}/ship`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot ship shipped/);
  });

  test('POST /orders/:id/verify-delivery-otp - wrong OTP returns 400', async () => {
    const wrongOtp = deliveryOtp === '000000' ? '111111' : '000000';
    const res = await request(app)
      .post(`/api/orders/${orderId}/verify-delivery-otp`)
      .send({ otp: wrongOtp });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid OTP');
  });

  test('POST /orders/:id/verify-delivery-otp - missing OTP returns 400', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/verify-delivery-otp`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('otp required');
  });

  test('POST /orders/:id/regenerate-delivery-otp - regenerates OTP for shipped order', async () => {
    const res = await request(app).post(`/api/orders/${orderId}/regenerate-delivery-otp`);
    expect(res.status).toBe(200);
    expect(res.body.deliveryOtp).toMatch(/^\d{6}$/);
    deliveryOtp = res.body.deliveryOtp;
  });

  test('POST /orders/:id/verify-delivery-otp - correct OTP marks order delivered', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/verify-delivery-otp`)
      .send({ otp: deliveryOtp });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Delivery verified successfully');
    expect(res.body.order.status).toBe('delivered');
    expect(res.body.order.deliveredAt).toBeDefined();
    expect(res.body.order.deliveryOtpVerified).toBe(true);
    expect(res.body.order.deliveryOtp).toBeNull();
  });

  test('POST /orders/:id/verify-delivery-otp - cannot verify already delivered order', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/verify-delivery-otp`)
      .send({ otp: deliveryOtp });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/delivered/);
  });

  test('PUT /orders/:id/ship - 404 for unknown order', async () => {
    const res = await request(app).put('/api/orders/99999/ship');
    expect(res.status).toBe(404);
  });

  test('POST /orders/:id/verify-delivery-otp - 404 for unknown order', async () => {
    const res = await request(app)
      .post('/api/orders/99999/verify-delivery-otp')
      .send({ otp: '123456' });
    expect(res.status).toBe(404);
  });

  test('POST /orders/:id/regenerate-delivery-otp - 400 for non-shipped order', async () => {
    const newOrder = await request(app).post('/api/orders').send({
      userId: 11,
      items: [{ productId: 3, name: 'Laptop', price: 60000, quantity: 1 }],
      address: 'MG Road, Bengaluru'
    });
    const res = await request(app).post(`/api/orders/${newOrder.body.order.id}/regenerate-delivery-otp`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/shipped/);
  });
});
