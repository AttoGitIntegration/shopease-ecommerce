const request = require('supertest');
const app = require('../../src/app');
describe('Orders API', () => {
  let orderId;
  test('POST /orders - place order', async () => {
    const res = await request(app).post('/api/orders').send({
      userId: 1,
      items: [{ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 }],
      address: '123 MG Road, Bengaluru, KA 560001'
    });
    expect(res.status).toBe(201);
    orderId = res.body.order.id;
  });
  test('GET /orders - list all', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(200);
  });
  test('GET /orders/:id - get by ID', async () => {
    const res = await request(app).get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
  });
  test('PUT /orders/:id/cancel - cancel order within 24 hours', async () => {
    const res = await request(app).put(`/api/orders/${orderId}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('cancelled');
    expect(res.body.order.cancelledAt).toBeDefined();
  });
  test('PUT /orders/:id/cancel - fails after 24-hour cancellation window expires', async () => {
    const newOrder = await request(app).post('/api/orders').send({
      userId: 1,
      items: [{ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 }],
      address: '123 MG Road, Bengaluru, KA 560001'
    });
    const expiredOrderId = newOrder.body.order.id;
    const realDateNow = Date.now.bind(global.Date);
    global.Date.now = jest.fn(() => realDateNow() + 25 * 60 * 60 * 1000);
    try {
      const res = await request(app).put(`/api/orders/${expiredOrderId}/cancel`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/24 hours/);
    } finally {
      global.Date.now = realDateNow;
    }
  });
  test('PUT /orders/:id/cancel - cancellation with reason is stored', async () => {
    const newOrder = await request(app).post('/api/orders').send({
      userId: 1,
      items: [{ productId: 2, name: 'Smart TV', price: 45000, quantity: 1 }],
      address: '456 Park Street, Mumbai'
    });
    const res = await request(app)
      .put(`/api/orders/${newOrder.body.order.id}/cancel`)
      .send({ reason: 'Changed my mind' });
    expect(res.status).toBe(200);
    expect(res.body.order.cancellationReason).toBe('Changed my mind');
  });
  test('GET /orders/user/:userId - get orders by user', async () => {
    await request(app).post('/api/orders').send({
      userId: 42,
      items: [{ productId: 5, name: 'Keyboard', price: 1500, quantity: 2 }],
      address: '7 Brigade Road, Bengaluru, KA 560001'
    });
    const res = await request(app).get('/api/orders/user/42');
    expect(res.status).toBe(200);
    expect(res.body.orders).toBeInstanceOf(Array);
    expect(res.body.orders.length).toBeGreaterThan(0);
    expect(res.body.orders[0].userId).toBe(42);
    expect(typeof res.body.total).toBe('number');
  });
  test('GET /orders/user/:userId - empty array for unknown user', async () => {
    const res = await request(app).get('/api/orders/user/99999');
    expect(res.status).toBe(200);
    expect(res.body.orders).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

describe('Order Return Collection - good condition', () => {
  let returnOrderId;
  let deliveryOtp;
  let pickupOtp;

  test('setup: place, ship, and deliver order', async () => {
    const orderRes = await request(app).post('/api/orders').send({
      userId: 20,
      items: [{ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 }],
      address: '10 Church Street, Bengaluru'
    });
    expect(orderRes.status).toBe(201);
    returnOrderId = orderRes.body.order.id;

    const shipRes = await request(app).put(`/api/orders/${returnOrderId}/ship`);
    expect(shipRes.status).toBe(200);
    deliveryOtp = shipRes.body.deliveryOtp;

    const deliverRes = await request(app)
      .post(`/api/orders/${returnOrderId}/verify-delivery-otp`)
      .send({ otp: deliveryOtp });
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.order.status).toBe('delivered');
  });

  test('PUT /orders/:id/return - customer initiates return', async () => {
    const res = await request(app)
      .put(`/api/orders/${returnOrderId}/return`)
      .send({ reason: 'Product not as described' });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('returned');
    expect(res.body.order.returnReason).toBe('Product not as described');
  });

  test('PUT /orders/:id/approve-return - generates pickup OTP', async () => {
    const res = await request(app)
      .put(`/api/orders/${returnOrderId}/approve-return`)
      .send({ note: 'Approved for collection' });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('return_approved');
    expect(res.body.pickupOtp).toBeDefined();
    expect(res.body.pickupOtp).toMatch(/^\d{6}$/);
    expect(res.body.pickupOtpExpiresAt).toBeDefined();
    pickupOtp = res.body.pickupOtp;
  });

  test('POST /orders/:id/regenerate-pickup-otp - generates fresh OTP', async () => {
    const res = await request(app)
      .post(`/api/orders/${returnOrderId}/regenerate-pickup-otp`);
    expect(res.status).toBe(200);
    expect(res.body.pickupOtp).toBeDefined();
    expect(res.body.pickupOtpExpiresAt).toBeDefined();
    pickupOtp = res.body.pickupOtp;
  });

  test('POST /orders/:id/collect-return - rejects invalid pickup OTP', async () => {
    const res = await request(app)
      .post(`/api/orders/${returnOrderId}/collect-return`)
      .send({ otp: '000000', condition: 'good' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid pickup OTP');
  });

  test('POST /orders/:id/collect-return - rejects missing condition', async () => {
    const res = await request(app)
      .post(`/api/orders/${returnOrderId}/collect-return`)
      .send({ otp: pickupOtp });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('condition required');
  });

  test('POST /orders/:id/collect-return - rejects invalid condition value', async () => {
    const res = await request(app)
      .post(`/api/orders/${returnOrderId}/collect-return`)
      .send({ otp: pickupOtp, condition: 'unknown' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/good.*damaged/);
  });

  test('POST /orders/:id/collect-return - good condition triggers refund', async () => {
    const res = await request(app)
      .post(`/api/orders/${returnOrderId}/collect-return`)
      .send({ otp: pickupOtp, condition: 'good' });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('refunded');
    expect(res.body.order.productCondition).toBe('good');
    expect(res.body.order.refundAmount).toBe(2999);
    expect(res.body.order.refundTransactionId).toMatch(/^RFND-/);
    expect(res.body.order.refundMethod).toBe('original_payment');
    expect(res.body.order.collectedAt).toBeDefined();
    expect(res.body.refundAmount).toBe(2999);
    expect(res.body.refundTransactionId).toMatch(/^RFND-/);
  });

  test('GET /orders/:id/return-status - shows refund and collection details', async () => {
    const res = await request(app).get(`/api/orders/${returnOrderId}/return-status`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('refunded');
    expect(res.body.productCondition).toBe('good');
    expect(res.body.collectedAt).toBeDefined();
    expect(res.body.refundAmount).toBe(2999);
    expect(res.body.refundTransactionId).toMatch(/^RFND-/);
  });
});

describe('Order Return Collection - damaged product', () => {
  let orderId;
  let deliveryOtp;
  let pickupOtp;

  test('setup: place, ship, deliver, return, and approve order', async () => {
    const orderRes = await request(app).post('/api/orders').send({
      userId: 21,
      items: [{ productId: 2, name: 'Smart TV', price: 45000, quantity: 1 }],
      address: '200 Park Street, Mumbai'
    });
    orderId = orderRes.body.order.id;

    const shipRes = await request(app).put(`/api/orders/${orderId}/ship`);
    deliveryOtp = shipRes.body.deliveryOtp;

    await request(app)
      .post(`/api/orders/${orderId}/verify-delivery-otp`)
      .send({ otp: deliveryOtp });

    await request(app)
      .put(`/api/orders/${orderId}/return`)
      .send({ reason: 'Defective screen' });

    const approveRes = await request(app)
      .put(`/api/orders/${orderId}/approve-return`);
    expect(approveRes.status).toBe(200);
    pickupOtp = approveRes.body.pickupOtp;
  });

  test('POST /orders/:id/collect-return - damaged product rejects refund', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/collect-return`)
      .send({ otp: pickupOtp, condition: 'damaged', conditionNotes: 'Screen cracked' });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('return_rejected');
    expect(res.body.order.productCondition).toBe('damaged');
    expect(res.body.order.productConditionNotes).toBe('Screen cracked');
    expect(res.body.order.refundAmount).toBe(0);
    expect(res.body.order.returnRejectionReason).toContain('damaged');
    expect(res.body.order.returnRejectionReason).toContain('Screen cracked');
  });

  test('GET /orders/:id/return-status - shows damage details and zero refund', async () => {
    const res = await request(app).get(`/api/orders/${orderId}/return-status`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('return_rejected');
    expect(res.body.productCondition).toBe('damaged');
    expect(res.body.collectedAt).toBeDefined();
    expect(res.body.refundAmount).toBe(0);
    expect(res.body.rejectionReason).toContain('damaged');
  });
});
